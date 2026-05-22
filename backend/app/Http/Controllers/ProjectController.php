<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\ProjectType;
use App\Models\Client;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    /**
     * Get all projects with stats and filters
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        // Base query
        $query = Project::query();

        // Admin sees all, others see only their projects
        if ($user->role !== 'admin') {
            $query->where(function ($q) use ($user) {
                $q->where('manager_id', $user->id)
                  ->orWhereHas('members', function ($memberQuery) use ($user) {
                      $memberQuery->where('user_id', $user->id);
                  });
            });
        }

        // Apply filters
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        
        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhereHas('client', function ($clientQuery) use ($request) {
                      $clientQuery->where('company_name', 'like', '%' . $request->search . '%');
                  });
            });
        }

        if ($request->has('project_type_id') && $request->project_type_id) {
            $query->where('project_type_id', $request->project_type_id);
        }

        if ($request->has('client_id') && $request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('crm_department_id') && $request->crm_department_id) {
            $query->where('crm_department_id', $request->crm_department_id);
        }

        // Eager load relationships
        $query->with([
            'client:id,company_name,email,phone',
            'manager:id,name,email',
            'projectType:id,code,name,icon,color',
            'crmDepartment:id,code,name',
            'members:id,name',
        ]);

        // Get projects
        $projects = $query->orderBy('created_at', 'desc')->get();

        // Calculate stats
        $stats = [
            'total' => $projects->count(),
            'active' => $projects->where('status', 'active')->count(),
            'pending' => $projects->whereIn('status', ['pending', 'planning'])->count(),
            'completed' => $projects->where('status', 'completed')->count(),
            'overdue' => $projects->where('is_overdue', true)->count(),
            'total_budget' => $projects->sum('budget_allocated'),
            'total_spent' => $projects->sum('budget_spent'),
            'team_members_count' => DB::table('project_team_members')
                ->distinct('user_id')
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $projects,
            'stats' => $stats,
        ]);
    }

    /**
     * Create new project
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'project_type_id' => 'required|exists:project_types,id',
            'client_id' => 'required|exists:clients,id',
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'manager_id' => 'required|exists:users,id',
            'description' => 'nullable|string',
            'status' => 'required|in:planning,active,on_hold,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'due_date' => 'nullable|date',
            'budget_allocated' => 'nullable|numeric|min:0',
            'budget_cocchi' => 'nullable|numeric|min:0',
            'contratto_url' => 'nullable|url',
            'link_foto_video' => 'nullable|url',
            'link_cartella_documenti' => 'nullable|url',
            'link_cartella_social' => 'nullable|url',
            'link_cartella_credenziali' => 'nullable|url',
            'project_template' => 'nullable|string',
        ]);

        $validated['budget_spent'] = 0;
        $validated['spent_cocchi'] = 0;

        $project = Project::create($validated);
        
        // Load relationships
        $project->load(['client', 'manager', 'projectType', 'crmDepartment']);
        
        return response()->json([
            'success' => true,
            'message' => 'Progetto creato con successo',
            'data' => $project,
        ], 201);
    }

    /**
     * Get single project with full details
     */
    public function show($id)
    {
        $user = Auth::user();
        
        $project = Project::with([
            'client',
            'manager',
            'projectType',
            'crmDepartment',
            'teamMembers.user:id,name,email,avatar',
            'tasks',
            'purchases',
            'resources',
            'chatMessages.user:id,name,avatar',
            'calendarEvents.creator:id,name',
        ])->findOrFail($id);

        // Check permission
        if ($user->role !== 'admin' && 
            $project->manager_id !== $user->id && 
            !$project->members->contains('id', $user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per visualizzare questo progetto',
            ], 403);
        }

        // Add computed data
        $projectData = $project->toArray();
        $projectData['stats'] = [
            'total_tasks' => $project->tasks->count(),
            'completed_tasks' => $project->tasks->where('status', 'completed')->count(),
            'pending_tasks' => $project->tasks->where('status', 'pending')->count(),
            'team_size' => $project->teamMembers->count(),
            'total_purchases' => $project->purchases->sum('amount'),
            'unread_messages' => $project->chatMessages->where('is_read', false)->count(),
            'upcoming_events' => $project->calendarEvents()
                ->where('start_datetime', '>=', now())
                ->count(),
        ];

        // Timeline calculation
        if ($project->start_date && $project->end_date) {
            $total = $project->start_date->diffInDays($project->end_date);
            $elapsed = $project->start_date->diffInDays(now());
            $projectData['timeline_percentage'] = $total > 0 ? min(round(($elapsed / $total) * 100), 100) : 0;
        } else {
            $projectData['timeline_percentage'] = 0;
        }

        return response()->json([
            'success' => true,
            'data' => $projectData,
        ]);
    }

    /**
     * Update project
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $project = Project::findOrFail($id);
        
        // Check permission
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per modificare questo progetto',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'string|max:255',
            'project_type_id' => 'exists:project_types,id',
            'client_id' => 'exists:clients,id',
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'manager_id' => 'exists:users,id',
            'description' => 'nullable|string',
            'status' => 'in:planning,active,on_hold,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'start_date' => 'date',
            'end_date' => 'nullable|date|after:start_date',
            'due_date' => 'nullable|date',
            'budget_allocated' => 'nullable|numeric|min:0',
            'budget_spent' => 'nullable|numeric|min:0',
            'budget_cocchi' => 'nullable|numeric|min:0',
            'spent_cocchi' => 'nullable|numeric|min:0',
            'contratto_url' => 'nullable|url',
            'link_foto_video' => 'nullable|url',
            'link_cartella_documenti' => 'nullable|url',
            'link_cartella_social' => 'nullable|url',
            'link_cartella_credenziali' => 'nullable|url',
            'project_template' => 'nullable|string',
        ]);

        // Only admin can change manager
        if (isset($validated['manager_id']) && 
            $validated['manager_id'] != $project->manager_id && 
            $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo gli amministratori possono cambiare il project manager',
            ], 403);
        }

        $project->update($validated);
        $project->load(['client', 'manager', 'projectType', 'crmDepartment']);

        return response()->json([
            'success' => true,
            'message' => 'Progetto aggiornato con successo',
            'data' => $project,
        ]);
    }

    /**
     * Delete project
     */
    public function destroy($id)
    {
        $user = Auth::user();

        // Only admin can delete projects
        if ($user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo gli amministratori possono eliminare progetti',
            ], 403);
        }

        $project = Project::findOrFail($id);
        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Progetto eliminato con successo',
        ]);
    }

    /**
     * Get project types
     */
    public function getProjectTypes()
    {
        $types = ProjectType::where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    /**
     * Get project templates
     */
    public function getProjectTemplates()
    {
        $templates = \App\Models\ProjectTemplate::active()
            ->with(['roles', 'tasks'])
            ->withCount(['roles', 'tasks'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Get available clients for dropdown
     */
    public function getAvailableClients()
    {
        $clients = Client::select('id', 'company_name', 'email', 'phone')
            ->where('is_active', true)
            ->orderBy('company_name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $clients,
        ]);
    }

    /**
     * Get project statistics dashboard
     */
    public function getDashboardStats()
    {
        $user = Auth::user();

        $query = Project::query();
        if ($user->role !== 'admin') {
            $query->forUser($user->id);
        }

        $projects = $query->with('tasks')->get();

        $stats = [
            'projects_by_status' => [
                'active' => $projects->where('status', 'active')->count(),
                'planning' => $projects->where('status', 'planning')->count(),
                'on_hold' => $projects->where('status', 'on_hold')->count(),
                'completed' => $projects->where('status', 'completed')->count(),
                'cancelled' => $projects->where('status', 'cancelled')->count(),
            ],
            'budget_overview' => [
                'total_allocated' => $projects->sum('budget_allocated'),
                'total_spent' => $projects->sum('budget_spent'),
                'total_remaining' => $projects->sum(function ($p) {
                    return $p->budget_remaining;
                }),
            ],
            'tasks_overview' => [
                'total' => $projects->sum(function ($p) {
                    return $p->tasks->count();
                }),
                'completed' => $projects->sum(function ($p) {
                    return $p->tasks->where('status', 'completed')->count();
                }),
                'pending' => $projects->sum(function ($p) {
                    return $p->tasks->where('status', 'pending')->count();
                }),
            ],
            'overdue_projects' => $projects->where('is_overdue', true)->count(),
            'recent_projects' => $projects->sortByDesc('created_at')->take(5)->values(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
