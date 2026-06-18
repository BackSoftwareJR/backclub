<?php

namespace App\Http\Controllers;

use App\Http\Traits\ChecksWorkspaceProjectAccess;
use App\Models\CrmProject;
use App\Models\CrmProjectWorkspaceSetting;
use App\Models\WorkspaceBranch;
use App\Models\WorkspaceBranchRole;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class WorkspacePmController extends Controller
{
    use ChecksWorkspaceProjectAccess;

    /**
     * GET /api/crm-projects/{projectId}/workspace-settings
     * Restituisce tutte le workspace settings + branches del progetto.
     */
    public function getSettings(Request $request, int $projectId): JsonResponse
    {
        $project = CrmProject::findOrFail($projectId);
        
        // Verifica: admin O manager del progetto
        if (!$this->isPmOrAdmin($project)) {
            abort(403, 'Non hai i permessi per gestire le impostazioni workspace di questo progetto');
        }

        // Carica workspace settings
        $workspaceSettings = CrmProjectWorkspaceSetting::where('project_id', $projectId)->get();

        // Carica branches con roles
        $branches = WorkspaceBranch::where('project_id', $projectId)
            ->with('roles')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'manager_id' => $project->manager_id
                ],
                'settings' => $workspaceSettings->map(function ($setting) {
                    return [
                        'id' => $setting->id,
                        'workspace_type_code' => $setting->workspace_type_code,
                        'is_enabled' => $setting->is_enabled,
                        'staging_url' => $setting->staging_url,
                        'preview_url' => $setting->preview_url,
                        'settings' => $setting->settings
                    ];
                }),
                'branches' => $branches->map(function ($branch) {
                    return [
                        'id' => $branch->id,
                        'workspace_type_code' => $branch->workspace_type_code,
                        'name' => $branch->name,
                        'description' => $branch->description,
                        'git_branch' => $branch->git_branch,
                        'color' => $branch->color,
                        'sort_order' => $branch->sort_order,
                        'is_active' => $branch->is_active,
                        'created_at' => $branch->created_at?->format('c'),
                        'roles' => $branch->roles->map(function ($role) {
                            return [
                                'id' => $role->id,
                                'branch_id' => $role->branch_id,
                                'role' => $role->role
                            ];
                        })
                    ];
                })
            ]
        ]);
    }

    /**
     * PUT /api/crm-projects/{projectId}/workspace-settings
     * Aggiorna o crea workspace settings per il progetto.
     */
    public function updateSettings(Request $request, int $projectId): JsonResponse
    {
        $project = CrmProject::findOrFail($projectId);
        
        if (!$this->isPmOrAdmin($project)) {
            abort(403, 'Non hai i permessi per gestire le impostazioni workspace di questo progetto');
        }

        $validator = Validator::make($request->all(), [
            'workspace_type_code' => 'required|string',
            'is_enabled' => 'boolean',
            'staging_url' => 'nullable|url',
            'preview_url' => 'nullable|url',
            'settings' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $setting = CrmProjectWorkspaceSetting::updateOrCreate(
            [
                'project_id' => $projectId,
                'workspace_type_code' => $request->workspace_type_code
            ],
            [
                'is_enabled' => $request->is_enabled ?? true,
                'staging_url' => $request->staging_url,
                'preview_url' => $request->preview_url,
                'settings' => $request->settings ?? []
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $setting->id,
                'workspace_type_code' => $setting->workspace_type_code,
                'is_enabled' => $setting->is_enabled,
                'staging_url' => $setting->staging_url,
                'preview_url' => $setting->preview_url,
                'settings' => $setting->settings
            ]
        ]);
    }

    /**
     * POST /api/crm-projects/{projectId}/workspace-branches
     * Crea WorkspaceBranch con eventuali ruoli.
     */
    public function createBranch(Request $request, int $projectId): JsonResponse
    {
        $project = CrmProject::findOrFail($projectId);
        
        if (!$this->isPmOrAdmin($project)) {
            abort(403, 'Non hai i permessi per gestire i branch di questo progetto');
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'git_branch' => 'nullable|string|max:100',
            'color' => 'nullable|string',
            'workspace_type_code' => 'required|string',
            'roles' => 'nullable|array',
            'roles.*' => 'string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $branch = WorkspaceBranch::create([
                'project_id' => $projectId,
                'workspace_type_code' => $request->workspace_type_code,
                'name' => $request->name,
                'description' => $request->description,
                'git_branch' => $request->git_branch,
                'color' => $request->color,
                'sort_order' => 0,
                'is_active' => true,
                'created_by' => auth()->id()
            ]);

            // Crea ruoli se presenti
            if ($request->has('roles') && is_array($request->roles)) {
                foreach ($request->roles as $role) {
                    WorkspaceBranchRole::create([
                        'branch_id' => $branch->id,
                        'role' => $role
                    ]);
                }
            }

            $branch->load('roles');
            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $branch->id,
                    'project_id' => $branch->project_id,
                    'workspace_type_code' => $branch->workspace_type_code,
                    'name' => $branch->name,
                    'description' => $branch->description,
                    'git_branch' => $branch->git_branch,
                    'color' => $branch->color,
                    'sort_order' => $branch->sort_order,
                    'is_active' => $branch->is_active,
                    'created_at' => $branch->created_at?->format('c'),
                    'roles' => $branch->roles->map(function ($role) {
                        return [
                            'id' => $role->id,
                            'branch_id' => $role->branch_id,
                            'role' => $role->role
                        ];
                    })
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione del branch: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/crm-projects/{projectId}/workspace-branches/{branchId}
     * Aggiorna WorkspaceBranch con eventuali ruoli.
     */
    public function updateBranch(Request $request, int $projectId, int $branchId): JsonResponse
    {
        $project = CrmProject::findOrFail($projectId);
        
        if (!$this->isPmOrAdmin($project)) {
            abort(403, 'Non hai i permessi per gestire i branch di questo progetto');
        }

        $branch = WorkspaceBranch::where('id', $branchId)
            ->where('project_id', $projectId)
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'git_branch' => 'nullable|string|max:100',
            'color' => 'nullable|string',
            'workspace_type_code' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
            'roles' => 'nullable|array',
            'roles.*' => 'string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Aggiorna branch
            $branch->update($request->only([
                'name', 
                'description', 
                'git_branch', 
                'color', 
                'workspace_type_code',
                'is_active',
                'sort_order'
            ]));

            // Aggiorna ruoli se presenti nella richiesta
            if ($request->has('roles')) {
                // Elimina ruoli esistenti
                WorkspaceBranchRole::where('branch_id', $branchId)->delete();
                
                // Crea nuovi ruoli
                if (is_array($request->roles)) {
                    foreach ($request->roles as $role) {
                        WorkspaceBranchRole::create([
                            'branch_id' => $branchId,
                            'role' => $role
                        ]);
                    }
                }
            }

            $branch->load('roles');
            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $branch->id,
                    'project_id' => $branch->project_id,
                    'workspace_type_code' => $branch->workspace_type_code,
                    'name' => $branch->name,
                    'description' => $branch->description,
                    'git_branch' => $branch->git_branch,
                    'color' => $branch->color,
                    'sort_order' => $branch->sort_order,
                    'is_active' => $branch->is_active,
                    'created_at' => $branch->created_at?->format('c'),
                    'updated_at' => $branch->updated_at?->format('c'),
                    'roles' => $branch->roles->map(function ($role) {
                        return [
                            'id' => $role->id,
                            'branch_id' => $role->branch_id,
                            'role' => $role->role
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'aggiornamento del branch: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/crm-projects/{projectId}/workspace-branches/{branchId}
     * Elimina WorkspaceBranch (cascade elimina roles).
     */
    public function deleteBranch(Request $request, int $projectId, int $branchId): JsonResponse
    {
        $project = CrmProject::findOrFail($projectId);
        
        if (!$this->isPmOrAdmin($project)) {
            abort(403, 'Non hai i permessi per gestire i branch di questo progetto');
        }

        $branch = WorkspaceBranch::where('id', $branchId)
            ->where('project_id', $projectId)
            ->firstOrFail();

        DB::beginTransaction();
        try {
            // Elimina ruoli
            WorkspaceBranchRole::where('branch_id', $branchId)->delete();
            
            // Setta branch_id a null per agenti e task esistenti
            DB::table('workspace_agents')
                ->where('branch_id', $branchId)
                ->update(['branch_id' => null]);
                
            DB::table('workspace_user_tasks')
                ->where('branch_id', $branchId)
                ->update(['branch_id' => null]);

            // Elimina branch
            $branch->delete();
            
            DB::commit();

            return response()->json(['success' => true]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'eliminazione del branch: ' . $e->getMessage()
            ], 500);
        }
    }
}