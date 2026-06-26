<?php

namespace App\Http\Controllers;

use App\Http\Traits\ChecksWorkspaceProjectAccess;
use App\Models\UserWorkspacePreference;
use App\Models\WorkspaceType;
use App\Models\CrmProject;
use App\Models\CrmProjectTeamMember;
use App\Models\CrmProjectWorkspaceSetting;
use App\Models\WorkspaceBranch;
use App\Models\WorkspaceAgent;
use App\Models\WorkspaceUserTask;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Services\GitHubPublishService;

class WorkspaceController extends Controller
{
    use ChecksWorkspaceProjectAccess;

    /**
     * GET /api/workspace/preferences
     * Legge UserWorkspacePreference dell'utente autenticato.
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        $preference = UserWorkspacePreference::where('user_id', $user->id)->first();
        
        if (!$preference) {
            return response()->json([
                'success' => true,
                'data' => null
            ]);
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'workspace_type_code' => $preference->workspace_type_code,
                'settings' => $preference->settings
            ]
        ]);
    }

    /**
     * PUT /api/workspace/preferences
     * Aggiorna o crea UserWorkspacePreference per l'utente corrente.
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $allowedCodes = WorkspaceType::where('is_active', true)->pluck('code')->implode(',');

        $validator = Validator::make($request->all(), [
            'workspace_type_code' => 'required|string|in:' . $allowedCodes,
            'settings' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = auth()->user();
        
        $preference = UserWorkspacePreference::updateOrCreate(
            ['user_id' => $user->id],
            [
                'workspace_type_code' => $request->workspace_type_code,
                'settings' => $request->settings ?? []
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'workspace_type_code' => $preference->workspace_type_code,
                'settings' => $preference->settings
            ]
        ]);
    }

    /**
     * GET /api/workspace/developer/projects
     * Restituisce i progetti dove l'utente è team member OPPURE project manager,
     * filtrati per quelli che hanno workspace settings abilitati per developer.
     */
    public function getDeveloperProjects(Request $request): JsonResponse
    {
        $userId = auth()->id();
        
        // Trova progetti accessibili (team member O manager)
        $teamMemberProjectIds = CrmProjectTeamMember::where('user_id', $userId)
            ->where('is_active', true)
            ->pluck('crm_project_id');
        
        $managerProjectIds = CrmProject::where('manager_id', $userId)->pluck('id');
        
        $projectIds = $teamMemberProjectIds->merge($managerProjectIds)->unique();
        
        if ($projectIds->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        // Filtra per progetti con workspace settings abilitati per 'developer'
        $enabledProjectIds = CrmProjectWorkspaceSetting::whereIn('project_id', $projectIds)
            ->where('workspace_type_code', 'developer')
            ->where('is_enabled', true)
            ->pluck('project_id');

        if ($enabledProjectIds->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        // Carica progetti con relazioni e conteggi
        $projects = CrmProject::whereIn('id', $enabledProjectIds)
            ->with(['client', 'manager', 'workspaceSettings'])
            ->orderBy('updated_at', 'desc')
            ->get();

        $enrichedProjects = [];
        
        foreach ($projects as $project) {
            $isProjectManager = $project->manager_id === $userId;
            
            // Workspace settings
            $workspaceSetting = $project->workspaceSettings
                ->where('workspace_type_code', 'developer')
                ->first();
            
            // Conteggi
            $branchesCount = WorkspaceBranch::where('project_id', $project->id)
                ->where('workspace_type_code', 'developer')
                ->where('is_active', true)
                ->count();
            
            $activeAgentsCount = WorkspaceAgent::where('project_id', $project->id)
                ->whereIn('status', ['running', 'review'])
                ->count();
            
            $openTasksCount = WorkspaceUserTask::where('project_id', $project->id)
                ->where('user_id', $userId)
                ->where('status', '!=', 'completed')
                ->count();
            
            // Progress: based only on WorkspaceUserTasks not yet archived (completion_group_id IS NULL)
            $activeTasks = WorkspaceUserTask::where('project_id', $project->id)
                ->whereNull('completion_group_id')
                ->count();
            $activeCompletedTasks = WorkspaceUserTask::where('project_id', $project->id)
                ->whereNull('completion_group_id')
                ->where('status', 'completed')
                ->count();

            $progress = $activeTasks > 0 ? round(($activeCompletedTasks / $activeTasks) * 100) : 0;

            $enrichedProjects[] = [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->status,
                'manager_id' => $project->manager_id,
                'cover_photo' => $project->cover_photo,
                'github_url' => $project->github_url,
                'updated_at' => $project->updated_at?->format('c'),
                'is_project_manager' => $isProjectManager,
                'workspace_settings' => $workspaceSetting ? [
                    'staging_url' => $workspaceSetting->staging_url,
                    'preview_url' => $workspaceSetting->preview_url,
                    'is_enabled' => $workspaceSetting->is_enabled
                ] : null,
                'branches_count' => $branchesCount,
                'active_agents_count' => $activeAgentsCount,
                'open_tasks_count' => $openTasksCount,
                'progress' => $progress
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $enrichedProjects
        ]);
    }

    /**
     * GET /api/workspace/developer/projects/{id}
     * Restituisce progetto singolo + branches accessibili dall'utente.
     */
    public function getDeveloperProject(Request $request, int $id): JsonResponse
    {
        $project = $this->getUserAccessibleProject($id);
        $userId = auth()->id();
        
        // Verifica che il progetto abbia workspace settings per developer
        $workspaceSetting = CrmProjectWorkspaceSetting::where('project_id', $id)
            ->where('workspace_type_code', 'developer')
            ->where('is_enabled', true)
            ->first();
            
        if (!$workspaceSetting) {
            abort(403, 'Progetto non abilitato per workspace developer');
        }

        $isProjectManager = $project->manager_id === $userId;
        $isAdmin = auth()->user()->role === 'admin' || 
                  (method_exists(auth()->user(), 'hasRole') && auth()->user()->hasRole('admin'));

        // Carica branches - filtro per ruolo se non admin/PM
        $branchesQuery = WorkspaceBranch::where('project_id', $id)
            ->where('workspace_type_code', 'developer')
            ->where('is_active', true);
            
        if (!$isAdmin && !$isProjectManager) {
            // Utente normale: mostra solo branch senza restrizioni o con ruoli 'developer'/'freelance'
            $branchesQuery->where(function($q) {
                $q->whereDoesntHave('roles')
                  ->orWhereHas('roles', function($roleQuery) {
                      $roleQuery->whereIn('role', ['developer', 'freelance']);
                  });
            });
        }
        
        $branches = $branchesQuery->with('roles')->orderBy('sort_order')->get();

        // Conteggi come in getDeveloperProjects
        $activeAgentsCount = WorkspaceAgent::where('project_id', $id)
            ->whereIn('status', ['running', 'review'])
            ->count();
        
        $openTasksCount = WorkspaceUserTask::where('project_id', $id)
            ->where('user_id', $userId)
            ->where('status', '!=', 'completed')
            ->count();
        
        // Progress: based only on active workspace tasks (completion_group_id IS NULL)
        $activeTasks = WorkspaceUserTask::where('project_id', $id)
            ->whereNull('completion_group_id')
            ->count();
        $activeCompletedTasks = WorkspaceUserTask::where('project_id', $id)
            ->whereNull('completion_group_id')
            ->where('status', 'completed')
            ->count();

        $progress = $activeTasks > 0 ? round(($activeCompletedTasks / $activeTasks) * 100) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->status,
                'manager_id' => $project->manager_id,
                'cover_photo' => $project->cover_photo,
                'github_url' => $project->github_url,
                'updated_at' => $project->updated_at?->format('c'),
                'is_project_manager' => $isProjectManager,
                'workspace_settings' => [
                    'staging_url' => $workspaceSetting->staging_url,
                    'preview_url' => $workspaceSetting->preview_url,
                    'is_enabled' => $workspaceSetting->is_enabled
                ],
                'branches_count' => $branches->count(),
                'active_agents_count' => $activeAgentsCount,
                'open_tasks_count' => $openTasksCount,
                'progress' => $progress,
                'branches' => $branches->map(function ($branch) {
                    return [
                        'id' => $branch->id,
                        'name' => $branch->name,
                        'description' => $branch->description,
                        'git_branch' => $branch->git_branch,
                        'color' => $branch->color,
                        'sort_order' => $branch->sort_order,
                        'roles' => $branch->roles->pluck('role')->toArray()
                    ];
                })
            ]
        ]);
    }

    /**
     * POST /api/workspace/developer/projects/{id}/publish
     * Merge staging → main su GitHub per il progetto.
     */
    public function publishProject(Request $request, int $id, GitHubPublishService $gitHubPublishService): JsonResponse
    {
        $project = $this->getUserAccessibleProject($id);

        $workspaceSetting = CrmProjectWorkspaceSetting::where('project_id', $id)
            ->where('workspace_type_code', 'developer')
            ->where('is_enabled', true)
            ->first();

        if (!$workspaceSetting) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non abilitato per workspace developer',
            ], 403);
        }

        if (empty($project->github_url)) {
            return response()->json([
                'success' => false,
                'message' => 'Nessun repository GitHub configurato per questo progetto',
            ], 422);
        }

        try {
            $result = $gitHubPublishService->publishStagingToMain($project->github_url);

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\RuntimeException $e) {
            Log::warning('GitHub publish failed', [
                'project_id' => $id,
                'github_url' => $project->github_url,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('GitHub publish unexpected error', [
                'project_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Errore imprevisto durante la pubblicazione',
            ], 500);
        }
    }

    /**
     * POST /api/workspace/developer/projects/{id}/complete
     * Segna il progetto come completato:
     *   1. Verifica che tutte le task attive siano nello stato 'completed'.
     *   2. Archivia le task nello snapshot corrente (completion_group_id = now timestamp).
     *   3. Aggiorna lo status del progetto a 'completed'.
     *   4. Salva il feedback opzionale nelle settings del progetto.
     */
    public function completeProject(Request $request, int $id): JsonResponse
    {
        $project = $this->getUserAccessibleProject($id);
        $userId = auth()->id();
        $isPmOrAdmin = $project->manager_id === $userId
            || auth()->user()->role === 'admin'
            || (method_exists(auth()->user(), 'hasRole') && auth()->user()->hasRole('admin'));

        if (!$isPmOrAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Solo il Project Manager può segnare il progetto come completato',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'feedback' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Verifica che non esistano task attive non completate
        $pendingCount = WorkspaceUserTask::where('project_id', $id)
            ->whereNull('completion_group_id')
            ->where('status', '!=', 'completed')
            ->count();

        if ($pendingCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Ci sono ancora {$pendingCount} task non completate. Completa tutte le task prima di chiudere il progetto.",
            ], 422);
        }

        // Usa il timestamp come identificatore univoco del gruppo di completamento
        $completionGroupId = now()->timestamp;

        // Archivia tutte le task attive nel gruppo corrente
        WorkspaceUserTask::where('project_id', $id)
            ->whereNull('completion_group_id')
            ->update(['completion_group_id' => $completionGroupId]);

        // Salva feedback nelle settings del progetto e aggiorna lo status
        $settings = $project->settings ?? [];
        $settings['completion_history'] = array_merge(
            $settings['completion_history'] ?? [],
            [[
                'completed_at' => now()->toIso8601String(),
                'feedback' => $request->input('feedback'),
                'completed_by' => $userId,
                'completion_group_id' => $completionGroupId,
            ]]
        );

        $project->update([
            'status' => 'completed',
            'settings' => $settings,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Progetto segnato come completato',
            'data' => [
                'status' => $project->status,
                'completion_group_id' => $completionGroupId,
            ],
        ]);
    }

    /**
     * GET /api/workspace/developer/projects/{id}/branches
     * Restituisce branch attivi del progetto con filtro per ruolo.
     */
    public function getProjectBranches(Request $request, int $id): JsonResponse
    {
        $project = $this->getUserAccessibleProject($id);
        $userId = auth()->id();
        
        $isProjectManager = $project->manager_id === $userId;
        $isAdmin = auth()->user()->role === 'admin' || 
                  (method_exists(auth()->user(), 'hasRole') && auth()->user()->hasRole('admin'));

        $branchesQuery = WorkspaceBranch::where('project_id', $id)
            ->where('workspace_type_code', 'developer')
            ->where('is_active', true);
            
        if (!$isAdmin && !$isProjectManager) {
            $branchesQuery->where(function($q) {
                $q->whereDoesntHave('roles')
                  ->orWhereHas('roles', function($roleQuery) {
                      $roleQuery->whereIn('role', ['developer', 'freelance']);
                  });
            });
        }
        
        $branches = $branchesQuery->with('roles')->orderBy('sort_order')->get();

        return response()->json([
            'success' => true,
            'data' => $branches->map(function ($branch) {
                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'description' => $branch->description,
                    'git_branch' => $branch->git_branch,
                    'color' => $branch->color,
                    'sort_order' => $branch->sort_order,
                    'roles' => $branch->roles->pluck('role')->toArray()
                ];
            })
        ]);
    }
}