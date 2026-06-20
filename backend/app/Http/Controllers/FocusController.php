<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskAssignment;
use App\Models\FocusDailyCheckin;
use App\Models\FocusSession;
use App\Models\FocusTask;
use App\Models\UserFocusPreference;
use App\Models\WorkspaceUserTask;
use App\Models\FocusAnalysisReport;
use App\Services\FocusAnalysisPipelineService;
use App\Services\FocusDataAggregatorService;
use App\Services\FocusOrchestratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FocusController extends Controller
{
    private const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL        = 'llama-3.3-70b-versatile';

    public function __construct(
        private readonly FocusOrchestratorService    $orchestrator,
        private readonly FocusDataAggregatorService  $dataAggregator,
        private readonly FocusAnalysisPipelineService $pipeline,
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Session
    // ─────────────────────────────────────────────────────────────────────────

    public function getTodaySession(Request $request): JsonResponse
    {
        try {
            $user  = $request->user();
            $force = filter_var($request->query('force', false), FILTER_VALIDATE_BOOLEAN);

            if ($force) {
                $today = Carbon::today()->toDateString();
                $existing = FocusSession::where('user_id', $user->id)
                    ->whereDate('session_date', $today)
                    ->first();

                if ($existing) {
                    // Remove non-completed slots so generateDayTimeline rebuilds them
                    \App\Models\FocusSessionSlot::where('focus_session_id', $existing->id)
                        ->where('is_completed', false)
                        ->delete();
                    $existing->delete();
                }
            }

            $session = $this->orchestrator->getOrCreateTodaySession($user);

            return response()->json([
                'success' => true,
                'data'    => $session->load(['slots.task']),
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function regenerateSession(Request $request): JsonResponse
    {
        $request->validate([
            'instruction' => 'nullable|string|max:500',
        ]);

        try {
            $session = $this->orchestrator->regenerateTimeline(
                $request->user(),
                $request->input('instruction')
            );

            return response()->json([
                'success' => true,
                'data'    => $session->load(['slots.task']),
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tasks CRUD
    // ─────────────────────────────────────────────────────────────────────────

    public function getTasks(Request $request): JsonResponse
    {
        try {
            $tasks = FocusTask::where('user_id', $request->user()->id)
                ->orderByDesc('priority_score')
                ->orderBy('created_at')
                ->get();

            return response()->json(['success' => true, 'data' => $tasks]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function createTask(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'             => 'required|string|max:255',
            'description'       => 'nullable|string|max:2000',
            'cognitive_load'    => 'nullable|string|in:deep_work,creative,repetitive,meetings,admin',
            'deadline_type'     => 'nullable|string|in:hard,soft,none',
            'due_date'          => 'nullable|date',
            'due_time'          => 'nullable|date_format:H:i',
            'estimated_minutes' => 'nullable|integer|min:5|max:480',
            'priority_score'    => 'nullable|integer|min:0|max:100',
            'tags'              => 'nullable|array',
            'tags.*'            => 'string|max:50',
        ]);

        try {
            $task = FocusTask::create(array_merge($validated, [
                'user_id' => $request->user()->id,
                'status'  => 'pending',
            ]));

            return response()->json(['success' => true, 'data' => $task], 201);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function updateTask(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'title'             => 'sometimes|string|max:255',
            'description'       => 'nullable|string|max:2000',
            'cognitive_load'    => 'nullable|string|in:deep_work,creative,repetitive,meetings,admin',
            'deadline_type'     => 'nullable|string|in:hard,soft,none',
            'due_date'          => 'nullable|date',
            'due_time'          => 'nullable|date_format:H:i',
            'estimated_minutes' => 'nullable|integer|min:5|max:480',
            'priority_score'    => 'nullable|integer|min:0|max:100',
            'status'            => 'nullable|string|in:pending,in_progress,completed,skipped',
            'tags'              => 'nullable|array',
            'tags.*'            => 'string|max:50',
        ]);

        try {
            $task = FocusTask::where('user_id', $request->user()->id)->findOrFail($id);

            // Only one task can be in_progress at a time
            if (($validated['status'] ?? null) === 'in_progress') {
                FocusTask::where('user_id', $request->user()->id)
                    ->where('status', 'in_progress')
                    ->where('id', '!=', $id)
                    ->update(['status' => 'pending']);
            }

            $task->update($validated);

            return response()->json(['success' => true, 'data' => $task->fresh()]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Task non trovata.'], 404);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function updatePriority(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'priority_score' => 'required|integer|min:0|max:100',
        ]);

        try {
            $task = FocusTask::where('user_id', $request->user()->id)->findOrFail($id);
            $task->update(['priority_score' => $validated['priority_score']]);

            return response()->json(['success' => true, 'data' => $task->fresh()]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Task non trovata.'], 404);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    /**
     * Find or create a FocusTask wrapper for a CRM / Workspace agenda item.
     * Accepts an agenda_item_id like "crm_123" or "ws_456".
     * Returns the FocusTask (existing or newly created).
     */
    public function ensureWrapper(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'agenda_item_id' => 'required|string',
        ]);

        $agendaId = $validated['agenda_item_id'];
        $user     = $request->user();

        try {
            if (str_starts_with($agendaId, 'focus_')) {
                $focusId = (int) substr($agendaId, strlen('focus_'));
                $task    = FocusTask::where('user_id', $user->id)->findOrFail($focusId);

                return response()->json(['success' => true, 'data' => $task]);
            }

            if (str_starts_with($agendaId, 'crm_')) {
                $crmId = (int) substr($agendaId, strlen('crm_'));

                $existing = FocusTask::where('user_id', $user->id)
                    ->where('crm_task_id', $crmId)
                    ->first();

                if ($existing) {
                    return response()->json(['success' => true, 'data' => $existing]);
                }

                $crmTask = CrmProjectTask::findOrFail($crmId);
                $task    = FocusTask::create([
                    'user_id'           => $user->id,
                    'crm_task_id'       => $crmId,
                    'title'             => $crmTask->title,
                    'status'            => 'pending',
                    'priority_score'    => 50,
                    'estimated_minutes' => $crmTask->estimated_hours
                        ? (int) round($crmTask->estimated_hours * 60)
                        : 60,
                    'due_date'          => $crmTask->due_date,
                    'cognitive_load'    => $this->inferCognitiveLoad($crmTask->title),
                ]);

                return response()->json(['success' => true, 'data' => $task], 201);
            }

            if (str_starts_with($agendaId, 'ws_')) {
                $wsId = (int) substr($agendaId, strlen('ws_'));

                $wsTask  = WorkspaceUserTask::findOrFail($wsId);
                $existing = FocusTask::where('user_id', $user->id)
                    ->where('title', $wsTask->title)
                    ->whereNull('crm_task_id')
                    ->first();

                if ($existing) {
                    return response()->json(['success' => true, 'data' => $existing]);
                }

                $task = FocusTask::create([
                    'user_id'           => $user->id,
                    'title'             => $wsTask->title,
                    'status'            => 'pending',
                    'priority_score'    => 50,
                    'estimated_minutes' => 60,
                    'due_date'          => $wsTask->due_date ?? null,
                    'cognitive_load'    => $this->inferCognitiveLoad($wsTask->title),
                ]);

                return response()->json(['success' => true, 'data' => $task], 201);
            }

            return response()->json(['success' => false, 'message' => 'ID agenda non riconosciuto.'], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Risorsa sorgente non trovata.'], 404);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function deleteTask(Request $request, int $id): JsonResponse
    {
        try {
            $task = FocusTask::where('user_id', $request->user()->id)->findOrFail($id);
            $task->delete();

            return response()->json(['success' => true, 'data' => null]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Task non trovata.'], 404);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function completeTask(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'actual_minutes'  => 'required|integer|min:1|max:480',
            'mental_fatigue'  => 'required|integer|min:1|max:5',
        ]);

        try {
            $task = FocusTask::where('user_id', $request->user()->id)->findOrFail($id);

            $metric = $this->orchestrator->recordTaskCompletion(
                $request->user(),
                $task,
                $validated['actual_minutes'],
                $validated['mental_fatigue']
            );

            return response()->json([
                'success' => true,
                'data'    => [
                    'task'   => $task->fresh(),
                    'metric' => $metric,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Task non trovata.'], 404);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Agenda — aggregated multi-source view
    // ─────────────────────────────────────────────────────────────────────────

    public function getAgenda(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'view' => 'nullable|string|in:day,week',
            'date' => 'nullable|date',
        ]);

        $view = $validated['view'] ?? 'day';
        $date = isset($validated['date']) ? Carbon::parse($validated['date']) : Carbon::today();
        $user = $request->user();

        try {
            $items = collect();

            // ── 1. Focus tasks — ALL non-completed/skipped, regardless of due_date ──
            $focusQuery = FocusTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'skipped'])
                ->orderByDesc('priority_score')
                ->orderBy('due_date');

            foreach ($focusQuery->get() as $task) {
                $items->push([
                    'id'                => 'focus_' . $task->id,
                    'source'            => 'focus_task',
                    'title'             => $task->title,
                    'due_date'          => $task->due_date?->toDateString(),
                    'due_time'          => null,
                    'estimated_minutes' => $task->estimated_minutes ?? 60,
                    'priority'          => null,
                    'priority_score'    => $task->priority_score,
                    'cognitive_load'    => $task->cognitive_load ?? 'deep_work',
                    'status'            => $task->status,
                    'project_name'      => null,
                    'color'             => '#7C3AED',
                ]);
            }

            // ── 2. CRM project tasks — assigned as executor + PM of project ──
            $assignedCrmIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            $managedCrmProjectIds = CrmProject::where('manager_id', $user->id)->pluck('id');
            $managedCrmTaskIds    = CrmProjectTask::whereIn('crm_project_id', $managedCrmProjectIds)->pluck('id');
            $managedOnlyCrmIds    = $managedCrmTaskIds->diff($assignedCrmIds)->unique();
            $allCrmTaskIds        = $assignedCrmIds->merge($managedCrmTaskIds)->unique();

            if ($allCrmTaskIds->isNotEmpty()) {
                $crmQuery = CrmProjectTask::whereIn('id', $allCrmTaskIds)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->with('project')
                    ->orderBy('due_date');

                foreach ($crmQuery->get() as $task) {
                    $isPmTask = $managedOnlyCrmIds->contains($task->id);
                    $items->push([
                        'id'                => 'crm_' . $task->id,
                        'source'            => $isPmTask ? 'crm_pm_task' : 'crm_task',
                        'title'             => $task->title,
                        'due_date'          => $task->due_date?->toDateString(),
                        'due_time'          => null,
                        'estimated_minutes' => $task->estimated_hours
                            ? (int) round($task->estimated_hours * 60)
                            : 60,
                        'priority'          => $task->priority,
                        'priority_score'    => null,
                        'cognitive_load'    => $this->inferCognitiveLoad($task->title),
                        'status'            => $task->status,
                        'project_name'      => $task->project?->name,
                        'color'             => $isPmTask ? '#D97706' : '#EA580C',
                    ]);
                }
            }

            // ── 3. Workspace user tasks — ALL non-completed ───────────────────
            $wsQuery = WorkspaceUserTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'done'])
                ->with('project')
                ->orderBy('due_date');

            foreach ($wsQuery->get() as $task) {
                $items->push([
                    'id'                => 'ws_' . $task->id,
                    'source'            => 'workspace_task',
                    'title'             => $task->title,
                    'due_date'          => $task->due_date?->toDateString(),
                    'due_time'          => null,
                    'estimated_minutes' => 60,
                    'priority'          => $task->priority,
                    'priority_score'    => null,
                    'cognitive_load'    => $this->inferCognitiveLoad($task->title),
                    'status'            => $task->status,
                    'project_name'      => $task->project?->name,
                    'color'             => '#2563EB',
                ]);
            }

            // ── 4. Calendar events (freelance_calendar_events) ────────────────
            // Uncomment when calendar integration is needed:
            /*
            $calQuery = \Illuminate\Support\Facades\DB::table('freelance_calendar_events')
                ->where('user_id', $user->id)
                ->whereNull('deleted_at');

            if ($view === 'day') {
                $calQuery->whereDate('start_time', $date->toDateString());
            } else {
                $calQuery->whereBetween(
                    \Illuminate\Support\Facades\DB::raw('DATE(start_time)'),
                    [$startDate->toDateString(), $endDate->toDateString()]
                );
            }

            foreach ($calQuery->orderBy('start_time')->get() as $event) {
                $start = Carbon::parse($event->start_time);
                $end   = isset($event->end_time) ? Carbon::parse($event->end_time) : null;
                $items->push([
                    'id'                => 'cal_' . $event->id,
                    'source'            => 'calendar_event',
                    'title'             => $event->title,
                    'due_date'          => $start->toDateString(),
                    'due_time'          => $start->format('H:i'),
                    'estimated_minutes' => $end ? (int) $start->diffInMinutes($end) : 60,
                    'priority'          => null,
                    'cognitive_load'    => 'meetings',
                    'status'            => $event->status ?? 'pending',
                    'project_name'      => null,
                    'color'             => '#10B981',
                ]);
            }
            */

            // ── Focus session slots for the day ───────────────────────────────
            $session = FocusSession::where('user_id', $user->id)
                ->whereDate('session_date', $date->toDateString())
                ->first();

            $slots = $session
                ? $session->load('slots.task')->slots
                : collect();

            return response()->json([
                'success' => true,
                'data'    => [
                    'view'  => $view,
                    'date'  => $date->toDateString(),
                    'items' => $items->values(),
                    'slots' => $slots,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Work Patterns
    // ─────────────────────────────────────────────────────────────────────────

    public function getWorkPatterns(Request $request): JsonResponse
    {
        try {
            $pattern = $this->orchestrator->recalculateWorkPatterns($request->user());

            return response()->json(['success' => true, 'data' => $pattern]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Chat
    // ─────────────────────────────────────────────────────────────────────────

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        try {
            $user    = $request->user();
            $session = $this->orchestrator->getOrCreateTodaySession($user);

            $result = $this->orchestrator->chatWithAssistant(
                $user,
                $validated['message'],
                $session
            );

            return response()->json([
                'success' => true,
                'data'    => [
                    'response'          => $result['response'],
                    'intent'            => $result['intent'],
                    'session_updated'   => $result['session_updated'],
                    'suggested_replies' => $result['suggested_replies'] ?? [],
                    'priority_action'   => $result['priority_action'] ?? null,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Focus Preferences
    // ─────────────────────────────────────────────────────────────────────────

    public function getPreferences(Request $request): JsonResponse
    {
        try {
            $pref = UserFocusPreference::firstOrCreate(
                ['user_id' => $request->user()->id],
                [
                    'preferred_start_time'           => '09:00',
                    'preferred_end_time'             => '18:00',
                    'max_daily_hours'                => 8,
                    'lunch_break_enabled'            => true,
                    'lunch_start_time'               => '13:00',
                    'lunch_duration_minutes'         => 60,
                    'preferred_focus_block_duration' => 90,
                    'break_between_focus_blocks'     => 15,
                    'working_days'                   => [1, 2, 3, 4, 5],
                    'preferred_cognitive_morning'    => 'deep_work',
                    'preferred_cognitive_afternoon'  => 'repetitive',
                    'rest_reminder_enabled'          => true,
                ]
            );

            return response()->json(['success' => true, 'data' => $pref]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function savePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferred_start_time'           => 'nullable|date_format:H:i',
            'preferred_end_time'             => 'nullable|date_format:H:i',
            'max_daily_hours'                => 'nullable|integer|min:1|max:16',
            'lunch_break_enabled'            => 'nullable|boolean',
            'lunch_start_time'               => 'nullable|date_format:H:i',
            'lunch_duration_minutes'         => 'nullable|integer|min:15|max:120',
            'preferred_focus_block_duration' => 'nullable|integer|min:15|max:240',
            'break_between_focus_blocks'     => 'nullable|integer|min:5|max:60',
            'working_days'                   => 'nullable|array',
            'working_days.*'                 => 'integer|min:1|max:7',
            'preferred_cognitive_morning'    => 'nullable|string|in:deep_work,creative,repetitive,meetings,admin',
            'preferred_cognitive_afternoon'  => 'nullable|string|in:deep_work,creative,repetitive,meetings,admin',
            'rest_reminder_enabled'          => 'nullable|boolean',
            'notes'                          => 'nullable|string|max:1000',
        ]);

        try {
            $pref = UserFocusPreference::updateOrCreate(
                ['user_id' => $request->user()->id],
                $validated
            );

            return response()->json(['success' => true, 'data' => $pref]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Analyze text
    // ─────────────────────────────────────────────────────────────────────────

    public function analyzeText(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text'     => 'required|string|max:10000',
            'question' => 'nullable|string|max:500',
        ]);

        $user     = $request->user();
        $text     = $validated['text'];
        $question = $validated['question'] ?? null;

        $userContent = $question
            ? "Testo:\n{$text}\n\nDomanda: {$question}"
            : "Analizza questo testo e fornisci:\n1. Punti chiave\n2. Action items\n3. Scadenze trovate\n4. Priorità suggerita\n\nTesto:\n{$text}";

        $systemPrompt = <<<PROMPT
Sei un assistente analisi documenti per {$user->name}.
Analizza il testo fornito e rispondi in italiano.
Quando estrai action items, restituiscili come lista numerata chiaramente identificabile con prefisso "ACTION:".
Quando trovi date o scadenze, indicale con prefisso "DATA:".
Sii conciso e pratico.
PROMPT;

        $apiKey = config('services.groq.api_key');

        if (empty($apiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Servizio AI non configurato.',
            ], 503);
        }

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type'  => 'application/json',
                ])
                ->post(self::GROQ_API_URL, [
                    'model'       => self::MODEL,
                    'messages'    => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user',   'content' => $userContent],
                    ],
                    'temperature' => 0.3,
                    'max_tokens'  => 1024,
                ]);

            if ($response->failed()) {
                Log::warning('FocusController analyzeText LLM error', ['status' => $response->status()]);
                return response()->json(['success' => false, 'message' => 'Errore AI.'], 502);
            }

            $analysis = $response->json('choices.0.message.content') ?? '';

            $actionItems = $this->extractPrefixedLines($analysis, 'ACTION:');
            $detectedDates = $this->extractPrefixedLines($analysis, 'DATA:');

            return response()->json([
                'success' => true,
                'data'    => [
                    'analysis'       => $analysis,
                    'action_items'   => $actionItems,
                    'detected_dates' => $detectedDates,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Analysis Pipeline
    // ─────────────────────────────────────────────────────────────────────────

    public function getAnalysisReports(Request $request): JsonResponse
    {
        try {
            $user    = $request->user();
            $reports = $this->pipeline->initializePipeline($user);

            return response()->json([
                'success' => true,
                'data'    => ['reports' => $reports],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function runNextAnalysisStep(Request $request): JsonResponse
    {
        try {
            $user   = $request->user();
            $report = $this->pipeline->runNextPendingStep($user);

            $nextPending = FocusAnalysisReport::where('user_id', $user->id)
                ->where('status', 'pending')
                ->orderBy('sort_order')
                ->first();

            $hasMore             = $nextPending !== null;
            $timelineNeedsRefresh = !$hasMore;

            return response()->json([
                'success' => true,
                'data'    => [
                    'report'                 => $report,
                    'next_pending'           => $nextPending,
                    'has_more'               => $hasMore,
                    'timeline_needs_refresh' => $timelineNeedsRefresh,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function invalidateAnalysis(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $this->pipeline->invalidateReports($user);
            $reports = $this->pipeline->initializePipeline($user);

            return response()->json([
                'success' => true,
                'data'    => ['reports' => $reports],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Daily Check-in
    // ─────────────────────────────────────────────────────────────────────────

    public function storeCheckin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'energy_level'         => 'required|integer|min:1|max:5',
            'available_hours'      => 'required|numeric|min:0.5|max:24',
            'selected_project_ids' => 'nullable|array',
            'selected_project_ids.*' => 'integer',
            'fixed_events'         => 'nullable|array',
            'fixed_events.*.title'      => 'required_with:fixed_events|string|max:255',
            'fixed_events.*.start_time' => 'required_with:fixed_events|date_format:H:i',
            'fixed_events.*.end_time'   => 'required_with:fixed_events|date_format:H:i',
            'special_priority'     => 'nullable|string|max:1000',
            'free_note'            => 'nullable|string|max:2000',
        ]);

        try {
            $user    = $request->user();
            $today   = Carbon::today()->toDateString();

            $checkin = FocusDailyCheckin::updateOrCreate(
                ['user_id' => $user->id, 'date' => $today],
                array_merge($validated, ['date' => $today])
            );

            return response()->json(['success' => true, 'data' => $checkin]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function getCheckin(Request $request): JsonResponse
    {
        try {
            $today   = Carbon::today()->toDateString();
            $checkin = FocusDailyCheckin::where('user_id', $request->user()->id)
                ->whereDate('date', $today)
                ->first();

            return response()->json(['success' => true, 'data' => $checkin]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function getCheckinBriefing(Request $request): JsonResponse
    {
        try {
            $user     = $request->user();
            $today    = Carbon::today();
            $todayStr = $today->toDateString();
            $ctx      = $this->dataAggregator->getUserFullContext($user);
            $stats    = $ctx['backlog_stats'] ?? [];

            $hour     = (int) now()->format('H');
            $greeting = $hour < 12 ? 'Buongiorno' : ($hour < 17 ? 'Buon pomeriggio' : 'Buonasera');

            $priorityItems = [];
            $seen          = [];

            $pushItem = function (array $item) use (&$priorityItems, &$seen): void {
                $key = ($item['source'] ?? 'task') . ':' . ($item['id'] ?? $item['title']);
                if (isset($seen[$key])) {
                    return;
                }
                $seen[$key] = true;
                $priorityItems[] = $item;
            };

            foreach ($ctx['overdue_tasks'] ?? [] as $t) {
                $daysLate = max(1, abs((int) ($t['days_late'] ?? 1)));
                $pushItem([
                    'id'                => ($t['source'] ?? 'task') . '_' . ($t['id'] ?? md5($t['title'])),
                    'title'             => $t['title'],
                    'project_name'      => $t['project'] ?? null,
                    'project_id'        => $t['project_id'] ?? null,
                    'due_date'          => $t['due_date'] ?? null,
                    'estimated_minutes' => (int) (($t['estimated_hours'] ?? 1) * 60),
                    'reason'            => $daysLate === 1 ? 'Scaduta ieri' : "In ritardo di {$daysLate} gg",
                    'reason_type'       => 'overdue',
                    'priority_score'    => 100,
                    'source'            => $t['source'] ?? 'task',
                ]);
            }

            foreach ($ctx['today_tasks'] ?? [] as $t) {
                if (($t['due_date'] ?? null) !== $todayStr) {
                    continue;
                }
                $pushItem([
                    'id'                => ($t['source'] ?? 'task') . '_' . ($t['id'] ?? md5($t['title'])),
                    'title'             => $t['title'],
                    'project_name'      => $t['project'] ?? null,
                    'project_id'        => $t['project_id'] ?? null,
                    'due_date'          => $t['due_date'] ?? null,
                    'estimated_minutes' => (int) ($t['estimated_minutes'] ?? (($t['estimated_hours'] ?? 1) * 60)),
                    'reason'            => 'Oggi',
                    'reason_type'       => 'today',
                    'priority_score'    => 85,
                    'source'            => $t['source'] ?? 'task',
                ]);
            }

            // Solo i progetti più critici, max 2 task, solo se serve riempire il briefing
            if (count($priorityItems) < 6) {
                $sortedProjectDetail = $ctx['projects_detail'] ?? [];
                usort($sortedProjectDetail, fn ($a, $b) =>
                    ((int) ($b['overdue_tasks'] ?? 0)) <=> ((int) ($a['overdue_tasks'] ?? 0))
                    ?: ((int) ($b['open_tasks'] ?? 0)) <=> ((int) ($a['open_tasks'] ?? 0))
                );

                $addedFromProjects = 0;
                foreach (array_slice($sortedProjectDetail, 0, 4) as $project) {
                    if ($addedFromProjects >= 2 || count($priorityItems) >= 6) {
                        break;
                    }
                    $title = ($project['open_task_titles'][0] ?? null);
                    if (!$title) {
                        continue;
                    }
                    $pushItem([
                        'id'                => 'project_' . $project['id'] . '_' . md5($title),
                        'title'             => $title,
                        'project_name'      => $project['name'],
                        'project_id'        => $project['id'],
                        'due_date'          => null,
                        'estimated_minutes' => 60,
                        'reason'            => ((int) ($project['overdue_tasks'] ?? 0)) > 0
                            ? 'Progetto in ritardo'
                            : 'Prossima task',
                        'reason_type'       => 'project',
                        'priority_score'    => 60 + min(20, (int) ($project['overdue_tasks'] ?? 0) * 5),
                        'source'            => $project['source'] ?? 'crm',
                    ]);
                    $addedFromProjects++;
                }
            }

            usort($priorityItems, fn ($a, $b) => $b['priority_score'] <=> $a['priority_score']);
            $priorityItems = array_slice($priorityItems, 0, 6);

            $projects = array_map(fn ($p) => [
                'id'            => $p['id'],
                'name'          => $p['name'],
                'color'         => '#7C3AED',
                'tasks_count'   => (int) ($p['open_tasks'] ?? 0),
                'overdue_count' => (int) ($p['overdue_tasks'] ?? 0),
                'top_tasks'     => array_slice($p['open_task_titles'] ?? [], 0, 2),
            ], $ctx['projects_detail'] ?? []);

            usort($projects, fn ($a, $b) =>
                $b['overdue_count'] <=> $a['overdue_count']
                ?: $b['tasks_count'] <=> $a['tasks_count']
            );

            $startOptions = [];
            $overdueCount = (int) ($stats['overdue'] ?? 0);
            if ($overdueCount > 0) {
                $startOptions[] = [
                    'id'    => 'overdue',
                    'label' => "Parto dalle {$overdueCount} task in ritardo",
                ];
            }
            foreach (array_slice($projects, 0, 2) as $project) {
                $startOptions[] = [
                    'id'    => 'project_' . $project['id'],
                    'label' => 'Focus su ' . $project['name'],
                ];
            }
            if (!empty($priorityItems[0])) {
                $top = $priorityItems[0];
                $startOptions[] = [
                    'id'    => 'task_' . $top['id'],
                    'label' => 'Parto da: ' . mb_substr($top['title'], 0, 45),
                ];
            }
            $startOptions[] = [
                'id'    => 'flexible',
                'label' => 'Organizza tu, decido man mano',
            ];

            $openTotal = (int) ($ctx['open_tasks_count'] ?? 0);
            $hoursBacklog = round((float) ($stats['total_estimated_hours'] ?? 0), 1);

            $introParts = [];
            if ($overdueCount > 0) {
                $introParts[] = "{$overdueCount} task in ritardo";
            }
            $todayCount = count(array_filter(
                $ctx['today_tasks'] ?? [],
                fn ($t) => ($t['due_date'] ?? null) === $todayStr
            ));
            if ($todayCount > 0) {
                $introParts[] = "{$todayCount} con scadenza oggi";
            }
            if ($openTotal > 0) {
                $introParts[] = "{$openTotal} task aperte in totale";
            }
            if ($hoursBacklog > 0) {
                $introParts[] = "~{$hoursBacklog}h di lavoro stimato";
            }

            $intro = empty($introParts)
                ? 'Non ho trovato task aperte al momento. Possiamo pianificare la giornata comunque.'
                : 'Ecco cosa ho trovato: ' . implode(', ', $introParts) . '.';

            if (!empty($priorityItems)) {
                $topTitles = array_slice(array_map(fn ($i) => $i['title'], $priorityItems), 0, 3);
                $intro .= ' Le priorità principali: ' . implode(' · ', $topTitles) . '.';
            }

            return response()->json([
                'success' => true,
                'data'    => [
                    'greeting'        => $greeting,
                    'intro'           => $intro,
                    'stats'           => [
                        'open_tasks'            => $openTotal,
                        'overdue_tasks'         => $overdueCount,
                        'today_tasks'           => $todayCount,
                        'total_estimated_hours' => $hoursBacklog,
                        'projects_count'        => count($projects),
                    ],
                    'priority_items'  => $priorityItems,
                    'projects'        => $projects,
                    'start_options'   => $startOptions,
                    'default_hours'   => min(8, max(4, (int) ceil($hoursBacklog))),
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Week Plan
    // ─────────────────────────────────────────────────────────────────────────

    public function getWeekPlan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'week_start' => 'required|date',
        ]);

        try {
            $user      = $request->user();
            $weekStart = Carbon::parse($validated['week_start'])->startOfDay();
            $weekEnd   = $weekStart->copy()->addDays(6)->endOfDay();

            $tasks = FocusTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'skipped'])
                ->where(function ($q) use ($weekStart, $weekEnd) {
                    $q->whereBetween('week_plan_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                      ->orWhereBetween('due_date', [$weekStart->toDateString(), $weekEnd->toDateString()]);
                })
                ->with('crmTask.project')
                ->get();

            // Deduplicate by ID (a task can appear via both week_plan_date and due_date)
            $tasks = $tasks->unique('id');

            // Group by day (week_plan_date takes priority over due_date)
            $days = [];
            for ($i = 0; $i < 7; $i++) {
                $date = $weekStart->copy()->addDays($i)->toDateString();
                $days[$date] = [
                    'date'                    => $date,
                    'tasks'                   => [],
                    'total_estimated_minutes' => 0,
                ];
            }

            foreach ($tasks as $task) {
                $planDate = $task->week_plan_date?->toDateString();
                $dueDate  = $task->due_date?->toDateString();
                $date     = ($planDate && isset($days[$planDate]))
                    ? $planDate
                    : (($dueDate && isset($days[$dueDate])) ? $dueDate : null);

                if (!$date) {
                    continue;
                }

                $projectName = $task->crmTask?->project?->name;
                $taskPayload = [
                    'id'                => $task->id,
                    'title'             => $task->title,
                    'description'       => $task->description,
                    'estimated_minutes' => $task->estimated_minutes,
                    'priority_score'    => $task->priority_score,
                    'status'            => $task->status,
                    'due_date'          => $dueDate,
                    'week_plan_date'    => $planDate,
                    'tags'              => $task->tags,
                    'project_name'      => $projectName,
                ];

                $days[$date]['tasks'][] = $taskPayload;
                $days[$date]['total_estimated_minutes'] += (int) ($task->estimated_minutes ?? 0);
            }

            return response()->json([
                'success' => true,
                'data'    => [
                    'week_start' => $weekStart->toDateString(),
                    'week_end'   => $weekEnd->toDateString(),
                    'days'       => array_values($days),
                ],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    public function updateTaskWeekPlan(Request $request, int $taskId): JsonResponse
    {
        $validated = $request->validate([
            'week_plan_date' => 'nullable|date',
        ]);

        try {
            $task = FocusTask::where('user_id', $request->user()->id)->findOrFail($taskId);
            $task->update(['week_plan_date' => $validated['week_plan_date'] ?? null]);

            return response()->json(['success' => true, 'data' => $task->fresh()]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Task non trovata.'], 404);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Projects with Tasks
    // ─────────────────────────────────────────────────────────────────────────

    public function getProjectsWithTasks(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $tasks = FocusTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'skipped'])
                ->with('crmTask.project')
                ->orderByDesc('priority_score')
                ->get();

            $grouped = [];

            foreach ($tasks as $task) {
                $project     = $task->crmTask?->project;
                $projectId   = $project?->id ?? 0;
                $projectName = $project?->name ?? 'Senza progetto';
                $projectColor = '#7C3AED';

                if (!isset($grouped[$projectId])) {
                    $grouped[$projectId] = [
                        'id'          => $projectId ?: null,
                        'name'        => $projectName,
                        'color'       => $projectColor,
                        'tasks_count' => 0,
                        'tasks'       => [],
                    ];
                }

                $grouped[$projectId]['tasks_count']++;
                $grouped[$projectId]['tasks'][] = [
                    'id'                => $task->id,
                    'title'             => $task->title,
                    'description'       => $task->description,
                    'estimated_minutes' => $task->estimated_minutes,
                    'priority'          => $task->priority_score,
                    'status'            => $task->status,
                    'due_date'          => $task->due_date?->toDateString(),
                    'week_plan_date'    => $task->week_plan_date?->toDateString(),
                    'tags'              => $task->tags,
                ];
            }

            // Sort by tasks_count DESC
            usort($grouped, fn($a, $b) => $b['tasks_count'] - $a['tasks_count']);

            return response()->json([
                'success' => true,
                'data'    => ['projects' => array_values($grouped)],
            ]);
        } catch (\Exception $e) {
            return $this->serverError($e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function inferCognitiveLoad(string $title): string
    {
        if (preg_match('/test|qa|verif|check|review/i', $title)) return 'repetitive';
        if (preg_match('/design|ui|ux|graphic|visual|layout|wireframe/i', $title)) return 'creative';
        if (preg_match('/call|meeting|riunione|meet|appuntamento/i', $title)) return 'meetings';
        if (preg_match('/admin|invoice|fattura|report|doc|documentation/i', $title)) return 'admin';
        return 'deep_work';
    }

    private function extractPrefixedLines(string $text, string $prefix): array
    {
        $lines = explode("\n", $text);
        $result = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (stripos($line, $prefix) !== false) {
                $cleaned = trim(str_ireplace($prefix, '', $line));
                if ($cleaned !== '') {
                    $result[] = $cleaned;
                }
            }
        }

        return $result;
    }

    private function serverError(\Exception $e): JsonResponse
    {
        \Illuminate\Support\Facades\Log::error('FocusController error', [
            'message' => $e->getMessage(),
            'trace'   => $e->getTraceAsString(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Si è verificato un errore interno. Riprova tra poco.',
        ], 500);
    }
}
