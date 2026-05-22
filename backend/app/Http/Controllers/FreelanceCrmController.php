<?php

namespace App\Http\Controllers;

use App\Models\CrmDepartment;
use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectPmChatMessage;
use App\Models\CrmProjectTaskRescheduleRequest;
use App\Models\CrmProjectTaskDeletionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Vista CRM dedicata: restituisce TUTTI i dati del dipartimento (progetti, task, richieste, chat)
 * per tutti i membri del CRM, non solo quelli assegnati all'utente corrente.
 * L'utente deve avere il CRM assegnato (user_crm_departments).
 */
class FreelanceCrmController extends Controller
{
    /**
     * Verifica che l'utente abbia accesso al CRM con il codice dato e restituisce il dipartimento.
     */
    private function authorizeCrmCode(string $code): ?CrmDepartment
    {
        $user = Auth::user();
        if (!$user) {
            return null;
        }

        $department = CrmDepartment::where('code', $code)->first();
        if (!$department) {
            return null;
        }

        $hasAccess = $user->crmDepartments()->where('crm_departments.id', $department->id)->exists();
        return $hasAccess ? $department : null;
    }

    /**
     * GET /api/freelance/crm/{code}/dashboard
     * Dashboard del CRM: tutti i progetti e tutti i task del dipartimento.
     */
    public function dashboard(string $code)
    {
        $department = $this->authorizeCrmCode($code);
        if (!$department) {
            return response()->json(['success' => false, 'message' => 'CRM non trovato o accesso negato'], 403);
        }

        $userId = Auth::id();
        $projectIds = CrmProject::where('crm_department_id', $department->id)->pluck('id');
        $projectIdsArr = $projectIds->toArray();

        if (empty($projectIdsArr)) {
            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => [
                        'activeProjects' => 0,
                        'pendingTasks' => 0,
                        'unreadMessages' => 0,
                        'activeTasksToday' => 0,
                        'upNextTasks' => [],
                    ],
                    'projects' => [],
                    'tasks' => [],
                ],
            ]);
        }

        $projects = CrmProject::whereIn('id', $projectIdsArr)
            ->with(['client:id,company_name', 'crmDepartment:id,code,name', 'manager:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Tutti i task del CRM (non solo assegnati all'utente)
        $tasks = CrmProjectTask::whereIn('crm_project_id', $projectIdsArr)
            ->with(['project:id,name,crm_department_id', 'project.crmDepartment:id,code,name'])
            ->orderBy('due_date', 'asc')
            ->orderBy('priority', 'desc')
            ->get();

        $allTasksByProject = $tasks->groupBy('crm_project_id');
        $unreadByProject = CrmProjectPmChatMessage::whereIn('crm_project_id', $projectIdsArr)
            ->where('user_id', '!=', $userId)
            ->where('is_read', false)
            ->select('crm_project_id', DB::raw('count(*) as unread_count'))
            ->groupBy('crm_project_id')
            ->pluck('unread_count', 'crm_project_id');

        $activeStatuses = ['active', 'avviato', 'preso_in_carico'];
        $enrichedProjects = [];
        foreach ($projects as $project) {
            $allTasks = $allTasksByProject->get($project->id, collect());
            $totalAll = $allTasks->count();
            $completedAll = $allTasks->where('status', 'completed')->count();
            $progress = $totalAll > 0 ? (int) round(($completedAll / $totalAll) * 100) : 0;
            $enrichedProjects[] = [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status,
                'start_date' => $project->start_date?->format('c'),
                'end_date' => $project->end_date?->format('c'),
                'budget_cocchi' => $project->budget_cocchi,
                'client' => $project->client,
                'manager' => $project->manager,
                'crmDepartment' => $project->crmDepartment,
                'progress' => $progress,
                'myTasksCount' => $allTasks->count(),
                'totalTasksCount' => $totalAll,
                'unreadMessages' => (int) ($unreadByProject[$project->id] ?? 0),
                'is_project_manager' => (int) $project->manager_id === (int) $userId,
            ];
        }

        $today = now()->startOfDay();
        $activeProjects = $projects->whereIn('status', $activeStatuses)->count();
        $pendingTasks = $tasks->whereIn('status', ['pending', 'in_progress'])->count();
        $unreadMessages = $unreadByProject->sum();
        $activeTasksToday = $tasks->filter(function ($t) use ($today) {
            if (in_array($t->status, ['completed', 'cancelled'])) return false;
            if (!$t->due_date) return $t->status === 'in_progress';
            return $t->due_date->startOfDay()->eq($today) || $t->status === 'in_progress';
        })->count();
        $upNextTasks = $tasks
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->filter(fn ($t) => $t->due_date)
            ->sortBy('due_date')
            ->take(5)
            ->values()
            ->map(fn ($t) => [
                'id' => $t->id,
                'title' => $t->title,
                'due_date' => $t->due_date?->format('c'),
                'status' => $t->status,
                'priority' => $t->priority,
                'project' => $t->project ? ['id' => $t->project->id, 'name' => $t->project->name, 'crmDepartment' => $t->project->crmDepartment] : null,
            ])
            ->toArray();

        $now = now();
        $tasksForFrontend = $tasks->map(function ($t) use ($now) {
            $dueDate = $t->due_date;
            $isOverdue = $dueDate && $dueDate->lt($now) && $t->status !== 'completed';
            $hoursUntilDue = $dueDate ? (int) round($dueDate->diffInSeconds($now) / 3600) : null;
            return [
                'id' => $t->id,
                'crm_project_id' => $t->crm_project_id,
                'title' => $t->title,
                'description' => $t->description,
                'status' => $t->status,
                'priority' => $t->priority,
                'due_date' => $t->due_date?->format('c'),
                'start_date' => $t->start_date?->format('c'),
                'project' => $t->project ? [
                    'id' => $t->project->id,
                    'name' => $t->project->name,
                    'crmDepartment' => $t->project->crmDepartment,
                ] : null,
                'isOverdue' => $isOverdue,
                'hoursUntilDue' => $hoursUntilDue,
            ];
        })->values()->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'activeProjects' => $activeProjects,
                    'pendingTasks' => $pendingTasks,
                    'unreadMessages' => $unreadMessages,
                    'activeTasksToday' => $activeTasksToday,
                    'upNextTasks' => $upNextTasks,
                ],
                'projects' => $enrichedProjects,
                'tasks' => $tasksForFrontend,
            ],
        ]);
    }

    /**
     * GET /api/freelance/crm/{code}/projects
     * Tutti i progetti del CRM.
     */
    public function projects(Request $request, string $code)
    {
        $department = $this->authorizeCrmCode($code);
        if (!$department) {
            return response()->json(['success' => false, 'message' => 'CRM non trovato o accesso negato'], 403);
        }

        $userId = Auth::id();
        $projectIds = CrmProject::where('crm_department_id', $department->id)->pluck('id');
        $projectIdsArr = $projectIds->toArray();

        if (empty($projectIdsArr)) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $search = $request->query('search');
        $search = is_string($search) ? trim($search) : '';
        $perPage = $request->query('per_page');
        $limit = $perPage !== null && $perPage !== '' ? min((int) $perPage, 100) : null;

        $projectsQuery = CrmProject::whereIn('id', $projectIdsArr)
            ->with(['client:id,company_name', 'crmDepartment:id,code,name', 'manager:id,name,email'])
            ->orderBy('created_at', 'desc');

        if ($search !== '') {
            $like = '%' . preg_replace('/[%_\\\\]/', '\\\\$0', $search) . '%';
            $projectsQuery->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)->orWhere('description', 'like', $like);
            });
        }
        if ($limit !== null) {
            $projectsQuery->limit($limit);
        }

        $projects = $projectsQuery->get();
        $allTasksByProject = CrmProjectTask::whereIn('crm_project_id', $projectIdsArr)
            ->select('crm_project_id', 'status')
            ->get()
            ->groupBy('crm_project_id');
        $unreadByProject = CrmProjectPmChatMessage::whereIn('crm_project_id', $projectIdsArr)
            ->where('user_id', '!=', $userId)
            ->where('is_read', false)
            ->select('crm_project_id', DB::raw('count(*) as c'))
            ->groupBy('crm_project_id')
            ->pluck('c', 'crm_project_id');

        $enriched = $projects->map(function ($project) use ($allTasksByProject, $unreadByProject, $userId) {
            $allTasks = $allTasksByProject->get($project->id, collect());
            $totalAll = $allTasks->count();
            $completedAll = $allTasks->where('status', 'completed')->count();
            $p = $project->toArray();
            $p['myTasksCount'] = $totalAll;
            $p['progress'] = $totalAll > 0 ? (int) round(($completedAll / $totalAll) * 100) : 0;
            $p['totalTasksCount'] = $totalAll;
            $p['unreadMessages'] = (int) ($unreadByProject[$project->id] ?? 0);
            $p['is_project_manager'] = (int) $project->manager_id === (int) $userId;
            return $p;
        });

        return response()->json(['success' => true, 'data' => $enriched->values()->toArray()]);
    }

    /**
     * GET /api/freelance/crm/{code}/tasks
     * Tutti i task del CRM (di tutti i progetti del dipartimento).
     */
    public function tasks(Request $request, string $code)
    {
        $department = $this->authorizeCrmCode($code);
        if (!$department) {
            return response()->json(['success' => false, 'message' => 'CRM non trovato o accesso negato'], 403);
        }

        $projectIds = CrmProject::where('crm_department_id', $department->id)->pluck('id');
        $projectIdsArr = $projectIds->toArray();

        if (empty($projectIdsArr)) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $search = $request->query('search');
        $search = is_string($search) ? trim($search) : '';
        $perPage = $request->query('per_page');
        $limit = $perPage !== null && $perPage !== '' ? min((int) $perPage, 100) : null;

        $tasksQuery = CrmProjectTask::whereIn('crm_project_id', $projectIdsArr)
            ->with(['project:id,name,crm_department_id', 'project.crmDepartment:id,code,name'])
            ->orderBy('due_date', 'asc')
            ->orderBy('priority', 'desc');

        if ($search !== '') {
            $like = '%' . preg_replace('/[%_\\\\]/', '\\\\$0', $search) . '%';
            $tasksQuery->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)->orWhere('description', 'like', $like);
            });
        }
        if ($limit !== null) {
            $tasksQuery->limit($limit);
        }

        $tasks = $tasksQuery->get();
        $now = now();
        $data = $tasks->map(function ($t) use ($now) {
            $dueDate = $t->due_date;
            $isOverdue = $dueDate && $dueDate->lt($now) && $t->status !== 'completed';
            $hoursUntilDue = $dueDate ? (int) round($dueDate->diffInSeconds($now) / 3600) : null;
            return [
                'id' => $t->id,
                'crm_project_id' => $t->crm_project_id,
                'title' => $t->title,
                'description' => $t->description,
                'status' => $t->status,
                'priority' => $t->priority,
                'due_date' => $t->due_date?->format('c'),
                'start_date' => $t->start_date?->format('c'),
                'project' => $t->project ? ['id' => $t->project->id, 'name' => $t->project->name, 'crmDepartment' => $t->project->crmDepartment] : null,
                'isOverdue' => $isOverdue,
                'hoursUntilDue' => $hoursUntilDue,
            ];
        })->values()->toArray();

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/freelance/crm/{code}/requests
     * Tutte le richieste di spostamento ed eliminazione per i task del CRM.
     */
    public function requests(string $code)
    {
        $department = $this->authorizeCrmCode($code);
        if (!$department) {
            return response()->json(['success' => false, 'message' => 'CRM non trovato o accesso negato'], 403);
        }

        $projectIds = CrmProject::where('crm_department_id', $department->id)->pluck('id');
        $projectIdsArr = $projectIds->toArray();

        if (empty($projectIdsArr)) {
            return response()->json(['success' => true, 'data' => ['reschedule' => [], 'deletion' => []]]);
        }

        $reschedule = CrmProjectTaskRescheduleRequest::whereHas('task', fn ($q) => $q->whereIn('crm_project_id', $projectIdsArr))
            ->with(['task' => fn ($q) => $q->with('project:id,name')])
            ->orderBy('created_at', 'desc')
            ->get();

        $deletion = CrmProjectTaskDeletionRequest::whereHas('task', fn ($q) => $q->whereIn('crm_project_id', $projectIdsArr))
            ->with(['task' => fn ($q) => $q->with('project:id,name')])
            ->orderBy('created_at', 'desc')
            ->get();

        $formatReschedule = $reschedule->map(function ($req) {
            $arr = $req->toArray();
            if ($req->relationLoaded('task') && $req->task) {
                $arr['task'] = [
                    'id' => $req->task->id,
                    'title' => $req->task->title,
                    'crm_project_id' => $req->task->crm_project_id,
                    'project' => $req->task->project ? ['id' => $req->task->project->id, 'name' => $req->task->project->name] : null,
                ];
            }
            return $arr;
        })->values()->toArray();

        $formatDeletion = $deletion->map(function ($req) {
            $arr = $req->toArray();
            if ($req->relationLoaded('task') && $req->task) {
                $arr['task'] = [
                    'id' => $req->task->id,
                    'title' => $req->task->title,
                    'crm_project_id' => $req->task->crm_project_id,
                    'project' => $req->task->project ? ['id' => $req->task->project->id, 'name' => $req->task->project->name] : null,
                ];
            }
            return $arr;
        })->values()->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'reschedule' => $formatReschedule,
                'deletion' => $formatDeletion,
            ],
        ]);
    }

    /**
     * GET /api/freelance/crm/{code}/chat-channels
     * Tutti i canali chat (progetti) del CRM.
     */
    public function chatChannels(string $code)
    {
        $department = $this->authorizeCrmCode($code);
        if (!$department) {
            return response()->json(['success' => false, 'message' => 'CRM non trovato o accesso negato'], 403);
        }

        $userId = Auth::id();
        $projectIds = CrmProject::where('crm_department_id', $department->id)->pluck('id');
        $projectIdsArr = $projectIds->toArray();

        if (empty($projectIdsArr)) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $projects = CrmProject::whereIn('id', $projectIdsArr)
            ->with('manager:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'manager_id']);

        $lastMessages = CrmProjectPmChatMessage::whereIn('crm_project_id', $projectIdsArr)
            ->select('crm_project_id', 'id', 'message', 'message_type', 'user_id', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('crm_project_id')
            ->map(fn ($msgs) => $msgs->first());

        $unreadByProject = CrmProjectPmChatMessage::whereIn('crm_project_id', $projectIdsArr)
            ->where('user_id', '!=', $userId)
            ->where('is_read', false)
            ->select('crm_project_id', DB::raw('count(*) as c'))
            ->groupBy('crm_project_id')
            ->pluck('c', 'crm_project_id');

        $channels = $projects->map(function ($project) use ($lastMessages, $unreadByProject) {
            $last = $lastMessages->get($project->id);
            $manager = $project->manager ? [
                'id' => $project->manager->id,
                'name' => $project->manager->name,
                'email' => $project->manager->email ?? '',
                'avatar' => null,
            ] : null;
            return [
                'projectId' => $project->id,
                'projectName' => $project->name,
                'lastMessage' => $last ? [
                    'id' => $last->id,
                    'message' => $last->message,
                    'message_type' => $last->message_type,
                    'user_id' => $last->user_id,
                    'created_at' => $last->created_at?->format('c'),
                ] : null,
                'unreadCount' => (int) ($unreadByProject[$project->id] ?? 0),
                'manager' => $manager,
            ];
        })->values()->toArray();

        usort($channels, function ($a, $b) {
            $at = $a['lastMessage']['created_at'] ?? '';
            $bt = $b['lastMessage']['created_at'] ?? '';
            return strcmp($bt, $at);
        });

        return response()->json(['success' => true, 'data' => $channels]);
    }

    /**
     * GET /api/freelance/crm/{code}/calendar/items
     * Tutti gli eventi e task del calendario del CRM (di tutti i progetti e di tutti i membri).
     */
    public function calendarItems(string $code)
    {
        $department = $this->authorizeCrmCode($code);
        if (!$department) {
            return response()->json(['success' => false, 'message' => 'CRM non trovato o accesso negato'], 403);
        }

        $projectIds = CrmProject::where('crm_department_id', $department->id)->pluck('id');
        $projectIdsArr = $projectIds->toArray();

        if (empty($projectIdsArr)) {
            return response()->json([
                'success' => true,
                'data' => ['events' => [], 'tasks' => [], 'projects' => []],
            ]);
        }

        $projects = DB::table('crm_projects')
            ->whereIn('crm_projects.id', $projectIdsArr)
            ->leftJoin('crm_departments', 'crm_projects.crm_department_id', '=', 'crm_departments.id')
            ->select(
                'crm_projects.id as project_id',
                'crm_projects.name as project_name',
                'crm_departments.color as project_color'
            )
            ->get()
            ->keyBy('project_id');

        // Tutti i task del CRM (non solo assegnati all'utente)
        $allTasks = DB::table('crm_project_tasks')
            ->whereIn('crm_project_id', $projectIdsArr)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->get();

        $tasks = $allTasks->map(function ($task) use ($projects) {
            $project = $projects->get($task->crm_project_id);
            $startDate = $task->start_date ?: $task->due_date;
            $endDate = $task->due_date ?: $task->start_date;
            if (!$startDate && !$endDate) {
                $startDate = date('Y-m-d') . ' 09:00:00';
                $endDate = date('Y-m-d') . ' 10:00:00';
            } elseif (!$startDate) {
                $startDate = $endDate;
            } elseif (!$endDate) {
                $endDate = $startDate;
            }
            if (strlen($startDate) === 10) {
                $startDate .= ' 09:00:00';
            }
            if (strlen($endDate) === 10) {
                $endDate .= ' 10:00:00';
            }
            $task->type = 'task';
            $task->start_time = $startDate;
            $task->end_time = $endDate;
            $task->is_personal = false;
            $task->project_name = $project ? $project->project_name : null;
            $task->project_color = $project ? $project->project_color : null;
            $task->title = $task->title ?? 'Task senza titolo';
            $task->description = $task->description ?? null;
            $task->crm_project_id = $task->crm_project_id;
            return $task;
        });

        $allProjectEvents = DB::table('project_calendar_events')
            ->whereIn('project_id', $projectIdsArr)
            ->whereNull('deleted_at')
            ->orderBy('start_time', 'asc')
            ->get();

        $projectEvents = $allProjectEvents->map(function ($event) use ($projects) {
            if (isset($event->checklist_items) && $event->checklist_items) {
                try {
                    $event->checklist_items = is_string($event->checklist_items)
                        ? json_decode($event->checklist_items, true)
                        : $event->checklist_items;
                } catch (\Exception $e) {
                    $event->checklist_items = null;
                }
            }
            $project = $projects->get($event->project_id);
            $event->is_personal = false;
            $event->project_id = $event->project_id;
            $event->project_name = $project ? $project->project_name : null;
            $event->project_color = $project ? $project->project_color : null;
            $event->crm_project_id = $event->project_id;
            return $event;
        });

        $allEvents = $projectEvents->values();

        return response()->json([
            'success' => true,
            'data' => [
                'events' => $allEvents,
                'tasks' => $tasks->values(),
                'projects' => $projects->values(),
            ],
        ]);
    }
}
