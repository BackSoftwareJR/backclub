<?php

namespace App\Services;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskAssignment;
use App\Models\FocusAnalysisReport;
use App\Models\TaskMetric;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FocusAnalysisPipelineService
{
    private const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL         = 'llama-3.3-70b-versatile';
    private const REPORT_TTL_H  = 2;
    private const LLM_TIMEOUT_S = 15;

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Ensure a fresh pipeline exists for this user.
     * - If a fresh overview (status=ready, expires_at > now) exists → no-op, return current state.
     * - If a pipeline is already running (pending/analyzing rows exist) → no-op, return current state.
     * - Otherwise → delete stale/old reports and create a fresh pending batch.
     *
     * @return array<int, FocusAnalysisReport>
     */
    public function initializePipeline(User $user): array
    {
        $freshOverview = FocusAnalysisReport::where('user_id', $user->id)
            ->where('report_type', 'overview')
            ->where('status', 'ready')
            ->where('expires_at', '>', now())
            ->first();

        if ($freshOverview) {
            return $this->getReports($user);
        }

        $pipelineRunning = FocusAnalysisReport::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'analyzing'])
            ->exists();

        if ($pipelineRunning) {
            return $this->getReports($user);
        }

        // Delete old reports and build a fresh batch
        FocusAnalysisReport::where('user_id', $user->id)->delete();

        $sortOrder = 0;

        FocusAnalysisReport::create([
            'user_id'      => $user->id,
            'report_type'  => 'overview',
            'subject_id'   => null,
            'subject_name' => 'Overview',
            'status'       => 'pending',
            'sort_order'   => $sortOrder++,
        ]);

        $projects = $this->getActiveProjects($user);

        foreach ($projects as $project) {
            FocusAnalysisReport::create([
                'user_id'      => $user->id,
                'report_type'  => 'project',
                'subject_id'   => $project['id'],
                'subject_name' => $project['name'],
                'status'       => 'pending',
                'sort_order'   => $sortOrder++,
            ]);
        }

        return $this->getReports($user);
    }

    /**
     * Find the first pending report, execute the LLM call, and persist the result.
     * Returns the completed report, or null if nothing is pending.
     */
    public function runNextPendingStep(User $user): ?FocusAnalysisReport
    {
        $report = FocusAnalysisReport::where('user_id', $user->id)
            ->where('status', 'pending')
            ->orderBy('sort_order')
            ->first();

        if (!$report) {
            return null;
        }

        $report->update(['status' => 'analyzing']);

        try {
            match ($report->report_type) {
                'overview'       => $this->runOverviewStep($report, $user),
                'project'        => $this->runProjectStep($report, $user),
                'synthesis'      => $this->runOverviewStep($report, $user),
                'depth_analysis' => $this->runDepthAnalysisStep($report, $user),
                default          => $this->runOverviewStep($report, $user),
            };

            // After each successful completion, schedule the next depth round if applicable
            $this->scheduleNextDepthAnalysis($user);
        } catch (\Exception $e) {
            Log::error('FocusAnalysisPipeline: step failed', [
                'report_id' => $report->id,
                'type'      => $report->report_type,
                'error'     => $e->getMessage(),
            ]);
            $report->update([
                'status'        => 'stale',
                'error_message' => $e->getMessage(),
            ]);
        }

        return $report->fresh();
    }

    /**
     * @return array<int, FocusAnalysisReport>
     */
    public function getReports(User $user): array
    {
        return FocusAnalysisReport::where('user_id', $user->id)
            ->orderBy('sort_order')
            ->get()
            ->all();
    }

    public function invalidateReports(User $user): void
    {
        FocusAnalysisReport::where('user_id', $user->id)
            ->update(['status' => 'stale']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — step execution
    // ─────────────────────────────────────────────────────────────────────────

    private function runOverviewStep(FocusAnalysisReport $report, User $user): void
    {
        $projects = $this->getActiveProjects($user);

        if (empty($projects)) {
            $report->update([
                'status'      => 'ready',
                'content'     => [
                    'priority_ranking'      => [],
                    'total_workload_hours'  => 0,
                    'risk_projects'         => [],
                    'recommendation'        => 'Nessun progetto attivo trovato.',
                ],
                'analyzed_at' => now(),
                'expires_at'  => now()->addHours(self::REPORT_TTL_H),
            ]);
            return;
        }

        $lines = array_map(
            fn($p) => sprintf(
                '"%s": %d task aperte, %d scadute, %.1f ore stimate',
                $p['name'],
                $p['open_tasks'],
                $p['overdue_tasks'],
                $p['estimated_hours']
            ),
            $projects
        );

        $projectList = implode("\n", $lines);

        $prompt = <<<PROMPT
Analizza il carico di lavoro di questo freelancer.
Dati progetti:
{$projectList}

Rispondi SOLO con JSON valido:
{
  "priority_ranking": [{"name":"...","urgency":"high|medium|low","reason":"..."}],
  "total_workload_hours": 0,
  "risk_projects": ["..."],
  "recommendation": "una frase di consiglio generale"
}
PROMPT;

        $content = $this->callGroq($prompt);

        $report->update([
            'status'      => 'ready',
            'content'     => $content ?? ['recommendation' => 'Analisi non disponibile al momento.'],
            'analyzed_at' => now(),
            'expires_at'  => now()->addHours(self::REPORT_TTL_H),
            'error_message' => $content ? null : 'LLM non ha risposto.',
        ]);
    }

    private function runProjectStep(FocusAnalysisReport $report, User $user): void
    {
        if (!$report->subject_id) {
            $report->update([
                'status'        => 'stale',
                'error_message' => 'subject_id mancante per step project.',
            ]);
            return;
        }

        $today = Carbon::today();

        $tasks = CrmProjectTask::where('crm_project_id', $report->subject_id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->orderBy('due_date')
            ->limit(20)
            ->get(['title', 'due_date', 'priority', 'estimated_hours']);

        if ($tasks->isEmpty()) {
            $report->update([
                'status'      => 'ready',
                'content'     => [
                    'risk_level'               => 'low',
                    'bottleneck'               => null,
                    'top_3_next_tasks'         => [],
                    'estimated_completion_days' => 0,
                    'notes'                    => 'Nessuna task aperta in questo progetto.',
                ],
                'analyzed_at' => now(),
                'expires_at'  => now()->addHours(self::REPORT_TTL_H),
            ]);
            return;
        }

        $taskLines = $tasks->map(function ($t) use ($today) {
            $due = $t->due_date
                ? ($t->due_date->lt($today) ? '⚠️ scaduta il ' . $t->due_date->toDateString() : 'scadenza ' . $t->due_date->toDateString())
                : 'nessuna scadenza';
            $prio = $t->priority ? "priorità {$t->priority}" : '';
            return "- {$t->title} [{$due}] {$prio}";
        })->implode("\n");

        $userName = $user->name ?? 'il freelancer';

        $prompt = <<<PROMPT
Analizza questo progetto per il freelancer {$userName}.
Progetto: {$report->subject_name}
Task aperte:
{$taskLines}

Rispondi SOLO con JSON valido:
{
  "risk_level": "high|medium|low",
  "bottleneck": "descrizione breve o null",
  "top_3_next_tasks": ["titolo1","titolo2","titolo3"],
  "estimated_completion_days": 0,
  "notes": "osservazione breve"
}
PROMPT;

        $content = $this->callGroq($prompt);

        $report->update([
            'status'        => 'ready',
            'content'       => $content ?? ['notes' => 'Analisi non disponibile al momento.'],
            'analyzed_at'   => now(),
            'expires_at'    => now()->addHours(self::REPORT_TTL_H),
            'error_message' => $content ? null : 'LLM non ha risposto.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — Groq HTTP call
    // ─────────────────────────────────────────────────────────────────────────

    private function callGroq(string $prompt): ?array
    {
        $apiKey = config('services.groq.api_key');

        if (empty($apiKey)) {
            Log::warning('FocusAnalysisPipeline: no GROQ API key configured.');
            return null;
        }

        $response = Http::timeout(self::LLM_TIMEOUT_S)
            ->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])
            ->post(self::GROQ_API_URL, [
                'model'           => self::MODEL,
                'messages'        => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature'     => 0.3,
                'max_tokens'      => 512,
                'response_format' => ['type' => 'json_object'],
            ]);

        if ($response->failed()) {
            Log::warning('FocusAnalysisPipeline: Groq API error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return null;
        }

        $rawContent = $response->json('choices.0.message.content');

        if (empty($rawContent)) {
            return null;
        }

        $decoded = json_decode($rawContent, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('FocusAnalysisPipeline: invalid JSON from LLM', ['raw' => $rawContent]);
            return null;
        }

        return $decoded;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — depth analysis rounds
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Schedule the next depth analysis round if all base reports are ready
     * and the maximum number of depth rounds has not been reached.
     */
    private function scheduleNextDepthAnalysis(User $user): void
    {
        // Only proceed when all base (overview + project) reports are ready
        $basePending = FocusAnalysisReport::where('user_id', $user->id)
            ->whereIn('report_type', ['overview', 'project'])
            ->whereIn('status', ['pending', 'analyzing'])
            ->exists();

        if ($basePending) {
            return;
        }

        // Do not schedule a new depth round if one is already pending/running
        $depthPending = FocusAnalysisReport::where('user_id', $user->id)
            ->where('report_type', 'depth_analysis')
            ->whereIn('status', ['pending', 'analyzing'])
            ->exists();

        if ($depthPending) {
            return;
        }

        // Count completed depth rounds (ready or stale counts — we track by round)
        $depthCompleted = FocusAnalysisReport::where('user_id', $user->id)
            ->where('report_type', 'depth_analysis')
            ->whereNotIn('status', ['pending', 'analyzing'])
            ->count();

        $nextRound = $depthCompleted + 1;

        $roundConfig = $this->getDepthRoundConfig($nextRound);
        if (!$roundConfig) {
            return; // All rounds exhausted
        }

        $maxSortOrder = (int) FocusAnalysisReport::where('user_id', $user->id)->max('sort_order');

        FocusAnalysisReport::create([
            'user_id'      => $user->id,
            'report_type'  => 'depth_analysis',
            'subject_id'   => null,
            'subject_name' => $roundConfig['name'],
            'status'       => 'pending',
            'sort_order'   => $maxSortOrder + 1,
        ]);
    }

    /**
     * @return array{name: string, round: int}|null
     */
    private function getDepthRoundConfig(int $round): ?array
    {
        return match ($round) {
            1 => ['name' => 'Analisi cross-progetto',  'round' => 1],
            2 => ['name' => 'Calibrazione stime',      'round' => 2],
            3 => ['name' => 'Capacità settimanale',    'round' => 3],
            default => null,
        };
    }

    private function runDepthAnalysisStep(FocusAnalysisReport $report, User $user): void
    {
        match ($report->subject_name) {
            'Analisi cross-progetto' => $this->runCrossProjectAnalysis($report, $user),
            'Calibrazione stime'     => $this->runTimeCalibrationAnalysis($report, $user),
            'Capacità settimanale'   => $this->runWeeklyCapacityAnalysis($report, $user),
            default                  => $this->runCrossProjectAnalysis($report, $user),
        };
    }

    private function runCrossProjectAnalysis(FocusAnalysisReport $report, User $user): void
    {
        $readyReports = FocusAnalysisReport::where('user_id', $user->id)
            ->where('status', 'ready')
            ->whereIn('report_type', ['overview', 'project'])
            ->get();

        if ($readyReports->isEmpty()) {
            $report->update([
                'status'        => 'stale',
                'error_message' => 'Nessun report base disponibile per l\'analisi cross-progetto.',
            ]);
            return;
        }

        $summaryLines = $readyReports->map(function ($r) {
            $content = $r->content ?? [];
            if ($r->report_type === 'overview') {
                return "Overview: " . ($content['recommendation'] ?? 'N/A');
            }
            return "Progetto {$r->subject_name}: rischio=" . ($content['risk_level'] ?? 'n/a')
                . ", top task: " . implode(', ', $content['top_3_next_tasks'] ?? []);
        })->implode("\n");

        $userName = $user->name ?? 'il freelancer';

        $prompt = <<<PROMPT
Analizza le dipendenze e conflitti tra questi progetti per {$userName}.
Riepilogo progetti:
{$summaryLines}

Quali task di progetti diversi potrebbero bloccarsi a vicenda? Quali risorse (tempo/competenze) sono condivise?
Rispondi SOLO con JSON valido:
{
  "conflicts": ["descrizione conflitto 1", "..."],
  "bottlenecks": ["collo di bottiglia 1", "..."],
  "weekly_capacity_hours": 40,
  "priority_order": ["NomeProgetto1", "NomeProgetto2"]
}
PROMPT;

        $content = $this->callGroq($prompt);

        $report->update([
            'status'        => 'ready',
            'content'       => $content ?? ['conflicts' => [], 'bottlenecks' => [], 'weekly_capacity_hours' => 0, 'priority_order' => []],
            'analyzed_at'   => now(),
            'expires_at'    => now()->addHours(self::REPORT_TTL_H),
            'error_message' => $content ? null : 'LLM non ha risposto.',
        ]);
    }

    private function runTimeCalibrationAnalysis(FocusAnalysisReport $report, User $user): void
    {
        $metrics = TaskMetric::where('user_id', $user->id)
            ->latest()
            ->limit(20)
            ->get(['title_snapshot', 'estimated_minutes', 'actual_minutes', 'accuracy_ratio']);

        if ($metrics->isEmpty()) {
            $report->update([
                'status'      => 'ready',
                'content'     => [
                    'calibrations' => [],
                    'accuracy_note' => 'Nessuna metrica disponibile. Completa alcune task per calibrare le stime.',
                ],
                'analyzed_at' => now(),
                'expires_at'  => now()->addHours(self::REPORT_TTL_H),
            ]);
            return;
        }

        $metricLines = $metrics->map(function ($m) {
            $est  = $m->estimated_minutes ?? 0;
            $act  = $m->actual_minutes ?? 0;
            $acc  = $m->accuracy_ratio  ?? 1.0;
            return sprintf('"%s": stimato %dmin, effettivo %dmin, accuratezza %.2f', $m->title_snapshot, $est, $act, $acc);
        })->implode("\n");

        $prompt = <<<PROMPT
Basandoti su questi task completati in passato, calibra le stime per task future simili.
Raggruppa i task per tipo/titolo simile:
{$metricLines}

Rispondi SOLO con JSON valido:
{
  "calibrations": [{"pattern": "nome tipo task", "avg_hours": 2.5, "typical_range": "1-4h"}],
  "accuracy_note": "commento breve sull'accuratezza generale delle stime"
}
PROMPT;

        $content = $this->callGroq($prompt);

        $report->update([
            'status'        => 'ready',
            'content'       => $content ?? ['calibrations' => [], 'accuracy_note' => 'Analisi non disponibile.'],
            'analyzed_at'   => now(),
            'expires_at'    => now()->addHours(self::REPORT_TTL_H),
            'error_message' => $content ? null : 'LLM non ha risposto.',
        ]);
    }

    private function runWeeklyCapacityAnalysis(FocusAnalysisReport $report, User $user): void
    {
        $projects = $this->getActiveProjects($user);

        $totalHours = array_sum(array_column($projects, 'estimated_hours'));
        $projectSummary = array_map(
            fn($p) => sprintf('"%s": %.1fh stimate, %d task aperte', $p['name'], $p['estimated_hours'], $p['open_tasks']),
            $projects
        );
        $projectList = implode("\n", $projectSummary);

        $userName = $user->name ?? 'il freelancer';

        $prompt = <<<PROMPT
Analizza la capacità settimanale di lavoro per {$userName}.
Totale ore di lavoro stimate nel backlog: {$totalHours}h
Dettaglio progetti:
{$projectList}

Ipotizza una settimana lavorativa standard di 40h.
Rispondi SOLO con JSON valido:
{
  "weeks_to_complete": 2.5,
  "recommended_weekly_distribution": [{"project": "NomeProgetto", "hours_per_week": 20}],
  "burnout_risk": "low|medium|high",
  "suggestion": "consiglio breve sulla gestione del carico"
}
PROMPT;

        $content = $this->callGroq($prompt);

        $report->update([
            'status'        => 'ready',
            'content'       => $content ?? [
                'weeks_to_complete' => 0,
                'recommended_weekly_distribution' => [],
                'burnout_risk' => 'low',
                'suggestion' => 'Analisi non disponibile.',
            ],
            'analyzed_at'   => now(),
            'expires_at'    => now()->addHours(self::REPORT_TTL_H),
            'error_message' => $content ? null : 'LLM non ha risposto.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — project collection (same pattern as FocusDataAggregatorService)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns active CRM projects for this user (assigned tasks + managed).
     *
     * @return array<int, array{id: int, name: string, open_tasks: int, overdue_tasks: int, estimated_hours: float}>
     */
    private function getActiveProjects(User $user): array
    {
        $projects = [];
        $today    = Carbon::today();

        try {
            // Projects where user has assigned tasks
            $assignedTaskIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            if ($assignedTaskIds->isNotEmpty()) {
                $crmTasks = CrmProjectTask::whereIn('id', $assignedTaskIds)
                    ->with('project:id,name,status')
                    ->get();

                foreach ($crmTasks->groupBy('crm_project_id') as $projectId => $taskGroup) {
                    $project = $taskGroup->first()?->project;
                    if (!$project) {
                        continue;
                    }

                    $open    = $taskGroup->whereNotIn('status', ['completed', 'cancelled']);
                    $overdue = $open->filter(fn($t) => $t->due_date && $t->due_date->lt($today));

                    $projects[$projectId] = [
                        'id'              => (int) $projectId,
                        'name'            => $project->name,
                        'open_tasks'      => $open->count(),
                        'overdue_tasks'   => $overdue->count(),
                        'estimated_hours' => round((float) $open->sum(fn($t) => $t->estimated_hours ?? 0), 1),
                    ];
                }
            }

            // Projects where user is manager (active only)
            $managedProjects = CrmProject::where('manager_id', $user->id)
                ->where('status', 'active')
                ->with(['tasks' => fn($q) => $q->whereNotIn('status', ['completed', 'cancelled'])])
                ->get();

            foreach ($managedProjects as $project) {
                if (isset($projects[$project->id])) {
                    continue;
                }

                $open    = $project->tasks;
                $overdue = $open->filter(fn($t) => $t->due_date && $t->due_date->lt($today));

                $projects[$project->id] = [
                    'id'              => $project->id,
                    'name'            => $project->name,
                    'open_tasks'      => $open->count(),
                    'overdue_tasks'   => $overdue->count(),
                    'estimated_hours' => round((float) $open->sum(fn($t) => $t->estimated_hours ?? 0), 1),
                ];
            }
        } catch (\Exception $e) {
            Log::warning('FocusAnalysisPipeline: could not collect projects', ['error' => $e->getMessage()]);
        }

        return array_values($projects);
    }
}
