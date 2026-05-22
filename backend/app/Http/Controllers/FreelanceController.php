<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskAssignment;
use App\Models\CrmProjectPmChatMessage;
use App\Models\CrmProjectTaskRescheduleRequest;
use App\Models\CrmProjectTaskDeletionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Endpoint ottimizzati per il portale Freelance: una sola chiamata invece di N+1.
 */
class FreelanceController extends Controller
{
    /**
     * GET /api/freelance/dashboard
     * Restituisce stats, projects (con conteggi) e tasks in una sola risposta.
     */
    public function dashboard(Request $request)
    {
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Non autenticato'], 401);
        }

        $teamProjectIds = CrmProject::join('crm_project_team_members', 'crm_projects.id', '=', 'crm_project_team_members.crm_project_id')
            ->where('crm_project_team_members.user_id', $userId)
            ->where('crm_project_team_members.is_active', true)
            ->pluck('crm_projects.id');

        $managerProjectIds = CrmProject::where('manager_id', $userId)->pluck('id');
        $projectIds = $teamProjectIds->merge($managerProjectIds)->unique()->values();

        if ($projectIds->isEmpty()) {
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

        $projectIdsArr = $projectIds->toArray();

        // 1) Progetti con relazioni essenziali
        $projects = CrmProject::whereIn('id', $projectIdsArr)
            ->with(['client:id,company_name', 'crmDepartment:id,code,name', 'manager:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->get();

        // 2) Tutti i task assegnati all'utente (una query)
        $tasks = CrmProjectTask::whereHas('assignments', function ($q) use ($userId) {
                $q->where('user_id', $userId)->where('is_active', true);
            })
            ->whereIn('crm_project_id', $projectIdsArr)
            ->with(['project:id,name,crm_department_id', 'project.crmDepartment:id,code,name'])
            ->orderBy('due_date', 'asc')
            ->orderBy('priority', 'desc')
            ->get();

        // 2b) Tutte le task per progetto (per PM: progresso complessivo)
        $allTasksByProject = CrmProjectTask::whereIn('crm_project_id', $projectIdsArr)
            ->select('crm_project_id', 'status')
            ->get()
            ->groupBy('crm_project_id');

        // 3) Conteggio unread per progetto (una query aggregata)
        $unreadByProject = CrmProjectPmChatMessage::whereIn('crm_project_id', $projectIdsArr)
            ->where('user_id', '!=', $userId)
            ->where('is_read', false)
            ->select('crm_project_id', DB::raw('count(*) as unread_count'))
            ->groupBy('crm_project_id')
            ->pluck('unread_count', 'crm_project_id');

        // Arricchisci progetti con conteggi (PM = progresso tutto il progetto, altrimenti solo mie task)
        $tasksByProject = $tasks->groupBy('crm_project_id');
        $enrichedProjects = [];
        foreach ($projects as $project) {
            $isPm = (int) $project->manager_id === (int) $userId;
            $myTasks = $tasksByProject->get($project->id, collect());
            $allTasks = $allTasksByProject->get($project->id, collect());
            $totalAll = $allTasks->count();

            if ($isPm) {
                $completedAll = $allTasks->where('status', 'completed')->count();
                $progress = $totalAll > 0 ? (int) round(($completedAll / $totalAll) * 100) : 0;
            } else {
                $total = $myTasks->count();
                $completed = $myTasks->where('status', 'completed')->count();
                $progress = $total > 0 ? (int) round(($completed / $total) * 100) : 0;
            }

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
                'myTasksCount' => $myTasks->count(),
                'totalTasksCount' => $totalAll,
                'unreadMessages' => (int) ($unreadByProject[$project->id] ?? 0),
                'is_project_manager' => $isPm,
            ];
        }

        // Stats
        $activeStatuses = ['active', 'avviato', 'preso_in_carico'];
        $activeProjects = $projects->whereIn('status', $activeStatuses)->count();
        $pendingTasks = $tasks->whereIn('status', ['pending', 'in_progress'])->count();
        $unreadMessages = $unreadByProject->sum();
        $today = now()->startOfDay();
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

        // Tasks per frontend (formato atteso)
        $tasksForFrontend = $tasks->map(function ($t) {
            $dueDate = $t->due_date;
            $now = now();
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
     * GET /api/freelance/projects
     * Progetti con conteggi (myTasksCount, progress, unreadMessages) in una chiamata.
     */
    public function projects(Request $request)
    {
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Non autenticato'], 401);
        }

        $teamProjectIds = CrmProject::join('crm_project_team_members', 'crm_projects.id', '=', 'crm_project_team_members.crm_project_id')
            ->where('crm_project_team_members.user_id', $userId)
            ->where('crm_project_team_members.is_active', true)
            ->pluck('crm_projects.id');

        $managerProjectIds = CrmProject::where('manager_id', $userId)->pluck('id');
        $projectIds = $teamProjectIds->merge($managerProjectIds)->unique()->values();

        if ($projectIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $search = $request->query('search');
        $search = is_string($search) ? trim($search) : '';
        $perPage = $request->query('per_page');
        $limit = $perPage !== null && $perPage !== '' ? min((int) $perPage, 20) : null;

        $projectsQuery = CrmProject::whereIn('id', $projectIds)
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

        // Task assegnate all'utente (per progresso "mie task" e myTasksCount)
        $tasks = CrmProjectTask::whereHas('assignments', fn ($q) => $q->where('user_id', $userId)->where('is_active', true))
            ->whereIn('crm_project_id', $projectIds)
            ->select('crm_project_id', 'status')
            ->get();

        // Tutte le task del progetto (per PM: barra percentuale su tutto il progetto)
        $allTasksByProject = CrmProjectTask::whereIn('crm_project_id', $projectIds)
            ->select('crm_project_id', 'status')
            ->get()
            ->groupBy('crm_project_id');

        $unreadByProject = CrmProjectPmChatMessage::whereIn('crm_project_id', $projectIds)
            ->where('user_id', '!=', $userId)
            ->where('is_read', false)
            ->select('crm_project_id', DB::raw('count(*) as c'))
            ->groupBy('crm_project_id')
            ->pluck('c', 'crm_project_id');

        $tasksByProject = $tasks->groupBy('crm_project_id');
        $enriched = $projects->map(function ($project) use ($tasksByProject, $allTasksByProject, $unreadByProject, $userId) {
            $isPm = (int) $project->manager_id === (int) $userId;
            $myTasks = $tasksByProject->get($project->id, collect());
            $p = $project->toArray();
            $p['myTasksCount'] = $myTasks->count();

            if ($isPm) {
                // PM: barra percentuale su tutto il progetto (tutte le task di tutti)
                $allTasks = $allTasksByProject->get($project->id, collect());
                $totalAll = $allTasks->count();
                $completedAll = $allTasks->where('status', 'completed')->count();
                $p['progress'] = $totalAll > 0 ? (int) round(($completedAll / $totalAll) * 100) : 0;
                $p['totalTasksCount'] = $totalAll;
            } else {
                // Non PM: barra percentuale solo sulle mie task
                $total = $myTasks->count();
                $completed = $myTasks->where('status', 'completed')->count();
                $p['progress'] = $total > 0 ? (int) round(($completed / $total) * 100) : 0;
                $p['totalTasksCount'] = $allTasksByProject->get($project->id, collect())->count();
            }

            $p['unreadMessages'] = (int) ($unreadByProject[$project->id] ?? 0);
            $p['is_project_manager'] = $isPm;
            return $p;
        });

        return response()->json(['success' => true, 'data' => $enriched->values()->toArray()]);
    }

    /**
     * GET /api/freelance/tasks
     * Tutti i task assegnati all'utente: progetti in cui è team member O project manager.
     */
    public function tasks(Request $request)
    {
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Non autenticato'], 401);
        }

        $teamProjectIds = CrmProject::join('crm_project_team_members', 'crm_projects.id', '=', 'crm_project_team_members.crm_project_id')
            ->where('crm_project_team_members.user_id', $userId)
            ->where('crm_project_team_members.is_active', true)
            ->pluck('crm_projects.id');

        $managerProjectIds = CrmProject::where('manager_id', $userId)->pluck('id');
        $projectIds = $teamProjectIds->merge($managerProjectIds)->unique()->values();

        if ($projectIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $search = $request->query('search');
        $search = is_string($search) ? trim($search) : '';
        $perPage = $request->query('per_page');
        $limit = $perPage !== null && $perPage !== '' ? min((int) $perPage, 20) : null;

        $tasksQuery = CrmProjectTask::whereHas('assignments', fn ($q) => $q->where('user_id', $userId)->where('is_active', true))
            ->whereIn('crm_project_id', $projectIds)
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
     * GET /api/freelance/requests
     * Tutte le richieste di spostamento e eliminazione dell'utente in una sola chiamata (evita N*2 chiamate per progetto).
     */
    public function requests(Request $request)
    {
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Non autenticato'], 401);
        }

        $teamProjectIds = CrmProject::join('crm_project_team_members', 'crm_projects.id', '=', 'crm_project_team_members.crm_project_id')
            ->where('crm_project_team_members.user_id', $userId)
            ->where('crm_project_team_members.is_active', true)
            ->pluck('crm_projects.id');

        $managerProjectIds = CrmProject::where('manager_id', $userId)->pluck('id');
        $projectIds = $teamProjectIds->merge($managerProjectIds)->unique()->values();

        if ($projectIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => ['reschedule' => [], 'deletion' => []]]);
        }

        $reschedule = CrmProjectTaskRescheduleRequest::where('user_id', $userId)
            ->whereHas('task', fn ($q) => $q->whereIn('crm_project_id', $projectIds))
            ->with(['task' => fn ($q) => $q->with('project:id,name')])
            ->orderBy('created_at', 'desc')
            ->get();

        $deletion = CrmProjectTaskDeletionRequest::where('user_id', $userId)
            ->whereHas('task', fn ($q) => $q->whereIn('crm_project_id', $projectIds))
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
     * GET /api/freelance/chat-channels
     * Canali chat (progetti) con last_message, unread_count, manager in una chiamata.
     */
    public function chatChannels(Request $request)
    {
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Non autenticato'], 401);
        }

        $teamProjectIds = CrmProject::join('crm_project_team_members', 'crm_projects.id', '=', 'crm_project_team_members.crm_project_id')
            ->where('crm_project_team_members.user_id', $userId)
            ->where('crm_project_team_members.is_active', true)
            ->pluck('crm_projects.id');

        $managerProjectIds = CrmProject::where('manager_id', $userId)->pluck('id');
        $projectIds = $teamProjectIds->merge($managerProjectIds)->unique()->values();

        if ($projectIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $projects = CrmProject::whereIn('id', $projectIds)
            ->with('manager:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'manager_id']);

        $lastMessages = CrmProjectPmChatMessage::whereIn('crm_project_id', $projectIds)
            ->select('crm_project_id', 'id', 'message', 'message_type', 'user_id', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('crm_project_id')
            ->map(fn ($msgs) => $msgs->first());

        $unreadByProject = CrmProjectPmChatMessage::whereIn('crm_project_id', $projectIds)
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
}
