<?php

namespace App\Http\Controllers;

use App\Models\CrmProjectTask;
use App\Models\WorkspaceAgent;
use App\Services\TaskN8nService;
use App\Services\ProjectOrchestratorQueueService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class N8nTaskWebhookController extends Controller
{
    protected TaskN8nService $taskN8nService;

    public function __construct(TaskN8nService $taskN8nService)
    {
        $this->taskN8nService = $taskN8nService;
    }

    /**
     * POST /api/webhooks/n8n/task-events
     * Append step/event to task
     */
    public function taskEvents(Request $request)
    {
        if (!$this->verifyAuth($request)) {
            return $this->unauthorizedResponse();
        }

        try {
            $payload = $request->all();
            $taskId = $payload['task_id'] ?? null;

            if (!$taskId) {
                return response()->json([
                    'success' => false,
                    'message' => 'task_id is required'
                ], 422);
            }

            $parsed = $this->taskN8nService->parseOrchestratorTaskId($taskId);
            if ($parsed && $parsed['type'] === 'workspace') {
                $agent = WorkspaceAgent::findOrFail($parsed['id']);
                $this->taskN8nService->appendWorkspaceAgentLog($agent, $payload);

                return response()->json([
                    'success' => true,
                    'message' => 'Workspace agent event logged successfully',
                ]);
            }

            $task = CrmProjectTask::findOrFail($parsed['id'] ?? $taskId);

            // Append step/event
            $this->taskN8nService->appendStep($task, [
                'step_key' => $payload['step_key'] ?? 'event_' . time(),
                'title' => $payload['title'] ?? 'N8N Event',
                'message' => $payload['message'] ?? $payload['description'] ?? '',
                'status' => $payload['status'] ?? 'completed',
                'payload' => $payload,
                'sort_order' => $payload['sort_order'] ?? (time() + 1000)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Event logged successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('N8N task-events webhook failed', [
                'error' => $e->getMessage(),
                'payload' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process event'
            ], 500);
        }
    }

    /**
     * POST /api/webhooks/n8n/status
     * Update task n8n_status and progress
     */
    public function status(Request $request)
    {
        if (!$this->verifyAuth($request)) {
            return $this->unauthorizedResponse();
        }

        try {
            $payload = $request->all();
            $taskId = $payload['task_id'] ?? null;

            if (!$taskId) {
                return response()->json([
                    'success' => false,
                    'message' => 'task_id is required'
                ], 422);
            }

            $parsed = $this->taskN8nService->parseOrchestratorTaskId($taskId);
            if ($parsed && $parsed['type'] === 'workspace') {
                $agent = WorkspaceAgent::find($parsed['id']);

                if (!$agent) {
                    Log::warning('N8N status webhook: workspace agent not found', [
                        'task_id' => $taskId,
                        'project_id' => $payload['project_id'] ?? null,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Workspace agent not found',
                    ], 404);
                }

                $updateData = $this->taskN8nService->buildWorkspaceAgentStatusUpdate($payload);
                if (!empty($updateData)) {
                    $agent->update($updateData);
                }

                if (!empty($payload['message']) || !empty($payload['title'])) {
                    $this->taskN8nService->appendWorkspaceAgentLog($agent->fresh(), $payload);
                }

                $agent->refresh();
                if (in_array($agent->status, ProjectOrchestratorQueueService::WORKSPACE_TERMINAL_STATUSES, true)) {
                    $this->releaseProjectOrchestratorSlot($agent->project_id);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Workspace agent status updated successfully',
                    'task_id' => $taskId,
                    'status' => $agent->status,
                ]);
            }

            $task = CrmProjectTask::find($parsed['id'] ?? $taskId);

            if (!$task) {
                Log::warning('N8N status webhook: task not found', [
                    'task_id' => $taskId,
                    'project_id' => $payload['project_id'] ?? null,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Task not found'
                ], 404);
            }

            $updateData = $this->taskN8nService->buildStatusCallbackUpdate($payload);

            if (!empty($updateData)) {
                $task->update($updateData);
            }

            $task->refresh();
            if (in_array($task->n8n_status, ProjectOrchestratorQueueService::CRM_TERMINAL_N8N_STATUSES, true)) {
                $this->releaseProjectOrchestratorSlot($task->crm_project_id);
            }

            $statusLabel = $updateData['n8n_status'] ?? ($payload['status'] ?? $payload['n8n_status'] ?? 'updated');

            try {
                $this->taskN8nService->appendStep($task, [
                    'step_key' => 'status_update_' . time(),
                    'title' => 'Status Update',
                    'message' => $payload['message'] ?? "Status updated to {$statusLabel}",
                    'status' => 'completed',
                    'payload' => $payload,
                    'sort_order' => time() + 2000
                ]);
            } catch (\Exception $stepError) {
                Log::warning('N8N status webhook: step log failed (status update still applied)', [
                    'task_id' => $taskId,
                    'error' => $stepError->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Status updated successfully',
                'task_id' => (int) $task->id,
                'n8n_status' => $task->fresh()->n8n_status,
            ]);

        } catch (\Exception $e) {
            Log::error('N8N status webhook failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'payload' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update status'
            ], 500);
        }
    }

    /**
     * POST /api/webhooks/n8n/completed
     * Mark task as completed with n8n_response
     */
    public function completed(Request $request)
    {
        if (!$this->verifyAuth($request)) {
            return $this->unauthorizedResponse();
        }

        try {
            $payload = $request->all();
            $taskId = $payload['task_id'] ?? null;

            if (!$taskId) {
                return response()->json([
                    'success' => false,
                    'message' => 'task_id is required'
                ], 422);
            }

            $parsed = $this->taskN8nService->parseOrchestratorTaskId($taskId);
            if ($parsed && $parsed['type'] === 'workspace') {
                $agent = WorkspaceAgent::findOrFail($parsed['id']);
                $updateData = $this->taskN8nService->buildWorkspaceAgentStatusUpdate($payload);
                if (empty($updateData['status'])) {
                    $updateData['status'] = 'completed';
                }
                if (in_array($updateData['status'], ['completed', 'failed', 'stopped'], true)) {
                    $updateData['completed_at'] = now();
                }
                if (isset($payload['result'])) {
                    $updateData['result'] = is_array($payload['result']) || is_object($payload['result'])
                        ? json_encode($payload['result'], JSON_UNESCAPED_UNICODE)
                        : (string) $payload['result'];
                }
                $agent->update($updateData);
                $finalStatus = $updateData['status'];
                $this->taskN8nService->appendWorkspaceAgentLog($agent->fresh(), [
                    'step_key' => 'task_completed',
                    'title' => $finalStatus === 'failed' ? 'Agent Failed' : 'Agent Completed',
                    'message' => $payload['message'] ?? (
                        $finalStatus === 'failed'
                            ? 'Workspace agent failed in orchestrator'
                            : 'Workspace agent completed by N8N orchestrator'
                    ),
                    'status' => $finalStatus,
                    'payload' => $payload,
                ]);

                $this->releaseProjectOrchestratorSlot($agent->project_id);

                return response()->json([
                    'success' => true,
                    'message' => 'Workspace agent marked as completed',
                ]);
            }

            $task = CrmProjectTask::findOrFail($parsed['id'] ?? $taskId);

            $updateData = [
                'n8n_status' => 'completed',
                'n8n_completed_at' => now(),
                'progress' => 100,
                'n8n_response' => $payload,
                'n8n_response_format' => 'webhook_completed'
            ];

            // Auto-complete task if execution_mode is 'agent'
            if ($task->execution_mode === 'agent') {
                $updateData['status'] = 'completed';
                $updateData['completed_date'] = now();
            }

            $task->update($updateData);

            // Log completion
            $this->taskN8nService->appendStep($task, [
                'step_key' => 'task_completed',
                'title' => 'Task Completed',
                'message' => $payload['message'] ?? 'Task completed by N8N orchestrator',
                'status' => 'completed',
                'payload' => $payload,
                'sort_order' => time() + 3000
            ]);

            $this->releaseProjectOrchestratorSlot($task->crm_project_id);

            return response()->json([
                'success' => true,
                'message' => 'Task marked as completed'
            ]);

        } catch (\Exception $e) {
            Log::error('N8N completed webhook failed', [
                'error' => $e->getMessage(),
                'payload' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to complete task'
            ], 500);
        }
    }

    /**
     * POST /api/webhooks/n8n/task-log
     * Append log step to task
     */
    public function taskLog(Request $request)
    {
        if (!$this->verifyAuth($request)) {
            return $this->unauthorizedResponse();
        }

        try {
            $payload = $request->all();
            $taskId = $payload['task_id'] ?? null;

            if (!$taskId) {
                return response()->json([
                    'success' => false,
                    'message' => 'task_id is required'
                ], 422);
            }

            $parsed = $this->taskN8nService->parseOrchestratorTaskId($taskId);
            if ($parsed && $parsed['type'] === 'workspace') {
                $agent = WorkspaceAgent::findOrFail($parsed['id']);
                $this->taskN8nService->appendWorkspaceAgentLog($agent, $payload);

                return response()->json([
                    'success' => true,
                    'message' => 'Workspace agent log entry added successfully',
                ]);
            }

            $task = CrmProjectTask::findOrFail($parsed['id'] ?? $taskId);

            // Append log step
            $this->taskN8nService->appendStep($task, [
                'step_key' => $payload['step_key'] ?? 'log_' . time(),
                'title' => $payload['title'] ?? 'Log Entry',
                'message' => $payload['message'] ?? $payload['log_message'] ?? '',
                'status' => $payload['status'] ?? 'completed',
                'payload' => $payload,
                'sort_order' => $payload['sort_order'] ?? (time() + 4000)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Log entry added successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('N8N task-log webhook failed', [
                'error' => $e->getMessage(),
                'payload' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to add log entry'
            ], 500);
        }
    }

    /**
     * POST /api/webhooks/n8n/close-task
     * Close task and set status to completed
     */
    public function closeTask(Request $request)
    {
        if (!$this->verifyAuth($request)) {
            return $this->unauthorizedResponse();
        }

        try {
            $payload = $request->all();
            $taskId = $payload['task_id'] ?? null;

            if (!$taskId) {
                return response()->json([
                    'success' => false,
                    'message' => 'task_id is required'
                ], 422);
            }

            $parsed = $this->taskN8nService->parseOrchestratorTaskId($taskId);
            if ($parsed && $parsed['type'] === 'workspace') {
                $agent = WorkspaceAgent::findOrFail($parsed['id']);
                $agent->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);
                $this->taskN8nService->appendWorkspaceAgentLog($agent->fresh(), [
                    'step_key' => 'task_closed',
                    'title' => 'Agent Closed',
                    'message' => $payload['message'] ?? 'Workspace agent closed by N8N orchestrator',
                    'status' => 'completed',
                    'payload' => $payload,
                ]);

                $this->releaseProjectOrchestratorSlot($agent->project_id);

                return response()->json([
                    'success' => true,
                    'message' => 'Workspace agent closed successfully',
                ]);
            }

            $task = CrmProjectTask::findOrFail($parsed['id'] ?? $taskId);

            $updateData = [
                'status' => 'completed',
                'completed_date' => now(),
                'n8n_status' => 'completed',
                'n8n_completed_at' => now(),
                'progress' => 100,
                'n8n_response' => $payload,
                'n8n_response_format' => 'webhook_close'
            ];

            $task->update($updateData);

            // Log task closure
            $this->taskN8nService->appendStep($task, [
                'step_key' => 'task_closed',
                'title' => 'Task Closed',
                'message' => $payload['message'] ?? 'Task closed by N8N orchestrator',
                'status' => 'completed',
                'payload' => $payload,
                'sort_order' => time() + 5000
            ]);

            $this->releaseProjectOrchestratorSlot($task->crm_project_id);

            return response()->json([
                'success' => true,
                'message' => 'Task closed successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('N8N close-task webhook failed', [
                'error' => $e->getMessage(),
                'payload' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to close task'
            ], 500);
        }
    }

    private function releaseProjectOrchestratorSlot(mixed $projectId): void
    {
        if ($projectId === null || $projectId === '') {
            return;
        }

        app(ProjectOrchestratorQueueService::class)->releaseProjectSlot((int) $projectId);
    }

    /**
     * Verify callback authentication
     */
    private function verifyAuth(Request $request): bool
    {
        return $this->taskN8nService->verifyCallbackAuth($request);
    }

    /**
     * Return unauthorized response
     */
    private function unauthorizedResponse()
    {
        return response()->json([
            'success' => false,
            'message' => 'Authentication failed'
        ], 401);
    }
}