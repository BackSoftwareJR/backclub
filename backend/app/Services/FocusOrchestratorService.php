<?php

namespace App\Services;

use App\Enums\CognitiveLoad;
use App\Enums\ConversationRole;
use App\Enums\FocusSessionStatus;
use App\Enums\FocusSlotType;
use App\Enums\FocusTaskStatus;
use App\Models\AssistantConversation;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskAssignment;
use App\Models\FocusAnalysisReport;
use App\Models\FocusDailyCheckin;
use App\Models\FocusSession;
use App\Models\FocusSessionSlot;
use App\Models\FocusTask;
use App\Models\TaskMetric;
use App\Models\User;
use App\Models\UserFocusPreference;
use App\Models\UserWorkPattern;
use App\Models\WorkspaceUserTask;
use App\Services\FocusDataAggregatorService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FocusOrchestratorService
{
    private const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL        = 'llama-3.3-70b-versatile';

    public function __construct(
        private readonly FocusDataAggregatorService $dataAggregator
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    public function getOrCreateTodaySession(User $user): FocusSession
    {
        $today = Carbon::today()->toDateString();

        $session = FocusSession::where('user_id', $user->id)
            ->whereDate('session_date', $today)
            ->with(['slots.task'])
            ->first();

        if ($session) {
            return $session;
        }

        $result = $this->generateDayTimeline($user);

        return FocusSession::with(['slots.task'])
            ->findOrFail($result['session']->id);
    }

    /**
     * @return array{session: FocusSession, slots: FocusSessionSlot[]}
     */
    public function generateDayTimeline(User $user, ?string $userInstruction = null, ?FocusDailyCheckin $checkin = null): array
    {
        $tasks   = $this->getPendingTasks($user, $checkin);
        $pattern = $this->getOrCreateWorkPattern($user);

        // Collect analysis reports context to guide the LLM
        $analysisContext = $this->buildAnalysisContext($user);

        $today = Carbon::today()->toDateString();

        // Find or create today's session
        $session = FocusSession::firstOrCreate(
            ['user_id' => $user->id, 'session_date' => $today],
            [
                'status'     => FocusSessionStatus::Draft,
                'generated_at' => now(),
                'total_estimated_minutes' => 0,
                'completed_tasks_count'   => 0,
            ]
        );

        $checkinContext = $this->buildCheckinContext($checkin);
        $llmData  = $this->callLlmForTimeline($tasks, $pattern, $userInstruction, $user, $analysisContext, $checkinContext, $checkin);
        $slots    = $this->persistSlots($session, $llmData['slots']);
        $totalMin = collect($slots)->where('slot_type', FocusSlotType::Task)->sum('duration_minutes');

        $session->update([
            'status'                  => FocusSessionStatus::Active,
            'llm_prompt_used'         => $llmData['prompt'],
            'llm_response_raw'        => $llmData['raw'],
            'generated_at'            => now(),
            'total_estimated_minutes' => $totalMin,
        ]);

        return ['session' => $session->fresh(['slots.task']), 'slots' => $slots];
    }

    public function regenerateTimeline(User $user, ?string $userInstruction = null): FocusSession
    {
        $today = Carbon::today()->toDateString();

        $session = FocusSession::where('user_id', $user->id)
            ->whereDate('session_date', $today)
            ->first();

        if ($session) {
            // Remove non-completed slots
            FocusSessionSlot::where('focus_session_id', $session->id)
                ->where('is_completed', false)
                ->delete();
        }

        $result = $this->generateDayTimeline($user, $userInstruction);

        return $result['session'];
    }

    public function recordTaskCompletion(
        User      $user,
        FocusTask $task,
        int       $actualMinutes,
        int       $mentalFatigue
    ): TaskMetric {
        $estimated     = $task->estimated_minutes ?? $actualMinutes;
        $accuracyRatio = $estimated > 0 ? round($actualMinutes / $estimated, 2) : 1.0;
        $nowHour       = (int) now()->format('G');
        $dayOfWeek     = (int) now()->format('N');

        $metric = TaskMetric::create([
            'user_id'             => $user->id,
            'focus_task_id'       => $task->id,
            'crm_task_id'         => $task->crm_task_id,
            'title_snapshot'      => $task->title,
            'tags_snapshot'       => $task->tags,
            'cognitive_load'      => $task->cognitive_load,
            'estimated_minutes'   => $estimated,
            'actual_minutes'      => $actualMinutes,
            'mental_fatigue_score' => $mentalFatigue,
            'time_of_day_hour'    => $nowHour,
            'day_of_week'         => $dayOfWeek,
            'accuracy_ratio'      => $accuracyRatio,
        ]);

        $task->update([
            'status'       => FocusTaskStatus::Completed,
            'completed_at' => now(),
        ]);

        $pattern = $this->getOrCreateWorkPattern($user);
        $newTotal = ($pattern->total_tasks_completed ?? 0) + 1;
        $pattern->increment('total_tasks_completed');

        if ($newTotal % 5 === 0) {
            $this->recalculateWorkPatterns($user);
        }

        return $metric;
    }

    public function recalculateWorkPatterns(User $user): UserWorkPattern
    {
        $metrics = TaskMetric::where('user_id', $user->id)
            ->latest()
            ->limit(50)
            ->get();

        if ($metrics->isEmpty()) {
            return $this->getOrCreateWorkPattern($user);
        }

        $avgAccuracy = $metrics->avg('accuracy_ratio') ?? 1.0;

        // Peak hours: group by hour, invert fatigue (low fatigue = high performance), normalise 0-1
        $byHour = $metrics->groupBy('time_of_day_hour');
        $rawPeak = [];
        foreach ($byHour as $hour => $group) {
            $avgFatigue          = $group->avg('mental_fatigue_score') ?? 3;
            $rawPeak[(int)$hour] = max(0, 5 - $avgFatigue); // invert: score 0-5
        }
        $maxScore = max($rawPeak) ?: 1;
        $peakHours = [];
        foreach ($rawPeak as $hour => $score) {
            $peakHours[$hour] = round($score / $maxScore, 2);
        }
        arsort($peakHours);

        // Avg deep-work minutes
        $deepWorkMetrics     = $metrics->filter(fn($m) => $m->cognitive_load === CognitiveLoad::DeepWork);
        $avgDeepWorkMinutes  = $deepWorkMetrics->isNotEmpty()
            ? (int) round($deepWorkMetrics->avg('actual_minutes'))
            : 90;

        // Fatigue threshold: first hour where avg fatigue > 3.5
        $fatigueThreshold = null;
        foreach ($byHour->sortKeys() as $hour => $group) {
            if (($group->avg('mental_fatigue_score') ?? 0) > 3.5) {
                $fatigueThreshold = (int) $hour;
                break;
            }
        }
        $fatigueThreshold ??= 17; // default 5 PM

        $pattern = $this->getOrCreateWorkPattern($user);
        $pattern->update([
            'peak_hours'              => $peakHours,
            'avg_estimation_accuracy' => round($avgAccuracy, 2),
            'avg_deep_work_minutes'   => $avgDeepWorkMinutes,
            'fatigue_threshold_hour'  => $fatigueThreshold,
            'last_recalculated_at'    => now(),
        ]);

        return $pattern->fresh();
    }

    /**
     * @return array{response: string, intent: string, session_updated: bool, suggested_replies: string[], priority_action: array|null}
     */
    public function chatWithAssistant(User $user, string $message, FocusSession $session): array
    {
        AssistantConversation::create([
            'user_id'          => $user->id,
            'focus_session_id' => $session->id,
            'role'             => ConversationRole::User,
            'content'          => $message,
        ]);

        $history = AssistantConversation::where('user_id', $user->id)
            ->where('focus_session_id', $session->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->reverse()
            ->values();

        $tasks = FocusSessionSlot::where('focus_session_id', $session->id)
            ->with('task')
            ->get()
            ->map(fn($slot) => [
                'title'    => $slot->title,
                'type'     => $slot->slot_type?->value,
                'start'    => $slot->start_time,
                'end'      => $slot->end_time,
                'done'     => $slot->is_completed,
            ]);

        $systemPrompt = $this->dataAggregator->buildAssistantSystemPrompt($user);

        // Inject analysis reports as compact context for the chat
        try {
            $reports = FocusAnalysisReport::where('user_id', $user->id)
                ->where('status', 'ready')
                ->whereIn('report_type', ['overview', 'project'])
                ->get();

            $analysisContext = '';
            foreach ($reports as $r) {
                if ($r->content) {
                    $analysisContext .= "\n[{$r->subject_name}]: " . json_encode($r->content, JSON_UNESCAPED_UNICODE) . "\n";
                }
            }

            if ($analysisContext) {
                $systemPrompt .= "\n\n## Report analisi progetti (aggiornati)\n" . substr($analysisContext, 0, 2000);
            }
        } catch (\Exception $e) {
            Log::warning('FocusOrchestrator: could not inject analysis context for chat', ['error' => $e->getMessage()]);
        }

        // Inject priority-action instructions when intent is detected
        $intent = $this->detectIntent($message);
        if ($intent === 'set_priority') {
            $systemPrompt .= <<<'PROMPT'


## Istruzione speciale — set_priority
Se l'utente vuole impostare la priorità di una task, rispondi con un JSON nel corpo del messaggio nel seguente formato (oltre alla conferma testuale):
```json
{"action":"set_priority","task_title":"TITOLO ESATTO","priority":"high|medium|low"}
```
Usa i titoli reali delle task dal contesto. Esempio: se l'utente dice "metti come priorità alta Inserire Google Analytics" rispondi:
```json
{"action":"set_priority","task_title":"Inserire Google Analytics","priority":"high"}
```
PROMPT;
        }

        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        foreach ($history as $conv) {
            $messages[] = [
                'role'    => $conv->role->value,
                'content' => $conv->content,
            ];
        }

        $apiKey = config('services.groq.api_key');
        $llmResponse = null;
        $sessionUpdated = false;
        $priorityAction = null;

        if ($apiKey) {
            try {
                $response = Http::timeout(30)
                    ->withHeaders([
                        'Authorization' => "Bearer {$apiKey}",
                        'Content-Type'  => 'application/json',
                    ])
                    ->post(self::GROQ_API_URL, [
                        'model'       => self::MODEL,
                        'messages'    => $messages,
                        'temperature' => 0.7,
                        'max_tokens'  => 512,
                    ]);

                if ($response->successful()) {
                    $llmResponse = $response->json('choices.0.message.content');
                } else {
                    Log::warning('FocusOrchestrator chat LLM error', ['status' => $response->status()]);
                }
            } catch (\Exception $e) {
                Log::error('FocusOrchestrator chat exception', ['message' => $e->getMessage()]);
            }
        }

        $llmResponse ??= 'Mi dispiace, non riesco a rispondere in questo momento. Riprova tra poco.';

        // Extract structured priority action if present in response
        if ($intent === 'set_priority' && preg_match('/```json\s*(\{.*?"action"\s*:\s*"set_priority".*?\})\s*```/s', $llmResponse, $matches)) {
            $decoded = json_decode($matches[1], true);
            if (json_last_error() === JSON_ERROR_NONE && !empty($decoded['task_title'])) {
                $priorityAction = $decoded;

                // Apply the priority update automatically
                $priorityMap = ['high' => 100, 'medium' => 50, 'low' => 20];
                $score = $priorityMap[$decoded['priority'] ?? 'medium'] ?? 50;

                $focusTask = FocusTask::where('user_id', $user->id)
                    ->where('title', 'like', '%' . trim($decoded['task_title']) . '%')
                    ->first();

                if ($focusTask) {
                    $focusTask->update(['priority_score' => $score]);
                }
            }
        }

        $suggestedReplies = match($intent) {
            'set_priority'    => ['Mettila come priorità alta', 'Sposta a domani', 'Rimuovila dal piano'],
            'lighter_day'     => ['Ok, grazie!', 'Puoi fare di meno?', 'Rivedi anche domani'],
            'reschedule_task' => ['Perfetto', 'Sposta anche le altre', 'Annulla'],
            'add_task'        => ['Aggiungila subito', 'Aggiungila per domani', 'Lascia perdere'],
            'general'         => ['Mettila come priorità alta', 'Sposta a domani', 'Come sto andando?'],
            default           => ['Ok!', 'Dimmi di più', 'Ricomincia da capo'],
        };

        if (in_array($intent, ['reschedule_task', 'lighter_day'], true)) {
            try {
                $this->regenerateTimeline($user, $message);
                $sessionUpdated = true;
            } catch (\Exception $e) {
                Log::error('FocusOrchestrator regenerate on chat intent failed', ['message' => $e->getMessage()]);
            }
        }

        AssistantConversation::create([
            'user_id'          => $user->id,
            'focus_session_id' => $session->id,
            'role'             => ConversationRole::Assistant,
            'content'          => $llmResponse,
            'intent_detected'  => $intent,
        ]);

        return [
            'response'          => $llmResponse,
            'intent'            => $intent,
            'session_updated'   => $sessionUpdated,
            'suggested_replies' => $suggestedReplies,
            'priority_action'   => $priorityAction,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function getPendingTasks(User $user, ?FocusDailyCheckin $checkin = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = FocusTask::where('user_id', $user->id)
            ->whereIn('status', [FocusTaskStatus::Pending->value, FocusTaskStatus::InProgress->value]);

        // If checkin specifies projects, filter tasks to those projects via crm_task linkage
        if ($checkin && !empty($checkin->selected_project_ids)) {
            $projectIds = $checkin->selected_project_ids;
            $query->where(function ($q) use ($projectIds) {
                $q->whereNull('crm_task_id')
                  ->orWhereHas('crmTask', function ($cq) use ($projectIds) {
                      $cq->whereIn('crm_project_id', $projectIds);
                  });
            });
        }

        return $query->orderByDesc('priority_score')->get();
    }

    private function getOrCreateWorkPattern(User $user): UserWorkPattern
    {
        return UserWorkPattern::firstOrCreate(
            ['user_id' => $user->id],
            [
                'peak_hours'               => [9 => 1.0, 10 => 0.9, 11 => 0.8, 15 => 0.7, 16 => 0.6],
                'avg_estimation_accuracy'  => 1.0,
                'preferred_cognitive_loads' => ['deep_work', 'creative'],
                'total_tasks_completed'    => 0,
                'avg_deep_work_minutes'    => 90,
                'fatigue_threshold_hour'   => 17,
                'last_recalculated_at'     => now(),
            ]
        );
    }

    /**
     * Build a compact checkin context string to inject into the LLM prompt.
     */
    private function buildCheckinContext(?FocusDailyCheckin $checkin): string
    {
        if (!$checkin) {
            return '';
        }

        $lines = [];
        $lines[] = "Livello energia oggi: {$checkin->energy_level}/5";
        $lines[] = "Ore disponibili oggi: {$checkin->available_hours}h";

        if (!empty($checkin->fixed_events)) {
            $events = array_map(
                fn($e) => "  - {$e['title']} ({$e['start_time']}–{$e['end_time']})",
                $checkin->fixed_events
            );
            $lines[] = "Eventi fissi (NON spostare):";
            $lines   = array_merge($lines, $events);
        }

        if ($checkin->special_priority) {
            $lines[] = "Priorità speciale: {$checkin->special_priority}";
        }

        if ($checkin->free_note) {
            $lines[] = "Note: {$checkin->free_note}";
        }

        return implode("\n", $lines);
    }

    /**
     * @return array{slots: array<int, array<string, mixed>>, prompt: string, raw: array<string, mixed>}
     */
    private function callLlmForTimeline(
        \Illuminate\Database\Eloquent\Collection $tasks,
        UserWorkPattern $pattern,
        ?string $userInstruction,
        User $user,
        string $analysisContext = '',
        string $checkinContext = '',
        ?FocusDailyCheckin $checkin = null
    ): array {
        $taskList = $tasks->map(fn(FocusTask $t) => [
            'id'                => $t->id,
            'title'             => $t->title,
            'cognitive_load'    => $t->cognitive_load?->value,
            'deadline_type'     => $t->deadline_type?->value,
            'due_date'          => $t->due_date?->toDateString(),
            'estimated_minutes' => $t->estimated_minutes,
            'priority_score'    => $t->priority_score,
        ])->values()->toArray();

        $patternData = [
            'peak_hours'              => $pattern->peak_hours ?? [],
            'avg_estimation_accuracy' => $pattern->avg_estimation_accuracy,
            'fatigue_threshold_hour'  => $pattern->fatigue_threshold_hour,
            'avg_deep_work_minutes'   => $pattern->avg_deep_work_minutes,
        ];

        $now            = now()->format('Y-m-d H:i');
        $instructionLine = $userInstruction
            ? "\n\nIstruzione speciale dell'utente: {$userInstruction}"
            : '';

        $prompt = $this->buildTimelinePrompt($taskList, $patternData, $now, $instructionLine, $analysisContext, $checkinContext);

        $apiKey = config('services.groq.api_key');

        if (empty($apiKey)) {
            Log::warning('FocusOrchestrator: no GROQ API key, using fallback timeline');
            return $this->buildFallbackTimeline($user, $prompt, $checkin);
        }

        try {
            $response = Http::timeout(45)
                ->withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type'  => 'application/json',
                ])
                ->post(self::GROQ_API_URL, [
                    'model'           => self::MODEL,
                    'messages'        => [
                        ['role' => 'system', 'content' => $this->buildTimelineSystemPrompt()],
                        ['role' => 'user',   'content' => $prompt],
                    ],
                    'temperature'     => 0.4,
                    'max_tokens'      => 2048,
                    'response_format' => ['type' => 'json_object'],
                ]);

            if ($response->failed()) {
                Log::error('FocusOrchestrator LLM error', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return $this->buildFallbackTimeline($user, $prompt, $checkin);
            }

            $content = $response->json('choices.0.message.content');

            if (!$content) {
                return $this->buildFallbackTimeline($user, $prompt, $checkin);
            }

            $parsed = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE || empty($parsed['slots'])) {
                Log::warning('FocusOrchestrator: unexpected LLM format', ['content' => $content]);
                return $this->buildFallbackTimeline($user, $prompt, $checkin);
            }

            return [
                'slots'  => $parsed['slots'],
                'prompt' => $prompt,
                'raw'    => $parsed,
            ];
        } catch (\Exception $e) {
            Log::error('FocusOrchestrator exception', ['message' => $e->getMessage()]);
            return $this->buildFallbackTimeline($user, $prompt, $checkin);
        }
    }

    private function buildTimelineSystemPrompt(): string
    {
        return <<<'PROMPT'
Sei un assistente esperto di produttività e time management per freelance.
Il tuo compito è generare una timeline giornaliera ottimizzata basata sulle task dell'utente e sui suoi pattern di lavoro.

Regole ferree:
1. Posiziona le task "deep_work" nelle ore con score più alto in peak_hours
2. Raggruppa task simili per cognitive_load per ridurre il context switching
3. Inserisci una pausa (break) ogni 90 minuti di deep_work
4. Inserisci un buffer di 15 minuti tra task di tipo diverso
5. Non schedulare task cognitive intensive dopo fatigue_threshold_hour
6. La giornata lavorativa va dalle 09:00 alle 18:30
7. Inserisci una pausa pranzo (lunch) di 60 minuti intorno alle 13:00
8. Le durate devono essere multiple di 5 minuti

Rispondi ESCLUSIVAMENTE con JSON valido secondo questo schema:
{
  "slots": [
    {
      "slot_type": "task|break|buffer|lunch",
      "title": "string",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "duration_minutes": integer,
      "focus_task_id": integer|null,
      "notes": "string|null"
    }
  ],
  "reasoning": "breve spiegazione della strategia adottata"
}
PROMPT;
    }

    private function buildTimelinePrompt(
        array  $taskList,
        array  $patternData,
        string $now,
        string $instructionLine,
        string $analysisContext = '',
        string $checkinContext = ''
    ): string {
        $tasksJson   = json_encode($taskList, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $patternJson = json_encode($patternData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $analysisSection = $analysisContext
            ? "\n## Analisi progetti (usa per prioritizzare)\n{$analysisContext}\n"
            : '';

        $checkinSection = $checkinContext
            ? "\n## Check-in giornaliero dell'utente\n{$checkinContext}\n"
            : '';

        return <<<PROMPT
Data e ora corrente: {$now}
{$instructionLine}
{$checkinSection}
{$analysisSection}
## Task dell'utente (da schedulare)
{$tasksJson}

## Pattern di lavoro dell'utente
{$patternJson}

Genera la timeline ottimizzata per oggi rispettando le regole del sistema.
PROMPT;
    }

    /**
     * Fallback: build timeline from user preferences and real tasks.
     * Always produces real task slots — never returns an empty plan.
     *
     * @return array{slots: array<int, array<string, mixed>>, prompt: string, raw: array<string, mixed>}
     */
    private function buildFallbackTimeline(User $user, string $prompt, ?FocusDailyCheckin $checkin = null): array
    {
        $pref         = UserFocusPreference::where('user_id', $user->id)->first();
        $startHour    = $pref ? (int) explode(':', $pref->preferred_start_time)[0] : 9;
        $defaultEndHour = $pref ? (int) explode(':', $pref->preferred_end_time)[0] : 18;
        // Use checkin available_hours to cap the working day if provided
        $endHour = $checkin
            ? min($startHour + (int) ceil($checkin->available_hours), $defaultEndHour)
            : $defaultEndHour;
        $lunchEnabled = $pref ? (bool) $pref->lunch_break_enabled : true;
        $lunchStart   = $pref ? (int) explode(':', $pref->lunch_start_time ?? '13:00')[0] : 13;
        $lunchDur     = $pref ? (int) ($pref->lunch_duration_minutes ?? 60) : 60;
        $focusBlock   = $pref ? (int) ($pref->preferred_focus_block_duration ?? 90) : 90;
        $breakDur     = $pref ? (int) ($pref->break_between_focus_blocks ?? 15) : 15;

        $tasks = $this->collectUserTasksForScheduling($user);

        usort($tasks, function (array $a, array $b) {
            $today    = Carbon::today()->toDateString();
            $aOverdue = !empty($a['due_date']) && $a['due_date'] <= $today;
            $bOverdue = !empty($b['due_date']) && $b['due_date'] <= $today;
            $aNoDate  = empty($a['due_date']);
            $bNoDate  = empty($b['due_date']);

            if ($aOverdue && !$bOverdue) return -1;
            if (!$aOverdue && $bOverdue) return  1;
            if (!$aNoDate && $bNoDate)   return -1;
            if ($aNoDate && !$bNoDate)   return  1;
            if (!$aNoDate && !$bNoDate)  return strcmp($a['due_date'], $b['due_date']);

            return ($b['priority_score'] ?? 50) - ($a['priority_score'] ?? 50);
        });

        $slots          = [];
        $currentMinutes = $startHour * 60;
        $endMinutes     = $endHour * 60;
        $lunchDone      = false;
        $sessionWorked  = 0;
        $taskIndex      = 0;
        $sortOrder      = 0;

        while ($currentMinutes < $endMinutes) {
            // Lunch break
            if ($lunchEnabled && !$lunchDone && $currentMinutes >= $lunchStart * 60) {
                $slots[] = [
                    'slot_type'        => 'lunch',
                    'title'            => 'Pausa pranzo',
                    'start_time'       => sprintf('%02d:%02d', intdiv($currentMinutes, 60), $currentMinutes % 60),
                    'end_time'         => sprintf('%02d:%02d', intdiv($currentMinutes + $lunchDur, 60), ($currentMinutes + $lunchDur) % 60),
                    'duration_minutes' => $lunchDur,
                    'focus_task_id'    => null,
                    'notes'            => null,
                    'sort_order'       => $sortOrder++,
                ];
                $currentMinutes += $lunchDur;
                $lunchDone      = true;
                $sessionWorked  = 0;
                continue;
            }

            // Break after focus block
            if ($sessionWorked >= $focusBlock) {
                $slots[] = [
                    'slot_type'        => 'break',
                    'title'            => 'Pausa breve',
                    'start_time'       => sprintf('%02d:%02d', intdiv($currentMinutes, 60), $currentMinutes % 60),
                    'end_time'         => sprintf('%02d:%02d', intdiv($currentMinutes + $breakDur, 60), ($currentMinutes + $breakDur) % 60),
                    'duration_minutes' => $breakDur,
                    'focus_task_id'    => null,
                    'notes'            => null,
                    'sort_order'       => $sortOrder++,
                ];
                $currentMinutes += $breakDur;
                $sessionWorked  = 0;
                continue;
            }

            if ($taskIndex >= count($tasks)) {
                break;
            }

            $task     = $tasks[$taskIndex];
            $maxSlice = $focusBlock - $sessionWorked;
            $duration = max(15, min($task['estimated_minutes'] ?? 60, $maxSlice));

            if ($currentMinutes + $duration > $endMinutes) {
                break;
            }

            $slots[] = [
                'slot_type'        => 'task',
                'title'            => $task['title'],
                'start_time'       => sprintf('%02d:%02d', intdiv($currentMinutes, 60), $currentMinutes % 60),
                'end_time'         => sprintf('%02d:%02d', intdiv($currentMinutes + $duration, 60), ($currentMinutes + $duration) % 60),
                'duration_minutes' => $duration,
                'focus_task_id'    => $task['focus_task_id'] ?? null,
                'notes'            => $task['project'] ?? null,
                'sort_order'       => $sortOrder++,
            ];

            $currentMinutes += $duration;
            $sessionWorked  += $duration;
            $taskIndex++;
        }

        // Ensure lunch is included even if no tasks fill the morning
        if ($lunchEnabled && !$lunchDone) {
            $lunchMinutes = $lunchStart * 60;
            $slots[] = [
                'slot_type'        => 'lunch',
                'title'            => 'Pausa pranzo',
                'start_time'       => sprintf('%02d:%02d', intdiv($lunchMinutes, 60), $lunchMinutes % 60),
                'end_time'         => sprintf('%02d:%02d', intdiv($lunchMinutes + $lunchDur, 60), ($lunchMinutes + $lunchDur) % 60),
                'duration_minutes' => $lunchDur,
                'focus_task_id'    => null,
                'notes'            => null,
                'sort_order'       => $sortOrder++,
            ];
        }

        // Inject fixed events from checkin as immovable buffer slots
        if ($checkin && !empty($checkin->fixed_events)) {
            foreach ($checkin->fixed_events as $event) {
                $slots[] = [
                    'slot_type'        => 'buffer',
                    'title'            => $event['title'] ?? 'Evento fisso',
                    'start_time'       => $event['start_time'] ?? '00:00',
                    'end_time'         => $event['end_time'] ?? '00:00',
                    'duration_minutes' => 0,
                    'focus_task_id'    => null,
                    'notes'            => 'Evento fisso — non spostare',
                    'sort_order'       => $sortOrder++,
                ];
            }
        }

        return [
            'slots'  => $slots,
            'prompt' => $prompt,
            'raw'    => ['fallback' => true, 'reasoning' => 'Piano generato automaticamente basato su priorità e scadenze.', 'slots' => $slots],
        ];
    }

    /**
     * Collect all schedulable tasks for this user across FocusTask, CRM, and Workspace sources.
     * CRM and Workspace tasks get a FocusTask wrapper (firstOrCreate) so they obtain a focus_task_id.
     *
     * @return array<int, array{focus_task_id: int|null, title: string, estimated_minutes: int, due_date: string|null, priority_score: int, project: string|null}>
     */
    private function collectUserTasksForScheduling(User $user): array
    {
        $collected = [];
        $seen      = [];

        try {
            // 1. Native FocusTasks
            $focusTasks = FocusTask::where('user_id', $user->id)
                ->whereIn('status', [FocusTaskStatus::Pending->value, FocusTaskStatus::InProgress->value])
                ->orderByDesc('priority_score')
                ->get();

            foreach ($focusTasks as $ft) {
                $seen[$ft->id] = true;
                $collected[]   = [
                    'focus_task_id'    => $ft->id,
                    'title'            => $ft->title,
                    'estimated_minutes' => $ft->estimated_minutes ?? 60,
                    'due_date'         => $ft->due_date?->toDateString(),
                    'priority_score'   => $ft->priority_score ?? 50,
                    'project'          => null,
                ];
            }

            // 2. CRM assigned tasks (active assignments)
            $assignedIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            if ($assignedIds->isNotEmpty()) {
                $crmTasks = CrmProjectTask::whereIn('id', $assignedIds)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->with('project:id,name')
                    ->get();

                foreach ($crmTasks as $ct) {
                    $ft = FocusTask::firstOrCreate(
                        ['user_id' => $user->id, 'crm_task_id' => $ct->id],
                        [
                            'title'             => $ct->title,
                            'estimated_minutes' => $ct->estimated_hours ? (int) round($ct->estimated_hours * 60) : 60,
                            'priority_score'    => match ($ct->priority ?? '') {
                                'high', 'urgent' => 80,
                                'medium'         => 50,
                                default          => 30,
                            },
                            'status'            => FocusTaskStatus::Pending,
                            'due_date'          => $ct->due_date,
                        ]
                    );

                    if (!isset($seen[$ft->id])) {
                        $seen[$ft->id] = true;
                        $collected[]   = [
                            'focus_task_id'    => $ft->id,
                            'title'            => $ft->title,
                            'estimated_minutes' => $ft->estimated_minutes ?? 60,
                            'due_date'         => $ft->due_date?->toDateString() ?? $ct->due_date?->toDateString(),
                            'priority_score'   => $ft->priority_score ?? 50,
                            'project'          => $ct->project?->name,
                        ];
                    }
                }
            }

            // 3. Workspace tasks assigned to this user
            $wsTasks = WorkspaceUserTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->get();

            foreach ($wsTasks as $wt) {
                $ft = FocusTask::firstOrCreate(
                    ['user_id' => $user->id, 'title' => $wt->title, 'crm_task_id' => null],
                    [
                        'estimated_minutes' => 60,
                        'priority_score'    => match ($wt->priority ?? '') {
                            'high', 'urgent' => 80,
                            'medium'         => 50,
                            default          => 30,
                        },
                        'status'  => FocusTaskStatus::Pending,
                        'due_date' => $wt->due_date,
                    ]
                );

                if (!isset($seen[$ft->id])) {
                    $seen[$ft->id] = true;
                    $collected[]   = [
                        'focus_task_id'    => $ft->id,
                        'title'            => $ft->title,
                        'estimated_minutes' => $ft->estimated_minutes ?? 60,
                        'due_date'         => $ft->due_date?->toDateString() ?? $wt->due_date?->toDateString(),
                        'priority_score'   => $ft->priority_score ?? 50,
                        'project'          => null,
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::error('FocusOrchestrator: collectUserTasksForScheduling failed', ['error' => $e->getMessage()]);
        }

        return $collected;
    }

    /**
     * Build a compact analysis context string from ready FocusAnalysisReport records.
     */
    private function buildAnalysisContext(User $user): string
    {
        try {
            $reports = FocusAnalysisReport::where('user_id', $user->id)
                ->where('status', 'ready')
                ->get();

            $context = '';

            foreach ($reports as $report) {
                if ($report->report_type === 'overview' && $report->content) {
                    $c        = $report->content;
                    $context .= "\nWorkload overview: " . ($c['recommendation'] ?? '') . "\n";
                    if (!empty($c['risk_projects'])) {
                        $context .= "Progetti ad alto rischio: " . implode(', ', $c['risk_projects']) . "\n";
                    }
                }

                if ($report->report_type === 'project' && $report->content) {
                    $c        = $report->content;
                    $context .= "\nProgetto {$report->subject_name}: rischio=" . ($c['risk_level'] ?? 'n/a') . ", ";
                    $context .= "top task: " . implode(', ', $c['top_3_next_tasks'] ?? []) . "\n";
                }
            }

            return $context;
        } catch (\Exception $e) {
            Log::warning('FocusOrchestrator: buildAnalysisContext failed', ['error' => $e->getMessage()]);
            return '';
        }
    }

    /**
     * @param  array<int, array<string, mixed>> $slotsData
     * @return FocusSessionSlot[]
     */
    private function persistSlots(FocusSession $session, array $slotsData): array
    {
        $created = [];

        // Pre-load valid focus_task IDs to avoid FK violations when LLM returns wrong IDs
        $validIds = FocusTask::where('user_id', $session->user_id)->pluck('id')->flip()->toArray();

        foreach ($slotsData as $index => $slot) {
            $slotType = FocusSlotType::tryFrom($slot['slot_type'] ?? '') ?? FocusSlotType::Buffer;

            $rawTaskId     = $slot['focus_task_id'] ?? null;
            $safeTaskId    = ($rawTaskId && isset($validIds[$rawTaskId])) ? $rawTaskId : null;

            $created[] = FocusSessionSlot::create([
                'focus_session_id' => $session->id,
                'focus_task_id'    => $safeTaskId,
                'slot_type'        => $slotType,
                'title'            => $slot['title'] ?? '',
                'start_time'       => $slot['start_time'] ?? '09:00',
                'end_time'         => $slot['end_time'] ?? '09:30',
                'duration_minutes' => (int) ($slot['duration_minutes'] ?? 30),
                'is_completed'     => false,
                'sort_order'       => $slot['sort_order'] ?? $index,
                'notes'            => $slot['notes'] ?? null,
            ]);
        }

        return $created;
    }

    private function buildChatSystemPrompt(array $todaySlots): string
    {
        $slotsJson = json_encode($todaySlots, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
Sei un assistente di produttività personale per freelance, esperto di focus e time management.
Il tuo nome è "FocusAI". Sei conciso, diretto e concreto.

Timeline di oggi dell'utente:
{$slotsJson}

Puoi aiutare a:
- Riprogrammare task ("reschedule")
- Alleggerire la giornata se l'utente è stanco ("lighter_day")
- Aggiungere nuove task ("add_task")
- Rispondere a domande sulla produttività e sul focus

Rispondi sempre in italiano, in modo naturale e amichevole.
PROMPT;
    }

    private function detectIntent(string $message): string
    {
        $lower = mb_strtolower($message);

        $patterns = [
            'set_priority'    => ['priorità alta', 'alta priorità', 'priorità media', 'priorità bassa', 'metti come priorit', 'dai priorità', 'imposta priorit', 'set priority', 'high priority', 'mark as priority'],
            'reschedule_task' => ['sposta', 'riprogramma', 'rimanda', 'posticipa', 'reschedule'],
            'lighter_day'     => ['stanco', 'affaticato', 'meno task', 'giornata leggera', 'riduci', 'lighter'],
            'add_task'        => ['aggiungi', 'nuova task', 'inserisci', 'add task', 'crea task'],
        ];

        foreach ($patterns as $intent => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($lower, $keyword)) {
                    return $intent;
                }
            }
        }

        return 'general';
    }
}
