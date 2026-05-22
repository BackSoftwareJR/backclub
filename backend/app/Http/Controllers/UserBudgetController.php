<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserCrmAllocation;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;

class UserBudgetController extends Controller
{
    /**
     * GET /api/budget/users
     * Lista utenti con budget info
     */
    public function index(Request $request)
    {
        $query = User::with(['crmAllocations.crmDepartment', 'crmAllocations.project']);

        // Filter by role if needed
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->orderBy('name')->get()->map(function ($user) {
            $allocations = UserCrmAllocation::where('user_id', $user->id)->get();
            
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'total_allocated' => $allocations->sum('cocchi_allocated'),
                'total_used' => $allocations->sum('cocchi_used'),
                'total_remaining' => $allocations->sum('cocchi_remaining'),
                'allocations_count' => $allocations->count(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * GET /api/budget/users/{id}
     * Dettaglio budget utente
     */
    public function show($id)
    {
        $user = User::with(['crmAllocations.crmDepartment', 'crmAllocations.project'])->findOrFail($id);

        $allocations = UserCrmAllocation::where('user_id', $id)
            ->with(['crmDepartment', 'project'])
            ->orderBy('allocation_date', 'desc')
            ->get();

        $stats = [
            'total_allocated' => $allocations->sum('cocchi_allocated'),
            'total_used' => $allocations->sum('cocchi_used'),
            'total_remaining' => $allocations->sum('cocchi_remaining'),
            'by_crm' => $allocations->groupBy('crm_department_id')->map(function ($group) {
                return [
                    'allocated' => $group->sum('cocchi_allocated'),
                    'used' => $group->sum('cocchi_used'),
                    'remaining' => $group->sum('cocchi_remaining'),
                ];
            }),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'allocations' => $allocations,
                'stats' => $stats,
            ],
        ]);
    }

    /**
     * GET /api/budget/users/{id}/allocations
     * Allocazioni cocchi utente
     */
    public function getAllocations($id)
    {
        $allocations = UserCrmAllocation::where('user_id', $id)
            ->with(['crmDepartment', 'project'])
            ->orderBy('allocation_date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $allocations,
        ]);
    }

    /**
     * GET /api/budget/users/{id}/projects
     * Progetti assegnati all'utente
     */
    public function getProjects($id)
    {
        $user = User::findOrFail($id);

        // Projects where user is member
        $projects = Project::whereHas('members', function ($query) use ($id) {
            $query->where('user_id', $id);
        })->with(['client', 'manager', 'tasks' => function ($query) use ($id) {
            $query->where('assigned_to', $id);
        }])->get();

        // Get tasks statistics
        $projects = $projects->map(function ($project) use ($id) {
            $userTasks = $project->tasks;
            return [
                'id' => $project->id,
                'name' => $project->name,
                'client' => $project->client,
                'status' => $project->status,
                'budget_cocchi' => $project->budget_cocchi,
                'spent_cocchi' => $project->spent_cocchi,
                'tasks_count' => $userTasks->count(),
                'tasks_completed' => $userTasks->where('status', 'done')->count(),
                'tasks_pending' => $userTasks->whereIn('status', ['pending', 'in_progress'])->count(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    /**
     * GET /api/budget/users/{id}/payments
     * Pagamenti ricevuti dall'utente
     */
    public function getPayments($id)
    {
        $user = User::findOrFail($id);

        // Get tasks completed by user and their payments
        $tasks = Task::where('assigned_to', $id)
            ->where('status', 'done')
            ->with(['project'])
            ->orderBy('completed_at', 'desc')
            ->get();

        $payments = $tasks->map(function ($task) {
            return [
                'task_id' => $task->id,
                'task_name' => $task->title,
                'project' => $task->project->name ?? 'N/A',
                'cost_cocchi' => $task->cost_cocchi,
                'billing_cocchi' => $task->billing_cocchi,
                'completed_at' => $task->completed_at,
                'profit' => $task->billing_cocchi - $task->cost_cocchi,
            ];
        });

        $stats = [
            'total_earned' => $tasks->sum('cost_cocchi'),
            'total_billed' => $tasks->sum('billing_cocchi'),
            'tasks_count' => $tasks->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'payments' => $payments,
                'stats' => $stats,
            ],
        ]);
    }
}
