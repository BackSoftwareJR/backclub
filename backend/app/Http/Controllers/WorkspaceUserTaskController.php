<?php

namespace App\Http\Controllers;

use App\Http\Traits\ChecksWorkspaceProjectAccess;
use App\Models\WorkspaceUserTask;
use App\Models\WorkspaceBranch;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class WorkspaceUserTaskController extends Controller
{
    use ChecksWorkspaceProjectAccess;

    /**
     * GET /api/workspace/developer/projects/{projectId}/tasks
     * Restituisce task dell'utente (user_id = auth()->id()) per il progetto.
     */
    public function index(Request $request, int $projectId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);
        $userId = auth()->id();

        $tasks = WorkspaceUserTask::where('project_id', $projectId)
            ->where('user_id', $userId)
            ->with('branch')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $tasks->map(function ($task) {
                return [
                    'id' => $task->id,
                    'project_id' => $task->project_id,
                    'branch_id' => $task->branch_id,
                    'user_id' => $task->user_id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'sort_order' => $task->sort_order,
                    'due_date' => $task->due_date?->format('c'),
                    'completed_at' => $task->completed_at?->format('c'),
                    'created_at' => $task->created_at?->format('c'),
                    'updated_at' => $task->updated_at?->format('c'),
                    'branch' => $task->branch ? [
                        'id' => $task->branch->id,
                        'name' => $task->branch->name,
                        'color' => $task->branch->color
                    ] : null
                ];
            })
        ]);
    }

    /**
     * POST /api/workspace/developer/projects/{projectId}/tasks
     * Crea WorkspaceUserTask con user_id = auth()->id(), status = 'todo'.
     */
    public function store(Request $request, int $projectId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'branch_id' => 'nullable|integer|exists:workspace_branches,id',
            'due_date' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Verifica che il branch appartenga al progetto se fornito
        if ($request->branch_id) {
            $branch = WorkspaceBranch::where('id', $request->branch_id)
                ->where('project_id', $projectId)
                ->first();
            if (!$branch) {
                return response()->json([
                    'success' => false,
                    'errors' => ['branch_id' => ['Il branch selezionato non appartiene al progetto']]
                ], 422);
            }
        }

        $task = WorkspaceUserTask::create([
            'project_id' => $projectId,
            'branch_id' => $request->branch_id,
            'user_id' => auth()->id(),
            'title' => $request->title,
            'description' => $request->description,
            'priority' => $request->priority ?? 'medium',
            'due_date' => $request->due_date,
            'status' => 'todo',
            'sort_order' => 0
        ]);

        $task->load('branch');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'branch_id' => $task->branch_id,
                'user_id' => $task->user_id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'sort_order' => $task->sort_order,
                'due_date' => $task->due_date?->format('c'),
                'completed_at' => $task->completed_at?->format('c'),
                'created_at' => $task->created_at?->format('c'),
                'updated_at' => $task->updated_at?->format('c'),
                'branch' => $task->branch ? [
                    'id' => $task->branch->id,
                    'name' => $task->branch->name,
                    'color' => $task->branch->color
                ] : null
            ]
        ], 201);
    }

    /**
     * PUT /api/workspace/developer/projects/{projectId}/tasks/{taskId}
     * Aggiorna WorkspaceUserTask (verifica che la task appartenga all'utente).
     */
    public function update(Request $request, int $projectId, int $taskId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);
        
        $task = WorkspaceUserTask::where('id', $taskId)
            ->where('project_id', $projectId)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:todo,in_progress,review,completed',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
            'branch_id' => 'nullable|integer'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Verifica branch_id se fornito
        if ($request->has('branch_id') && $request->branch_id) {
            $branch = WorkspaceBranch::where('id', $request->branch_id)
                ->where('project_id', $projectId)
                ->first();
            if (!$branch) {
                return response()->json([
                    'success' => false,
                    'errors' => ['branch_id' => ['Il branch selezionato non appartiene al progetto']]
                ], 422);
            }
        }

        $updateData = $request->only(['title', 'description', 'status', 'priority', 'due_date', 'branch_id']);

        // Gestione completed_at
        if ($request->has('status')) {
            if ($request->status === 'completed' && $task->status !== 'completed') {
                $updateData['completed_at'] = now();
            } elseif ($request->status !== 'completed') {
                $updateData['completed_at'] = null;
            }
        }

        $task->update($updateData);
        $task->load('branch');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'branch_id' => $task->branch_id,
                'user_id' => $task->user_id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'sort_order' => $task->sort_order,
                'due_date' => $task->due_date?->format('c'),
                'completed_at' => $task->completed_at?->format('c'),
                'created_at' => $task->created_at?->format('c'),
                'updated_at' => $task->updated_at?->format('c'),
                'branch' => $task->branch ? [
                    'id' => $task->branch->id,
                    'name' => $task->branch->name,
                    'color' => $task->branch->color
                ] : null
            ]
        ]);
    }
}