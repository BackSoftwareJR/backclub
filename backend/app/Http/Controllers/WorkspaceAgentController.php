<?php

namespace App\Http\Controllers;

use App\Http\Traits\ChecksWorkspaceProjectAccess;
use App\Models\WorkspaceAgent;
use App\Models\WorkspaceBranch;
use App\Services\TaskN8nService;
use App\Services\ProjectOrchestratorQueueService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class WorkspaceAgentController extends Controller
{
    use ChecksWorkspaceProjectAccess;

    /**
     * GET /api/workspace/developer/projects/{projectId}/agents
     * Restituisce agenti del progetto (filtra per user_id = auth()->id() se non PM/admin).
     */
    public function index(Request $request, int $projectId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);
        $userId = auth()->id();
        $isPmOrAdmin = $this->isPmOrAdmin($project);

        $onlyTrashed = filter_var($request->query('only_trashed', false), FILTER_VALIDATE_BOOLEAN);
        $includeTrashed = filter_var($request->query('include_trashed', false), FILTER_VALIDATE_BOOLEAN);

        $agents = $this->fetchProjectAgents($projectId, $userId, $isPmOrAdmin, $onlyTrashed, $includeTrashed);

        $taskN8nService = app(TaskN8nService::class);
        $queueBecameIdle = false;
        foreach ($agents as $agent) {
            if (in_array($agent->status, ['pending', 'running', 'review'], true) && !empty($agent->n8n_execution_id)) {
                $previousStatus = $agent->status;
                $taskN8nService->syncWorkspaceAgentFromOrchestrator($agent);
                $agent->refresh();
                if (
                    $previousStatus !== $agent->status
                    && in_array($agent->status, ProjectOrchestratorQueueService::WORKSPACE_TERMINAL_STATUSES, true)
                ) {
                    $queueBecameIdle = true;
                }
            }
        }

        if ($queueBecameIdle) {
            app(ProjectOrchestratorQueueService::class)->releaseProjectSlot($projectId);
            $agents = $this->fetchProjectAgents($projectId, $userId, $isPmOrAdmin, $onlyTrashed, $includeTrashed);
        }

        return response()->json([
            'success' => true,
            'data' => $agents->map(fn ($agent) => $this->formatAgent($agent))->values(),
        ]);
    }

    /**
     * POST /api/workspace/developer/projects/{projectId}/agents
     * Crea WorkspaceAgent con user_id = auth()->id(), status = 'pending'.
     */
    public function store(Request $request, int $projectId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'prompt' => 'required|string',
            'exact_prompt' => 'nullable|boolean',
            'branch_id' => 'nullable|integer|exists:workspace_branches,id'
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

        $agent = WorkspaceAgent::create([
            'project_id' => $projectId,
            'branch_id' => $request->branch_id,
            'user_id' => auth()->id(),
            'title' => $request->title,
            'prompt' => $request->prompt,
            'exact_prompt' => filter_var($request->input('exact_prompt', false), FILTER_VALIDATE_BOOLEAN),
            'status' => 'pending',
        ]);

        $agent->load('branch');

        $queueService = app(ProjectOrchestratorQueueService::class);
        $queueService->enqueueWorkspaceAgent($agent);
        $agent->refresh();
        $queueService->tryDispatchNext($projectId);
        $agent->refresh();

        return response()->json([
            'success' => true,
            'data' => $this->formatAgent($agent),
        ], 201);
    }

    /**
     * GET /api/workspace/developer/projects/{projectId}/agents/{agentId}
     * Dettaglio singolo agente (per pagina lavorazione e polling live).
     */
    public function show(Request $request, int $projectId, int $agentId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);

        $agent = WorkspaceAgent::where('id', $agentId)
            ->where('project_id', $projectId)
            ->firstOrFail();

        $userId = auth()->id();
        $isPmOrAdmin = $this->isPmOrAdmin($project);

        if ($agent->user_id !== $userId && !$isPmOrAdmin) {
            abort(403, 'Non puoi visualizzare questo agente');
        }

        $agent->load('branch');

        $taskN8nService = app(TaskN8nService::class);
        if (in_array($agent->status, ['pending', 'running', 'review'], true) && !empty($agent->n8n_execution_id)) {
            $previousStatus = $agent->status;
            $taskN8nService->syncWorkspaceAgentFromOrchestrator($agent);
            $agent->refresh();
            $agent->load('branch');
            if (
                $previousStatus !== $agent->status
                && in_array($agent->status, ProjectOrchestratorQueueService::WORKSPACE_TERMINAL_STATUSES, true)
            ) {
                app(ProjectOrchestratorQueueService::class)->releaseProjectSlot($projectId);
                $agent->refresh();
                $agent->load('branch');
            }
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatAgent($agent),
        ]);
    }

    /**
     * PUT /api/workspace/developer/projects/{projectId}/agents/{agentId}
     * Aggiorna WorkspaceAgent (verifica che l'agente appartenga all'utente O sia PM del progetto).
     */
    public function update(Request $request, int $projectId, int $agentId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);
        
        $agent = WorkspaceAgent::where('id', $agentId)
            ->where('project_id', $projectId)
            ->firstOrFail();

        // Verifica accesso: l'agente deve appartenere all'utente O essere PM del progetto
        $userId = auth()->id();
        $isPmOrAdmin = $this->isPmOrAdmin($project);
        
        if ($agent->user_id !== $userId && !$isPmOrAdmin) {
            abort(403, 'Non puoi modificare questo agente');
        }

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'prompt' => 'nullable|string',
            'review_message' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $agent->update($request->only(['title', 'prompt', 'review_message']));
        $agent->load('branch');

        return response()->json([
            'success' => true,
            'data' => $this->formatAgent($agent),
        ]);
    }

    /**
     * POST /api/workspace/developer/projects/{projectId}/agents/{agentId}/actions
     * Gestisce azioni sull'agente (start, stop, restart, complete).
     */
    public function action(Request $request, int $projectId, int $agentId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);
        
        $agent = WorkspaceAgent::where('id', $agentId)
            ->where('project_id', $projectId)
            ->firstOrFail();

        // Verifica accesso: l'agente deve appartenere all'utente O essere PM del progetto
        $userId = auth()->id();
        $isPmOrAdmin = $this->isPmOrAdmin($project);
        
        if ($agent->user_id !== $userId && !$isPmOrAdmin) {
            abort(403, 'Non puoi controllare questo agente');
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:start,stop,restart,complete,request_review',
            'review_message' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $action = $request->action;
        $reviewMessage = $request->input('review_message');

        $queueService = app(ProjectOrchestratorQueueService::class);

        switch ($action) {
            case 'start':
                if ($agent->status !== 'pending') {
                    return response()->json([
                        'success' => false,
                        'message' => 'L\'agente deve essere in stato pending per essere avviato'
                    ], 422);
                }
                if ($queueService->hasActiveWork($projectId)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Un\'altra lavorazione è già in corso. Attendi il completamento o riordina la coda.'
                    ], 422);
                }
                if (!$queueService->canDispatchWorkspaceAgent($agent)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Questa lavorazione non è la prossima in coda. Spostala in cima o attendi il turno.'
                    ], 422);
                }
                app(TaskN8nService::class)->dispatchWorkspaceAgent($agent, $project);
                break;

            case 'stop':
                if (!in_array($agent->status, ['running', 'review'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'L\'agente deve essere in esecuzione o in review per essere fermato'
                    ], 422);
                }
                $agent->update([
                    'status' => 'stopped',
                    'completed_at' => now(),
                    'queue_position' => null,
                ]);
                $queueService->releaseProjectSlot($projectId);
                break;

            case 'restart':
                if ($reviewMessage) {
                    $agent->update(['review_message' => $reviewMessage]);
                }
                $agent->update([
                    'status' => 'pending',
                    'started_at' => null,
                    'logs' => null,
                    'completed_at' => null,
                    'n8n_execution_id' => null,
                    'queue_position' => null,
                ]);
                $agent->refresh();
                $queueService->bumpWorkspaceAgentToFront($agent);
                $queueService->tryDispatchNext($projectId);
                break;

            case 'complete':
                $agent->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'queue_position' => null,
                ]);
                $queueService->releaseProjectSlot($projectId);
                break;

            case 'request_review':
                if (!in_array($agent->status, ['review', 'completed', 'failed', 'stopped'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Richiesta review non disponibile nello stato attuale'
                    ], 422);
                }
                if ($reviewMessage) {
                    $agent->update(['review_message' => $reviewMessage]);
                }
                $agent->update([
                    'status' => 'pending',
                    'started_at' => null,
                    'logs' => null,
                    'completed_at' => null,
                    'n8n_execution_id' => null,
                    'queue_position' => null,
                ]);
                $agent->refresh();
                $queueService->bumpWorkspaceAgentToFront($agent);
                $queueService->tryDispatchNext($projectId);
                break;
        }

        $agent->load('branch');

        return response()->json([
            'success' => true,
            'data' => $this->formatAgent($agent),
        ]);
    }

    /**
     * POST /api/workspace/developer/projects/{projectId}/agents/{agentId}/trash
     * Soft-delete agent (move to cestino).
     */
    public function trash(Request $request, int $projectId, int $agentId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);
        $agent = $this->getAuthorizedAgent($projectId, $agentId);
        $queueService = app(ProjectOrchestratorQueueService::class);
        $wasPending = $agent->status === 'pending';
        $wasActive = in_array($agent->status, ProjectOrchestratorQueueService::ACTIVE_STATUSES, true);

        if ($wasPending) {
            $queueService->removeWorkspaceAgentFromQueue($agent);
        }

        $agent->delete();

        if ($wasPending || $wasActive) {
            $queueService->releaseProjectSlot($projectId);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatAgent($agent),
        ]);
    }

    /**
     * POST /api/workspace/developer/projects/{projectId}/agents/{agentId}/restore
     * Restore agent from cestino.
     */
    public function restore(Request $request, int $projectId, int $agentId): JsonResponse
    {
        $agent = WorkspaceAgent::onlyTrashed()
            ->where('id', $agentId)
            ->where('project_id', $projectId)
            ->firstOrFail();

        $project = $this->getUserAccessibleProject($projectId);
        $this->assertAgentAccess($agent, $project);

        $agent->restore();
        $agent->load('branch');

        $queueService = app(ProjectOrchestratorQueueService::class);
        if ($agent->status === 'pending') {
            $queueService->enqueueWorkspaceAgent($agent);
            $queueService->tryDispatchNext($projectId);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatAgent($agent),
        ]);
    }

    /**
     * PUT /api/workspace/developer/projects/{projectId}/agents/queue/reorder
     * Riordina le lavorazioni in coda (solo agenti pending).
     */
    public function reorderQueue(Request $request, int $projectId): JsonResponse
    {
        $project = $this->getUserAccessibleProject($projectId);

        $validator = Validator::make($request->all(), [
            'agent_ids' => 'required|array|min:1',
            'agent_ids.*' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $queueService = app(ProjectOrchestratorQueueService::class);
        $queueService->reorderWorkspaceQueue($projectId, $request->input('agent_ids', []));

        $userId = auth()->id();
        $isPmOrAdmin = $this->isPmOrAdmin($project);
        $agents = $this->fetchProjectAgents($projectId, $userId, $isPmOrAdmin, false, false);

        return response()->json([
            'success' => true,
            'data' => $agents->map(fn ($agent) => $this->formatAgent($agent))->values(),
        ]);
    }

    /**
     * DELETE /api/workspace/developer/projects/{projectId}/agents/{agentId}/force
     * Permanently delete a trashed agent.
     */
    public function forceDelete(Request $request, int $projectId, int $agentId): JsonResponse
    {
        $agent = WorkspaceAgent::onlyTrashed()
            ->where('id', $agentId)
            ->where('project_id', $projectId)
            ->firstOrFail();

        $project = $this->getUserAccessibleProject($projectId);
        $this->assertAgentAccess($agent, $project);

        $agent->forceDelete();

        return response()->json([
            'success' => true,
            'message' => 'Agente eliminato definitivamente',
        ]);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, WorkspaceAgent>
     */
    private function fetchProjectAgents(
        int $projectId,
        int $userId,
        bool $isPmOrAdmin,
        bool $onlyTrashed,
        bool $includeTrashed
    ) {
        $agentsQuery = WorkspaceAgent::where('project_id', $projectId);

        if ($onlyTrashed) {
            $agentsQuery->onlyTrashed();
        } elseif (!$includeTrashed) {
            $agentsQuery->whereNull('deleted_at');
        }

        if (!$isPmOrAdmin) {
            $agentsQuery->where('user_id', $userId);
        }

        return $agentsQuery->with('branch')->orderBy('created_at', 'desc')->get();
    }

    private function getAuthorizedAgent(int $projectId, int $agentId): WorkspaceAgent
    {
        $project = $this->getUserAccessibleProject($projectId);

        $agent = WorkspaceAgent::where('id', $agentId)
            ->where('project_id', $projectId)
            ->firstOrFail();

        $this->assertAgentAccess($agent, $project);

        return $agent;
    }

    private function assertAgentAccess(WorkspaceAgent $agent, $project): void
    {
        $userId = auth()->id();
        $isPmOrAdmin = $this->isPmOrAdmin($project);

        if ($agent->user_id !== $userId && !$isPmOrAdmin) {
            abort(403, 'Non puoi gestire questo agente');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function formatAgent(WorkspaceAgent $agent): array
    {
        return [
            'id' => $agent->id,
            'project_id' => $agent->project_id,
            'branch_id' => $agent->branch_id,
            'user_id' => $agent->user_id,
            'title' => $agent->title,
            'prompt' => $agent->prompt,
            'exact_prompt' => (bool) $agent->exact_prompt,
            'status' => $agent->status,
            'n8n_workflow_id' => $agent->n8n_workflow_id,
            'n8n_execution_id' => $agent->n8n_execution_id,
            'queue_position' => $agent->queue_position,
            'logs' => $agent->logs,
            'result' => $agent->result,
            'review_message' => $agent->review_message,
            'started_at' => $agent->started_at?->format('c'),
            'completed_at' => $agent->completed_at?->format('c'),
            'deleted_at' => $agent->deleted_at?->format('c'),
            'created_at' => $agent->created_at?->format('c'),
            'updated_at' => $agent->updated_at?->format('c'),
            'branch' => $agent->branch ? [
                'id' => $agent->branch->id,
                'name' => $agent->branch->name,
                'color' => $agent->branch->color,
            ] : null,
        ];
    }

    /**
     * POST /api/workspace/agents/{agentId}/n8n-callback
     * Endpoint pubblico (NO auth middleware) per callback da n8n.
     */
    public function n8nCallback(Request $request, int $agentId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => 'nullable|string',
            'logs' => 'nullable|string',
            'result' => 'nullable|string',
            'execution_id' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            Log::warning("N8N callback validation failed for agent {$agentId}", [
                'errors' => $validator->errors()->toArray(),
                'payload' => $request->all()
            ]);
            return response()->json(['success' => false], 422);
        }

        $agent = WorkspaceAgent::find($agentId);

        if (!$agent) {
            Log::warning("N8N callback for non-existent agent {$agentId}");
            return response()->json(['success' => false], 404);
        }

        try {
            $taskN8nService = app(TaskN8nService::class);
            $updateData = [];

            if ($request->has('status')) {
                $status = $taskN8nService->mapOrchestratorStatusToAgentStatus((string) $request->status);
                $updateData['status'] = $status;

                if (in_array($status, ['running', 'review', 'completed', 'failed', 'stopped'], true)) {
                    $updateData['queue_position'] = null;
                }

                if (in_array($status, ['completed', 'failed', 'stopped'], true)) {
                    $updateData['completed_at'] = now();
                }
            } elseif ($request->has('event')) {
                $event = (string) $request->event;
                if (str_ends_with($event, '.completed')) {
                    $updateData['status'] = 'completed';
                    $updateData['completed_at'] = now();
                    $updateData['queue_position'] = null;
                } elseif (str_ends_with($event, '.failed')) {
                    $updateData['status'] = 'failed';
                    $updateData['completed_at'] = now();
                } elseif (str_ends_with($event, '.cancelled')) {
                    $updateData['status'] = 'stopped';
                    $updateData['completed_at'] = now();
                }
            }
            
            if ($request->has('logs')) {
                $logs = $request->logs;
                // Parsing robusto - può essere string o array
                if (is_array($logs)) {
                    $updateData['logs'] = json_encode($logs, JSON_UNESCAPED_UNICODE);
                } else {
                    $updateData['logs'] = (string) $logs;
                }
            }
            
            if ($request->has('result')) {
                $result = $request->result;
                // Parsing robusto - può essere string o array/object
                if (is_array($result) || is_object($result)) {
                    $updateData['result'] = json_encode($result, JSON_UNESCAPED_UNICODE);
                } else {
                    $updateData['result'] = (string) $result;
                }
            }

            $executionId = $request->execution_id
                ?? $request->job_id
                ?? $request->run_id
                ?? $request->orchestrator_job_id;
            if (!empty($executionId)) {
                $updateData['n8n_execution_id'] = (string) $executionId;
            }

            if ($request->filled('error_message') || $request->filled('error')) {
                $updateData['result'] = (string) ($request->error_message ?? $request->error);
            }

            $agent->update($updateData);
            $agent->refresh();

            $terminalStatuses = ['completed', 'failed', 'stopped'];
            $logStatus = $updateData['status'] ?? $agent->status;
            $shouldAppendLog = $request->filled('message')
                || $request->filled('task_preview')
                || in_array($logStatus, $terminalStatuses, true);

            if ($shouldAppendLog) {
                $title = 'Orchestrator Update';
                if ($logStatus === 'completed') {
                    $title = 'Agent Completed';
                } elseif ($logStatus === 'failed') {
                    $title = 'Agent Failed';
                } elseif ($logStatus === 'running') {
                    $title = 'Agent Started';
                }

                $taskN8nService->appendWorkspaceAgentLog($agent, [
                    'step_key' => in_array($logStatus, $terminalStatuses, true)
                        ? ('task_' . $logStatus)
                        : ('orchestrator_callback_' . time()),
                    'title' => $title,
                    'message' => (string) ($request->message ?? $request->task_preview ?? $title),
                    'status' => $logStatus,
                    'payload' => $request->all(),
                ]);
            }

            // Send in-app notifications for status changes
            if ($request->has('status') && is_string($request->status)) {
                $this->sendAgentStatusNotification($agent, $request->status);
            }

            Log::info("N8N callback processed for agent {$agent->id}", [
                'agent_id' => $agent->id,
                'project_id' => $agent->project_id,
                'status' => $request->status,
                'has_logs' => $request->has('logs'),
                'has_result' => $request->has('result'),
                'execution_id' => $request->execution_id
            ]);

            if (in_array($agent->status, ProjectOrchestratorQueueService::WORKSPACE_TERMINAL_STATUSES, true)) {
                app(ProjectOrchestratorQueueService::class)->releaseProjectSlot($agent->project_id);
            }

            // TODO: Broadcasting evento se il progetto usa Laravel Echo/Pusher/Reverb
            // broadcast(new AgentStatusUpdated($agent))->toOthers();

        } catch (\Exception $e) {
            Log::error("N8N callback processing failed for agent {$agentId}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'payload' => $request->all()
            ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Send in-app notification for agent status changes
     */
    private function sendAgentStatusNotification(WorkspaceAgent $agent, string $status): void
    {
        try {
            // Find the agent owner
            $user = User::find($agent->user_id);
            if (!$user) {
                return;
            }

            // Create notification based on status
            switch ($status) {
                case 'review':
                    Log::info("Agent {$agent->id} requires review - notification created", [
                        'agent_id' => $agent->id,
                        'user_id' => $user->id,
                        'title' => $agent->title
                    ]);
                    // TODO: send in-app notification when notification system is available
                    break;
                    
                case 'completed':
                    Log::info("Agent {$agent->id} completed - notification created", [
                        'agent_id' => $agent->id,
                        'user_id' => $user->id,
                        'title' => $agent->title
                    ]);
                    // TODO: send in-app notification when notification system is available
                    break;
                    
                case 'failed':
                    Log::info("Agent {$agent->id} failed - notification created", [
                        'agent_id' => $agent->id,
                        'user_id' => $user->id,
                        'title' => $agent->title
                    ]);
                    // TODO: send in-app notification when notification system is available
                    break;
            }
        } catch (\Exception $e) {
            Log::error("Failed to send agent status notification", [
                'agent_id' => $agent->id,
                'status' => $status,
                'error' => $e->getMessage()
            ]);
        }
    }
}