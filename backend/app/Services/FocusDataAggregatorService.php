<?php

namespace App\Services;

use App\Models\CrmProject;
use App\Models\CrmProjectTaskAssignment;
use App\Models\CrmProjectTask;
use App\Models\FocusTask;
use App\Models\TaskMetric;
use App\Models\UserFocusPreference;
use App\Models\UserWorkPattern;
use App\Models\WorkspaceUserTask;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class FocusDataAggregatorService
{
    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    public function getUserFullContext(User $user): array
    {
        $today     = Carbon::today();
        $weekStart = $today->copy()->startOfWeek(Carbon::MONDAY);
        $weekEnd   = $today->copy()->endOfWeek(Carbon::SUNDAY);

        return [
            'user'                  => $this->buildUserInfo($user),
            'today_tasks'           => $this->collectTasksByDate($user, $today, $today),
            'week_tasks'            => $this->collectTasksByDate($user, $weekStart, $weekEnd),
            'overdue_tasks'         => $this->collectOverdueTasks($user, $today),
            'all_open_tasks'        => $this->collectAllOpenTasks($user),
            'tasks_without_date'    => $this->collectTasksWithoutDate($user),
            'projects_detail'       => $this->collectProjectsWithDetail($user, $today),
            'backlog_stats'         => $this->collectBacklogStats($user, $today),
            'work_patterns'         => $this->collectWorkPatterns($user),
            'task_metrics_summary'  => $this->collectMetricsSummary($user),
            'open_tasks_count'      => $this->countOpenTasks($user),
            'completed_today_count' => $this->countCompletedToday($user),
        ];
    }

    public function getUserWorkPreferences(User $user): array
    {
        try {
            $pref = UserFocusPreference::where('user_id', $user->id)->first();

            if ($pref) {
                return [
                    'preferred_start'               => $pref->preferred_start_time,
                    'preferred_end'                 => $pref->preferred_end_time,
                    'max_daily_hours'               => $pref->max_daily_hours,
                    'lunch_break'                   => $pref->lunch_break_enabled,
                    'lunch_start'                   => $pref->lunch_start_time,
                    'lunch_duration_minutes'        => $pref->lunch_duration_minutes,
                    'focus_block_duration'          => $pref->preferred_focus_block_duration,
                    'break_between_focus_blocks'    => $pref->break_between_focus_blocks,
                    'working_days'                  => $pref->working_days,
                    'preferred_cognitive_morning'   => $pref->preferred_cognitive_morning,
                    'preferred_cognitive_afternoon' => $pref->preferred_cognitive_afternoon,
                    'rest_reminder_enabled'         => $pref->rest_reminder_enabled,
                    'notes'                         => $pref->notes,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: UserFocusPreference not available', ['error' => $e->getMessage()]);
        }

        return [
            'preferred_start'               => '09:00',
            'preferred_end'                 => '18:00',
            'max_daily_hours'               => 8,
            'lunch_break'                   => true,
            'lunch_start'                   => '13:00',
            'lunch_duration_minutes'        => 60,
            'focus_block_duration'          => 90,
            'break_between_focus_blocks'    => 15,
            'working_days'                  => [1, 2, 3, 4, 5],
            'preferred_cognitive_morning'   => 'deep_work',
            'preferred_cognitive_afternoon' => 'repetitive',
            'rest_reminder_enabled'         => true,
            'notes'                         => null,
        ];
    }

    public function buildAssistantSystemPrompt(User $user): string
    {
        $context = $this->getUserFullContext($user);
        $prefs   = $this->getUserWorkPreferences($user);

        $name  = $user->name ?? 'il freelancer';
        $today = Carbon::today()->translatedFormat('l d F Y');

        // ── Build PM role section ─────────────────────────────────────────────
        $roleSummary = '';
        $managedProjectNames  = [];
        $assignedProjectNames = [];
        foreach ($context['projects_detail'] ?? [] as $proj) {
            if (!empty($proj['is_manager'])) {
                $managedProjectNames[]  = $proj['name'];
            } else {
                $assignedProjectNames[] = $proj['name'];
            }
        }
        if (!empty($managedProjectNames)) {
            $roleSummary .= "\n## Ruolo\n";
            $roleSummary .= "{$name} è Project Manager dei seguenti progetti: " . implode(', ', $managedProjectNames) . "\n";
            if (!empty($assignedProjectNames)) {
                $roleSummary .= "Ha anche task assegnate direttamente come esecutore in: " . implode(', ', $assignedProjectNames) . "\n";
            }
        }

        // ── Build structured project summary (human-readable for LLM) ─────────
        $projectSummary = '';
        if (!empty($context['projects_detail'])) {
            $projectSummary = "\n## Progetti attivi con dettaglio task\n";
            foreach ($context['projects_detail'] as $proj) {
                $projectSummary .= sprintf(
                    "\n### Progetto \"%s\" [%s]\n" .
                    "  Task aperte: %d | Scadute: %d | Completate questo mese: %d\n" .
                    "  Ore stimate backlog: %.1f h\n",
                    $proj['name'],
                    $proj['status'] ?? 'N/A',
                    $proj['open_tasks'],
                    $proj['overdue_tasks'],
                    $proj['completed_this_month'],
                    $proj['estimated_hours_backlog'] ?? 0
                );
                if (!empty($proj['open_task_titles'])) {
                    // Limit to 3 titles per project to keep prompt compact
                    $titles = array_slice($proj['open_task_titles'], 0, 3);
                    foreach ($titles as $title) {
                        $projectSummary .= "  - {$title}\n";
                    }
                    if (count($proj['open_task_titles']) > 3) {
                        $extra = count($proj['open_task_titles']) - 3;
                        $projectSummary .= "  ... e altri {$extra} task\n";
                    }
                }
            }
        }

        // ── Build backlog stats summary ────────────────────────────────────────
        $stats   = $context['backlog_stats'] ?? [];
        $backlogSummary = sprintf(
            "\n## Statistiche backlog\n" .
            "  Task aperte totali: %d (CRM: %d | WS: %d | Focus: %d)\n" .
            "  Task scadute: %d | Task senza data: %d\n" .
            "  Ore stimate totali backlog: %.1f h\n",
            ($stats['open_crm'] ?? 0) + ($stats['open_ws'] ?? 0) + ($stats['open_focus'] ?? 0),
            $stats['open_crm'] ?? 0,
            $stats['open_ws'] ?? 0,
            $stats['open_focus'] ?? 0,
            $stats['overdue_total'] ?? 0,
            $stats['no_date_total'] ?? 0,
            $stats['total_estimated_hours'] ?? 0
        );

        // ── Build tasks-without-date section (count only to keep prompt compact) ─
        $noDateSummary = '';
        $noDateCount = count($context['tasks_without_date'] ?? []);
        if ($noDateCount > 0) {
            $noDateSummary = "\n## Task senza data assegnata\n";
            $noDateSummary .= "  Totale: {$noDateCount} task senza scadenza\n";
            // Show only first 5 titles as examples
            $examples = array_slice($context['tasks_without_date'], 0, 5);
            foreach ($examples as $t) {
                $noDateSummary .= "  [{$t['source']}] {$t['title']}\n";
            }
            if ($noDateCount > 5) {
                $noDateSummary .= "  ... e altre " . ($noDateCount - 5) . " task\n";
            }
        }

        // ── JSON blob — compact: only today + overdue (max 15 each) ─────────────
        $contextJson = json_encode(
            [
                'today_tasks'          => array_slice($context['today_tasks'] ?? [], 0, 15),
                'overdue_tasks'        => array_slice($context['overdue_tasks'] ?? [], 0, 10),
                'work_patterns'        => $context['work_patterns'],
                'task_metrics_summary' => $context['task_metrics_summary'],
                'open_tasks_count'     => $context['open_tasks_count'],
                'completed_today'      => $context['completed_today_count'],
                'work_preferences'     => $prefs,
            ],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        $prompt = <<<PROMPT
Sei l'assistente Focus personale di {$name}. Oggi è {$today}.
Hai accesso completo a tutto il suo lavoro e lo aiuti a organizzare giornate produttive.
{$roleSummary}{$projectSummary}{$backlogSummary}{$noDateSummary}
## Contesto strutturato (JSON)
{$contextJson}

## Come comportarti
- Rispondi SEMPRE in italiano, in modo conciso ma completo
- Proponi azioni concrete e specifiche basate sui dati reali
- Quando menzioni task, usa i titoli reali dal contesto
- Per "quante ore ho di backlog" usa backlog_stats.total_estimated_hours
- Per "progetto più in ritardo" usa la sezione progetti con il maggior numero di overdue_tasks
- Per "task senza scadenza" usa la sezione Task senza data assegnata
- Per organizzare la settimana usa week_tasks e work_preferences
- Suggerisci pause quando il carico è alto
- Sei diretto, pratico, amichevole — non verboso

## Capacità
- Organizzare e ottimizzare la giornata/settimana lavorativa
- Analizzare il carico di lavoro e suggerire redistribuzioni
- Rispondere a domande specifiche su task, progetti, scadenze
- Calcolare statistiche di produttività dai dati storici
- Identificare task urgenti e task senza data
- Rispondere a qualsiasi domanda sul lavoro del freelancer
PROMPT;

        // Hard cap: keep prompt under 6000 chars to avoid HTTP 413 on Groq
        if (strlen($prompt) > 6000) {
            $prompt = substr($prompt, 0, 6000) . "\n\n[Contesto compresso per limiti tecnici]";
        }

        return $prompt;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers — task collection
    // ─────────────────────────────────────────────────────────────────────────

    private function buildUserInfo(User $user): array
    {
        return [
            'name' => $user->name,
            'id'   => $user->id,
        ];
    }

    /**
     * Collect tasks filtered by date range (for today_tasks / week_tasks LLM context).
     * Tasks without a due_date are always included.
     * If total > 30, slim the payload to avoid LLM context overflow.
     */
    private function collectTasksByDate(User $user, Carbon $from, Carbon $to): array
    {
        $tasks = [];

        // Focus tasks
        try {
            $focusTasks = FocusTask::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->where(function ($q) use ($from, $to) {
                    $q->whereBetween('due_date', [$from->toDateString(), $to->toDateString()])
                      ->orWhereNull('due_date');
                })
                ->get();

            foreach ($focusTasks as $t) {
                $tasks[] = [
                    'id'                => $t->id,
                    'source'            => 'focus',
                    'title'             => $t->title,
                    'due_date'          => $t->due_date?->toDateString(),
                    'status'            => $t->status,
                    'estimated_minutes' => $t->estimated_minutes,
                    'cognitive_load'    => $t->cognitive_load?->value ?? $t->cognitive_load,
                    'priority_score'    => $t->priority_score,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: focus_tasks unavailable', ['error' => $e->getMessage()]);
        }

        // CRM tasks — assigned as executor + PM of project
        try {
            $assignedTaskIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            $managedProjectIds = CrmProject::where('manager_id', $user->id)->pluck('id');
            $managedTaskIds    = CrmProjectTask::whereIn('crm_project_id', $managedProjectIds)->pluck('id');
            $managedOnlyIds    = $managedTaskIds->diff($assignedTaskIds)->unique();
            $allTaskIds        = $assignedTaskIds->merge($managedTaskIds)->unique();

            if ($allTaskIds->isNotEmpty()) {
                $crmTasks = CrmProjectTask::whereIn('id', $allTaskIds)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->where(function ($q) use ($from, $to) {
                        $q->whereBetween('due_date', [$from->toDateString(), $to->toDateString()])
                          ->orWhereNull('due_date');
                    })
                    ->with('project:id,name')
                    ->get();

                foreach ($crmTasks as $t) {
                    $tasks[] = [
                        'id'              => $t->id,
                        'source'          => $managedOnlyIds->contains($t->id) ? 'crm_pm' : 'crm',
                        'title'           => $t->title,
                        'due_date'        => $t->due_date?->toDateString(),
                        'status'          => $t->status,
                        'estimated_hours' => $t->estimated_hours,
                        'priority'        => $t->priority,
                        'project'         => $t->project?->name,
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: crm_tasks unavailable', ['error' => $e->getMessage()]);
        }

        // Workspace tasks
        try {
            $wsTasks = WorkspaceUserTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'done'])
                ->where(function ($q) use ($from, $to) {
                    $q->whereBetween('due_date', [$from->toDateString(), $to->toDateString()])
                      ->orWhereNull('due_date');
                })
                ->with('project:id,name')
                ->get();

            foreach ($wsTasks as $t) {
                $tasks[] = [
                    'id'       => $t->id,
                    'source'   => 'workspace',
                    'title'    => $t->title,
                    'due_date' => $t->due_date?->toDateString(),
                    'status'   => $t->status,
                    'priority' => $t->priority,
                    'project'  => $t->project?->name,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: workspace_tasks unavailable', ['error' => $e->getMessage()]);
        }

        // Slim payload for LLM if many tasks
        if (count($tasks) > 30) {
            $tasks = array_map(fn($t) => [
                'id'       => $t['id'] ?? null,
                'source'   => $t['source'],
                'title'    => $t['title'],
                'due_date' => $t['due_date'] ?? null,
                'priority' => $t['priority'] ?? $t['priority_score'] ?? null,
            ], $tasks);
        }

        return $tasks;
    }

    /**
     * All open tasks across every source, no date filter.
     * Used in LLM context for backlog-level queries.
     */
    private function collectAllOpenTasks(User $user): array
    {
        $tasks = [];

        try {
            $focusTasks = FocusTask::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->get();

            foreach ($focusTasks as $t) {
                $tasks[] = [
                    'id'             => $t->id,
                    'source'         => 'focus',
                    'title'          => $t->title,
                    'due_date'       => $t->due_date?->toDateString(),
                    'priority_score' => $t->priority_score,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: all focus tasks unavailable', ['error' => $e->getMessage()]);
        }

        try {
            $assignedTaskIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            $managedProjectIds = CrmProject::where('manager_id', $user->id)->pluck('id');
            $managedTaskIds    = CrmProjectTask::whereIn('crm_project_id', $managedProjectIds)->pluck('id');
            $managedOnlyIds    = $managedTaskIds->diff($assignedTaskIds)->unique();
            $allTaskIds        = $assignedTaskIds->merge($managedTaskIds)->unique();

            if ($allTaskIds->isNotEmpty()) {
                $crmTasks = CrmProjectTask::whereIn('id', $allTaskIds)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->with('project:id,name')
                    ->get();

                foreach ($crmTasks as $t) {
                    $tasks[] = [
                        'id'       => $t->id,
                        'source'   => $managedOnlyIds->contains($t->id) ? 'crm_pm' : 'crm',
                        'title'    => $t->title,
                        'due_date' => $t->due_date?->toDateString(),
                        'priority' => $t->priority,
                        'project'  => $t->project?->name,
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: all crm tasks unavailable', ['error' => $e->getMessage()]);
        }

        try {
            $wsTasks = WorkspaceUserTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'done'])
                ->with('project:id,name')
                ->get();

            foreach ($wsTasks as $t) {
                $tasks[] = [
                    'id'       => $t->id,
                    'source'   => 'workspace',
                    'title'    => $t->title,
                    'due_date' => $t->due_date?->toDateString(),
                    'priority' => $t->priority,
                    'project'  => $t->project?->name,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: all workspace tasks unavailable', ['error' => $e->getMessage()]);
        }

        return $tasks;
    }

    /**
     * Tasks that have no due_date assigned, across all sources.
     */
    private function collectTasksWithoutDate(User $user): array
    {
        $tasks = [];

        try {
            $focusTasks = FocusTask::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->whereNull('due_date')
                ->get();

            foreach ($focusTasks as $t) {
                $tasks[] = ['source' => 'focus', 'title' => $t->title, 'id' => $t->id];
            }
        } catch (\Exception $e) { /* table not available */ }

        try {
            $assignedTaskIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            $managedProjectIds = CrmProject::where('manager_id', $user->id)->pluck('id');
            $managedTaskIds    = CrmProjectTask::whereIn('crm_project_id', $managedProjectIds)->pluck('id');
            $managedOnlyIds    = $managedTaskIds->diff($assignedTaskIds)->unique();
            $allTaskIds        = $assignedTaskIds->merge($managedTaskIds)->unique();

            if ($allTaskIds->isNotEmpty()) {
                $crmTasks = CrmProjectTask::whereIn('id', $allTaskIds)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->whereNull('due_date')
                    ->with('project:id,name')
                    ->get();

                foreach ($crmTasks as $t) {
                    $tasks[] = [
                        'source'  => $managedOnlyIds->contains($t->id) ? 'crm_pm' : 'crm',
                        'title'   => $t->title,
                        'id'      => $t->id,
                        'project' => $t->project?->name,
                    ];
                }
            }
        } catch (\Exception $e) { /* table not available */ }

        try {
            $wsTasks = WorkspaceUserTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'done'])
                ->whereNull('due_date')
                ->get();

            foreach ($wsTasks as $t) {
                $tasks[] = ['source' => 'workspace', 'title' => $t->title, 'id' => $t->id];
            }
        } catch (\Exception $e) { /* table not available */ }

        return $tasks;
    }

    /**
     * Rich per-project data: open/overdue/completed counts, open task titles (max 10 in LLM text),
     * estimated hours backlog.
     */
    private function collectProjectsWithDetail(User $user, Carbon $today): array
    {
        $projects = [];

        try {
            // CRM projects the user has tasks assigned to
            $crmTaskIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            if ($crmTaskIds->isNotEmpty()) {
                $crmTasks = CrmProjectTask::whereIn('id', $crmTaskIds)
                    ->with('project:id,name,status,end_date')
                    ->get();

                $byProject = $crmTasks->groupBy('crm_project_id');

                foreach ($byProject as $projectId => $taskGroup) {
                    $project = $taskGroup->first()->project;
                    if (!$project) {
                        continue;
                    }

                    $openTasks = $taskGroup->whereNotIn('status', ['completed', 'cancelled']);

                    $overdueTasks = $openTasks->filter(
                        fn($t) => $t->due_date && $t->due_date->lt($today)
                    );

                    $completedThisMonth = $taskGroup->filter(function ($t) use ($today) {
                        return $t->status === 'completed'
                            && $t->completed_date
                            && $t->completed_date->month === $today->month
                            && $t->completed_date->year === $today->year;
                    });

                    $estimatedHours = $openTasks->sum(fn($t) => (float) ($t->estimated_hours ?? 0));

                    $projects[$projectId] = [
                        'id'                    => $projectId,
                        'name'                  => $project->name,
                        'status'                => $project->status,
                        'end_date'              => $project->end_date?->toDateString(),
                        'open_tasks'            => $openTasks->count(),
                        'overdue_tasks'         => $overdueTasks->count(),
                        'completed_this_month'  => $completedThisMonth->count(),
                        'estimated_hours_backlog' => round($estimatedHours, 1),
                        'open_task_titles'      => $openTasks->pluck('title')->values()->toArray(),
                        'source'                => 'crm',
                    ];
                }
            }

            // CRM projects where user is manager
            $managedProjects = CrmProject::where('manager_id', $user->id)
                ->where('status', 'active')
                ->with('tasks')
                ->get();

            foreach ($managedProjects as $project) {
                if (isset($projects[$project->id])) {
                    $projects[$project->id]['is_manager'] = true;
                    continue;
                }

                $openTasks = $project->tasks->whereNotIn('status', ['completed', 'cancelled']);
                $overdueTasks = $openTasks->filter(
                    fn($t) => $t->due_date && $t->due_date->lt($today)
                );
                $completedThisMonth = $project->tasks->filter(function ($t) use ($today) {
                    return $t->status === 'completed'
                        && $t->completed_date
                        && $t->completed_date->month === $today->month
                        && $t->completed_date->year === $today->year;
                });
                $estimatedHours = $openTasks->sum(fn($t) => (float) ($t->estimated_hours ?? 0));

                $projects[$project->id] = [
                    'id'                    => $project->id,
                    'name'                  => $project->name,
                    'status'                => $project->status,
                    'end_date'              => $project->end_date?->toDateString(),
                    'open_tasks'            => $openTasks->count(),
                    'overdue_tasks'         => $overdueTasks->count(),
                    'completed_this_month'  => $completedThisMonth->count(),
                    'estimated_hours_backlog' => round($estimatedHours, 1),
                    'open_task_titles'      => $openTasks->pluck('title')->values()->toArray(),
                    'source'                => 'crm',
                    'is_manager'            => true,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: projects detail unavailable', ['error' => $e->getMessage()]);
        }

        return array_values($projects);
    }

    /**
     * Aggregate backlog statistics: counts by source, overdue, no-date, total estimated hours.
     */
    private function collectBacklogStats(User $user, Carbon $today): array
    {
        $openFocus  = 0;
        $openCrm    = 0;
        $openWs     = 0;
        $overdue    = 0;
        $noDate     = 0;
        $totalHours = 0.0;

        try {
            $focusTasks = FocusTask::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->get(['id', 'due_date', 'estimated_minutes']);

            $openFocus = $focusTasks->count();
            $noDate   += $focusTasks->whereNull('due_date')->count();
            $overdue  += $focusTasks->filter(fn($t) => $t->due_date && $t->due_date->lt($today))->count();
            $totalHours += $focusTasks->sum(fn($t) => ($t->estimated_minutes ?? 0) / 60);
        } catch (\Exception $e) { /* not available */ }

        try {
            $assignedTaskIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            $managedProjectIds = CrmProject::where('manager_id', $user->id)->pluck('id');
            $managedTaskIds    = CrmProjectTask::whereIn('crm_project_id', $managedProjectIds)->pluck('id');
            $allTaskIds        = $assignedTaskIds->merge($managedTaskIds)->unique();

            if ($allTaskIds->isNotEmpty()) {
                $crmTasks = CrmProjectTask::whereIn('id', $allTaskIds)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->get(['id', 'due_date', 'estimated_hours']);

                $openCrm  = $crmTasks->count();
                $noDate  += $crmTasks->whereNull('due_date')->count();
                $overdue += $crmTasks->filter(fn($t) => $t->due_date && $t->due_date->lt($today))->count();
                $totalHours += $crmTasks->sum(fn($t) => (float) ($t->estimated_hours ?? 0));
            }
        } catch (\Exception $e) { /* not available */ }

        try {
            $wsTasks = WorkspaceUserTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'done'])
                ->get(['id', 'due_date']);

            $openWs  = $wsTasks->count();
            $noDate += $wsTasks->whereNull('due_date')->count();
            $overdue += $wsTasks->filter(fn($t) => $t->due_date && Carbon::parse($t->due_date)->lt($today))->count();
            $totalHours += $openWs * 1.0; // default 1h per ws task if no estimate
        } catch (\Exception $e) { /* not available */ }

        return [
            'open_focus'            => $openFocus,
            'open_crm'              => $openCrm,
            'open_ws'               => $openWs,
            'overdue_total'         => $overdue,
            'no_date_total'         => $noDate,
            'total_estimated_hours' => round($totalHours, 1),
        ];
    }

    private function collectOverdueTasks(User $user, Carbon $today): array
    {
        $overdue = [];

        try {
            $focusOverdue = FocusTask::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->where('due_date', '<', $today->toDateString())
                ->whereNotNull('due_date')
                ->get();

            foreach ($focusOverdue as $t) {
                $overdue[] = [
                    'source'    => 'focus',
                    'title'     => $t->title,
                    'due_date'  => $t->due_date?->toDateString(),
                    'days_late' => max(1, $t->due_date->copy()->startOfDay()->diffInDays($today->copy()->startOfDay())),
                ];
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: overdue focus tasks unavailable', ['error' => $e->getMessage()]);
        }

        try {
            $assignedTaskIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            $managedProjectIds = CrmProject::where('manager_id', $user->id)->pluck('id');
            $managedTaskIds    = CrmProjectTask::whereIn('crm_project_id', $managedProjectIds)->pluck('id');
            $managedOnlyIds    = $managedTaskIds->diff($assignedTaskIds)->unique();
            $allTaskIds        = $assignedTaskIds->merge($managedTaskIds)->unique();

            if ($allTaskIds->isNotEmpty()) {
                $crmOverdue = CrmProjectTask::whereIn('id', $allTaskIds)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->where('due_date', '<', $today->toDateString())
                    ->whereNotNull('due_date')
                    ->with('project:id,name')
                    ->get();

                foreach ($crmOverdue as $t) {
                    $overdue[] = [
                        'source'    => $managedOnlyIds->contains($t->id) ? 'crm_pm' : 'crm',
                        'title'     => $t->title,
                        'due_date'  => $t->due_date?->toDateString(),
                        'project'   => $t->project?->name,
                        'days_late' => max(1, $t->due_date->copy()->startOfDay()->diffInDays($today->copy()->startOfDay())),
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: overdue crm tasks unavailable', ['error' => $e->getMessage()]);
        }

        return $overdue;
    }

    private function collectWorkPatterns(User $user): array
    {
        try {
            $pattern = UserWorkPattern::where('user_id', $user->id)->first();

            if ($pattern) {
                return [
                    'peak_hours'              => $pattern->peak_hours ?? [],
                    'avg_estimation_accuracy' => $pattern->avg_estimation_accuracy,
                    'avg_deep_work_minutes'   => $pattern->avg_deep_work_minutes,
                    'fatigue_threshold_hour'  => $pattern->fatigue_threshold_hour,
                    'total_tasks_completed'   => $pattern->total_tasks_completed,
                ];
            }
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: work patterns unavailable', ['error' => $e->getMessage()]);
        }

        return [];
    }

    private function collectMetricsSummary(User $user): array
    {
        try {
            // No limit — use all recent metrics for accurate stats
            $metrics = TaskMetric::where('user_id', $user->id)
                ->latest()
                ->get();

            if ($metrics->isEmpty()) {
                return [];
            }

            $avgTime     = round($metrics->avg('actual_minutes') ?? 0);
            $avgFatigue  = round($metrics->avg('mental_fatigue_score') ?? 0, 1);
            $avgAccuracy = round($metrics->avg('accuracy_ratio') ?? 1.0, 2);

            $byLoad    = $metrics->groupBy(fn($m) => $m->cognitive_load?->value ?? $m->cognitive_load ?? 'unknown');
            $loadStats = [];
            foreach ($byLoad as $load => $group) {
                $loadStats[$load] = [
                    'avg_minutes' => round($group->avg('actual_minutes')),
                    'count'       => $group->count(),
                ];
            }

            $weeklyMinutes = TaskMetric::where('user_id', $user->id)
                ->whereBetween('created_at', [
                    Carbon::now()->startOfWeek(),
                    Carbon::now()->endOfWeek(),
                ])
                ->sum('actual_minutes');

            return [
                'avg_time_per_task_minutes' => $avgTime,
                'avg_mental_fatigue'        => $avgFatigue,
                'avg_estimation_accuracy'   => $avgAccuracy,
                'by_cognitive_load'         => $loadStats,
                'total_minutes_this_week'   => (int) $weeklyMinutes,
                'total_hours_this_week'     => round($weeklyMinutes / 60, 1),
                'sample_size'               => $metrics->count(),
            ];
        } catch (\Exception $e) {
            Log::debug('FocusDataAggregator: task metrics unavailable', ['error' => $e->getMessage()]);
        }

        return [];
    }

    private function countOpenTasks(User $user): int
    {
        $count = 0;

        try {
            $count += FocusTask::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->count();
        } catch (\Exception $e) { /* table not yet available */ }

        try {
            $assignedTaskIds = CrmProjectTaskAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('crm_project_task_id');

            $managedProjectIds = CrmProject::where('manager_id', $user->id)->pluck('id');
            $managedTaskIds    = CrmProjectTask::whereIn('crm_project_id', $managedProjectIds)->pluck('id');
            $allTaskIds        = $assignedTaskIds->merge($managedTaskIds)->unique();

            if ($allTaskIds->isNotEmpty()) {
                $count += CrmProjectTask::whereIn('id', $allTaskIds)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->count();
            }
        } catch (\Exception $e) { /* table not yet available */ }

        try {
            $count += WorkspaceUserTask::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'done'])
                ->count();
        } catch (\Exception $e) { /* table not yet available */ }

        return $count;
    }

    private function countCompletedToday(User $user): int
    {
        $count = 0;

        try {
            $count += FocusTask::where('user_id', $user->id)
                ->where('status', 'completed')
                ->whereDate('completed_at', Carbon::today())
                ->count();
        } catch (\Exception $e) { /* table not yet available */ }

        return $count;
    }
}
