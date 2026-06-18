<?php

namespace App\Services;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskN8nStep;
use App\Models\CrmProjectWorkspaceSetting;
use App\Models\WorkspaceAgent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class TaskN8nService
{
    /**
     * Check if N8N integration is enabled
     */
    public function isEnabled(): bool
    {
        return config('services.n8n.enabled', false) && 
               !empty(config('services.n8n.webhook_url'));
    }

    /**
     * Accoda un task CRM e avvia il prossimo slot libero del progetto.
     */
    public function dispatchTaskAgent(CrmProjectTask $task, CrmProject $project): void
    {
        $this->enqueueTaskAgent($task, $project);
    }

    /**
     * Accoda un task CRM nel gestionale (non invia subito all'orchestratore).
     */
    public function enqueueTaskAgent(CrmProjectTask $task, CrmProject $project): void
    {
        if (!$this->isEnabled()) {
            Log::warning('N8N not enabled, skipping task enqueue', ['task_id' => $task->id]);
            return;
        }

        if (empty($project->github_url)) {
            throw new Exception('github_url del progetto richiesto per avviare l\'agent orchestrator');
        }

        $queue = app(ProjectOrchestratorQueueService::class);
        $queue->enqueueCrmTask($task);
        $queue->tryDispatchNext($project->id);
    }

    /**
     * Invio effettivo di un task CRM all'orchestratore (chiamato dalla coda).
     */
    public function sendTaskToOrchestrator(CrmProjectTask $task, CrmProject $project): void
    {
        if (!$this->isEnabled()) {
            return;
        }

        if (empty($project->github_url)) {
            throw new Exception('github_url del progetto richiesto per avviare l\'agent orchestrator');
        }

        try {
            $task->loadMissing('crmLabel');

            $task->update([
                'n8n_status' => 'processing',
                'n8n_queue_position' => null,
                'n8n_error' => null,
                'n8n_response' => null,
            ]);

            $payload = $this->buildOrchestratorPayload($task, $project);

            Log::info('Sending CRM task to orchestrator', [
                'task_id' => $task->id,
                'project_id' => $project->id,
            ]);

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                config('services.n8n.webhook_auth_header') => config('services.n8n.webhook_auth_value'),
            ])
                ->timeout(config('services.n8n.start_timeout_seconds', 30))
                ->post(config('services.n8n.webhook_url'), $payload);

            if ($response->successful()) {
                $responseData = $response->json();

                $task->update([
                    'n8n_execution_id' => $responseData['run_id'] ?? $responseData['orchestrator_job_id'] ?? null,
                    'n8n_response' => $responseData,
                    'n8n_response_format' => 'orchestrator_api',
                ]);

                $this->appendStep($task, [
                    'step_key' => 'orchestrator_queued',
                    'title' => 'Task inviato all\'orchestratore',
                    'message' => 'Task in coda orchestrator (pos. ' . ($responseData['queue_position'] ?? '?') . ')',
                    'status' => 'completed',
                    'payload' => $responseData,
                    'sort_order' => 1,
                ]);
            } else {
                $errorMessage = "HTTP {$response->status()}: " . $response->body();
                $task->update([
                    'n8n_status' => 'failed',
                    'n8n_error' => $errorMessage,
                ]);
                throw new Exception($errorMessage);
            }
        } catch (Exception $e) {
            $task->update([
                'n8n_status' => 'failed',
                'n8n_error' => $e->getMessage(),
            ]);

            Log::error('Exception sending CRM task to orchestrator', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Invio effettivo di una lavorazione workspace all'orchestratore (chiamato dalla coda).
     */
    public function dispatchWorkspaceAgent(
        WorkspaceAgent $agent,
        CrmProject $project,
        ?string $revisionFeedback = null
    ): void {
        if (!$this->isEnabled()) {
            Log::warning('N8N orchestrator not enabled, skipping workspace agent dispatch', [
                'agent_id' => $agent->id,
                'project_id' => $project->id,
            ]);
            return;
        }

        if (empty($project->github_url)) {
            $agent->update(['status' => 'failed']);
            throw new Exception('github_url del progetto mancante');
        }

        $agent->update([
            'status' => 'running',
            'queue_position' => null,
            'started_at' => now(),
            'logs' => null,
        ]);

        try {
            $workspaceSetting = CrmProjectWorkspaceSetting::where('project_id', $agent->project_id)
                ->where('workspace_type_code', 'developer')
                ->first();

            $exactPrompt = (bool) $agent->exact_prompt;
            $dedicatedPrompt = $this->buildDedicatedPrompt($agent->title, $agent->prompt, $exactPrompt);
            $isRevision = !empty($revisionFeedback);

            $payload = array_merge(
                $this->buildOrchestratorCallbackFields(),
                [
                    'dedicated_prompt' => $dedicatedPrompt,
                    'exact_prompt' => $exactPrompt,
                    'github_url' => $project->github_url,
                    'project_id' => (string) $agent->project_id,
                    'task_id' => 'workspace_agent_' . $agent->id,
                    'specialist_role' => 'general',
                    'crm_log_url' => route('workspace.agent.n8n-callback', ['agentId' => $agent->id]),
                    'is_revision' => $isRevision,
                    'revision_feedback' => $isRevision ? $revisionFeedback : null,
                    'triggered_at' => now()->toISOString(),
                ]
            );

            if ($workspaceSetting?->staging_url) {
                $payload['staging_url'] = $workspaceSetting->staging_url;
            }
            if (!empty($project->website_url)) {
                $payload['website_url'] = $project->website_url;
            }

            Log::info('Dispatching workspace agent to orchestrator', [
                'agent_id' => $agent->id,
                'project_id' => $project->id,
            ]);

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                config('services.n8n.webhook_auth_header') => config('services.n8n.webhook_auth_value'),
            ])
                ->timeout(config('services.n8n.start_timeout_seconds', 30))
                ->post(config('services.n8n.webhook_url'), $payload);

            if ($response->successful()) {
                $responseData = $response->json();
                $executionId = $responseData['run_id'] ?? $responseData['orchestrator_job_id'] ?? null;

                if ($executionId) {
                    $agent->update(['n8n_execution_id' => $executionId]);
                }

                $this->appendWorkspaceAgentLog($agent->fresh(), [
                    'step_key' => 'orchestrator_queued',
                    'title' => 'Agente inviato all\'orchestratore',
                    'message' => $executionId
                        ? "Lavorazione in orchestrator (run: {$executionId})"
                        : 'Lavorazione inviata all\'orchestratore',
                    'status' => 'completed',
                    'payload' => $responseData,
                ]);
            } else {
                $errorMessage = "HTTP {$response->status()}: " . $response->body();
                $agent->update(['status' => 'failed']);
                throw new Exception($errorMessage);
            }
        } catch (Exception $e) {
            $agent->update(['status' => 'failed']);
            Log::error('Exception dispatching workspace agent to orchestrator', [
                'agent_id' => $agent->id,
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Build payload for orchestrator API
     */
    private function buildOrchestratorPayload(CrmProjectTask $task, CrmProject $project): array
    {
        // Load necessary relationships
        $task->load(['assignments.user', 'creator']);
        
        // Determine stack from project settings or default to 'html'
        $stack = 'html';
        if (!empty($project->settings) && isset($project->settings['stack'])) {
            $stack = $project->settings['stack'];
        }
        
        // Build assignments array
        $assignments = [];
        if ($task->assignments) {
            foreach ($task->assignments as $assignment) {
                if ($assignment->is_active && $assignment->user) {
                    $assignments[] = [
                        'user_id' => $assignment->user->id,
                        'name' => $assignment->user->name,
                        'email' => $assignment->user->email,
                    ];
                }
            }
        }
        
        $exactPrompt = (bool) $task->exact_prompt;
        $dedicatedPrompt = $this->buildDedicatedPrompt(
            $task->title,
            $task->description,
            $exactPrompt
        );

        // Build complete payload with all required fields
        $payload = [
            'task_id' => (int)$task->id,
            'project_id' => (int)$project->id,
            'project_name' => $project->name,
            'github_url' => $project->github_url ?: '',
            'website_url' => $project->website_url ?: '',
            'stack' => $stack,
            'execution_mode' => $task->execution_mode ?: 'agent',
            'exact_prompt' => $exactPrompt,
            'dedicated_prompt' => $dedicatedPrompt,
            'title' => $task->title,
            'description' => $task->description ?: '',
            'status' => $task->status,
            'n8n_status' => 'processing',
            'priority' => $task->priority ?: 'medium',
            'start_date' => $task->start_date ? $task->start_date->toISOString() : null,
            'due_date' => $task->due_date ? $task->due_date->toISOString() : null,
            'assignments' => $assignments,
            'created_by' => [
                'id' => $task->creator->id,
                'name' => $task->creator->name,
                'email' => $task->creator->email,
            ],
            ...$this->buildOrchestratorCallbackFields(),
            'triggered_at' => now()->toISOString(),
            'is_revision' => isset($task->is_revision) ? $task->is_revision : false,
            'revision_feedback' => isset($task->revision_feedback) ? $task->revision_feedback : null,
        ];

        return $payload;
    }

    /**
     * Shared callback URL fields for CRM tasks and workspace agents.
     */
    public function buildOrchestratorCallbackFields(): array
    {
        $fields = [
            'callback_url' => url('/api/webhooks/n8n/task-events'),
            'callback_status_url' => url('/api/webhooks/n8n/status'),
            'callback_completed_url' => url('/api/webhooks/n8n/completed'),
            'callback_task_log_url' => url('/api/webhooks/n8n/task-log'),
            'callback_close_task_url' => url('/api/webhooks/n8n/close-task'),
            'callback_auth_header' => config('services.n8n.callback_auth_header'),
        ];

        $callbackAuthValue = config('services.n8n.callback_auth_value');
        if (!empty($callbackAuthValue)) {
            $fields['crm_auth_token'] = $callbackAuthValue;
        }

        return $fields;
    }

    /**
     * Parse orchestrator task_id into CRM task or workspace agent reference.
     *
     * @return array{type: 'crm'|'workspace', id: int}|null
     */
    public function parseOrchestratorTaskId(mixed $taskId): ?array
    {
        if (is_string($taskId) && str_starts_with($taskId, 'workspace_agent_')) {
            $id = (int) substr($taskId, strlen('workspace_agent_'));

            return $id > 0 ? ['type' => 'workspace', 'id' => $id] : null;
        }

        if (is_numeric($taskId)) {
            $id = (int) $taskId;

            return $id > 0 ? ['type' => 'crm', 'id' => $id] : null;
        }

        return null;
    }

    /**
     * Build update payload for workspace agent status callbacks.
     */
    public function buildWorkspaceAgentStatusUpdate(array $payload): array
    {
        $updateData = [];

        $rawStatus = $payload['n8n_status'] ?? $payload['status'] ?? null;
        if ($rawStatus !== null && $rawStatus !== '') {
            $updateData['status'] = $this->mapOrchestratorStatusToAgentStatus((string) $rawStatus);
        }

        $executionId = $payload['run_id']
            ?? $payload['orchestrator_job_id']
            ?? $payload['n8n_execution_id']
            ?? $payload['execution_id']
            ?? null;
        if (!empty($executionId)) {
            $updateData['n8n_execution_id'] = (string) $executionId;
        }

        if (array_key_exists('queue_position', $payload)) {
            $updateData['queue_position'] = $payload['queue_position'] !== null
                ? (int) $payload['queue_position']
                : null;
        }

        $mappedStatus = $updateData['status'] ?? null;
        if (in_array($mappedStatus, ['running', 'review', 'completed', 'failed', 'stopped'], true)) {
            $updateData['queue_position'] = null;
        } elseif ($mappedStatus === 'pending') {
            // Mantieni in coda CRM finché l'orchestratore non avvia davvero il job
        }

        if (in_array($mappedStatus, ['completed', 'failed', 'stopped'], true)) {
            $updateData['completed_at'] = now();
        }

        if (isset($payload['result'])) {
            $result = $payload['result'];
            $updateData['result'] = is_array($result) || is_object($result)
                ? json_encode($result, JSON_UNESCAPED_UNICODE)
                : (string) $result;
        } elseif (in_array($mappedStatus, ['failed'], true)) {
            $error = $payload['error'] ?? $payload['message'] ?? null;
            if (!empty($error)) {
                $updateData['result'] = (string) $error;
            }
        }

        return $updateData;
    }

    /**
     * Derive orchestrator API base URL from N8N_WEBHOOK_URL (execute-agent endpoint).
     */
    public function getOrchestratorApiBaseUrl(): ?string
    {
        $webhookUrl = config('services.n8n.webhook_url');
        if (empty($webhookUrl) || !is_string($webhookUrl)) {
            return null;
        }

        $parsed = parse_url($webhookUrl);
        if (!$parsed || empty($parsed['scheme']) || empty($parsed['host'])) {
            return null;
        }

        $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';

        return $parsed['scheme'] . '://' . $parsed['host'] . $port;
    }

    /**
     * Poll orchestrator for job status (fallback when CRM callbacks are missed).
     */
    public function fetchOrchestratorJobStatus(string $jobId): ?array
    {
        $baseUrl = $this->getOrchestratorApiBaseUrl();
        if (!$baseUrl) {
            return null;
        }

        $url = rtrim($baseUrl, '/') . '/api/v1/jobs/' . rawurlencode($jobId) . '/legacy';
        $authHeader = config('services.n8n.webhook_auth_header');
        $authValue = config('services.n8n.webhook_auth_value');

        try {
            $request = Http::timeout(10);
            if (!empty($authHeader) && !empty($authValue)) {
                $request = $request->withHeaders([$authHeader => $authValue]);
            }

            $response = $request->get($url);
            if ($response->successful()) {
                $data = $response->json();
                return is_array($data) ? $data : null;
            }

            Log::warning('Orchestrator job status poll failed', [
                'job_id' => $jobId,
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 500),
            ]);
        } catch (Exception $e) {
            Log::warning('Orchestrator job status poll exception', [
                'job_id' => $jobId,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Sync CRM task state from orchestrator when callbacks are missing or delayed.
     */
    public function syncCrmTaskFromOrchestrator(CrmProjectTask $task): bool
    {
        if (empty($task->n8n_execution_id) || $task->n8n_status !== 'processing') {
            return false;
        }

        $jobStatus = $this->fetchOrchestratorJobStatus($task->n8n_execution_id);
        if (!$jobStatus) {
            return false;
        }

        return $this->applyOrchestratorJobStatusToCrmTask($task, $jobStatus, 'poll');
    }

    /**
     * Apply orchestrator job status to a CRM task.
     */
    public function applyOrchestratorJobStatusToCrmTask(
        CrmProjectTask $task,
        array $jobStatus,
        string $source = 'callback'
    ): bool {
        $rawStatus = strtolower((string) ($jobStatus['status'] ?? ''));
        if ($rawStatus === '') {
            return false;
        }

        $mappedStatus = $this->mapOrchestratorStatus($rawStatus);
        $previousStatus = $task->n8n_status;
        $updateData = [];

        if ($mappedStatus !== $previousStatus) {
            $updateData['n8n_status'] = $mappedStatus;
        }

        if (in_array($mappedStatus, ['completed', 'failed', 'skipped'], true)) {
            $updateData['n8n_completed_at'] = now();
            $updateData['n8n_queue_position'] = null;
            $updateData['n8n_response'] = array_merge($task->n8n_response ?? [], [
                'sync_source' => $source,
                'job_status' => $jobStatus,
            ]);

            if ($mappedStatus === 'completed') {
                $updateData['progress'] = 100;
                if ($task->execution_mode === 'agent') {
                    $updateData['status'] = 'completed';
                    $updateData['completed_date'] = now();
                }
            } elseif ($mappedStatus === 'failed') {
                $updateData['n8n_error'] = $jobStatus['error_message'] ?? 'Task failed in orchestrator';
            }
        }

        if (empty($updateData)) {
            return false;
        }

        $task->update($updateData);
        $task->refresh();

        if (in_array($task->n8n_status, ProjectOrchestratorQueueService::CRM_TERMINAL_N8N_STATUSES, true)) {
            app(ProjectOrchestratorQueueService::class)->releaseProjectSlot($task->crm_project_id);
        }

        return true;
    }

    /**
     * Sync workspace agent state from orchestrator when callbacks are missing or delayed.
     */
    public function syncWorkspaceAgentFromOrchestrator(WorkspaceAgent $agent): bool
    {
        if (empty($agent->n8n_execution_id)) {
            return false;
        }

        if (!in_array($agent->status, ['pending', 'running', 'review'], true)) {
            return false;
        }

        $jobStatus = $this->fetchOrchestratorJobStatus($agent->n8n_execution_id);
        if (!$jobStatus) {
            return false;
        }

        return $this->applyOrchestratorJobStatusToAgent($agent, $jobStatus, 'poll');
    }

    /**
     * Apply orchestrator job status payload to a workspace agent record.
     */
    public function applyOrchestratorJobStatusToAgent(
        WorkspaceAgent $agent,
        array $jobStatus,
        string $source = 'callback'
    ): bool {
        $rawStatus = strtolower((string) ($jobStatus['status'] ?? ''));
        if ($rawStatus === '') {
            return false;
        }

        $mappedStatus = $this->mapOrchestratorStatusToAgentStatus($rawStatus);
        $previousStatus = $agent->status;
        $updateData = [];

        if ($mappedStatus !== $previousStatus) {
            $updateData['status'] = $mappedStatus;
        }

        if (in_array($mappedStatus, ['running', 'review', 'completed', 'failed', 'stopped'], true)) {
            $updateData['queue_position'] = null;
        }

        if (in_array($mappedStatus, ['completed', 'failed', 'stopped'], true)) {
            $updateData['completed_at'] = now();
            $updateData['result'] = json_encode([
                'job_id' => $jobStatus['job_id'] ?? $agent->n8n_execution_id,
                'finished_at' => $jobStatus['finished_at'] ?? null,
                'exit_code' => $jobStatus['exit_code'] ?? null,
                'sync_source' => $source,
            ], JSON_UNESCAPED_UNICODE);
        }

        if (empty($updateData)) {
            return false;
        }

        $agent->update($updateData);
        $agent->refresh();

        if (($updateData['status'] ?? null) !== null && $mappedStatus !== $previousStatus) {
            if (in_array($mappedStatus, ['completed', 'failed', 'stopped'], true)) {
                app(ProjectOrchestratorQueueService::class)->releaseProjectSlot($agent->project_id);
            }

            if (in_array($mappedStatus, ['completed', 'failed'], true)) {
                $this->appendWorkspaceAgentLog($agent, [
                    'step_key' => $mappedStatus === 'failed' ? 'task_failed' : 'task_completed',
                    'title' => $mappedStatus === 'failed' ? 'Agent Failed' : 'Agent Completed',
                    'message' => $mappedStatus === 'failed'
                        ? 'Lavorazione fallita (sincronizzata dall\'orchestratore)'
                        : 'Lavorazione completata (sincronizzata dall\'orchestratore)',
                    'status' => $mappedStatus,
                    'payload' => $jobStatus,
                ]);
            } elseif ($mappedStatus === 'running' && $previousStatus === 'pending') {
                $this->appendWorkspaceAgentLog($agent, [
                    'step_key' => 'agent_started',
                    'title' => 'Agent Started',
                    'message' => 'Agent avviato dall\'orchestratore',
                    'status' => 'running',
                    'payload' => $jobStatus,
                ]);
            }

            $logTail = $jobStatus['log_tail'] ?? null;
            if (is_string($logTail) && trim($logTail) !== '' && in_array($mappedStatus, ['completed', 'failed'], true)) {
                $this->appendWorkspaceAgentLog($agent, [
                    'step_key' => 'orchestrator_log_tail',
                    'title' => 'Agent Output',
                    'message' => mb_substr(trim($logTail), -4000),
                    'status' => $mappedStatus,
                    'payload' => ['source' => $source],
                ]);
            }
        }

        return true;
    }

    /**
     * Append a log entry to a workspace agent.
     */
    public function appendWorkspaceAgentLog(WorkspaceAgent $agent, array $payload): void
    {
        $message = $payload['message'] ?? $payload['log_message'] ?? $payload['title'] ?? '';
        if ($message === '' && empty($payload)) {
            return;
        }

        $entry = [
            'timestamp' => now()->toISOString(),
            'step_key' => $payload['step_key'] ?? 'log_' . time(),
            'title' => $payload['title'] ?? 'Log Entry',
            'message' => $message,
            'status' => $payload['status'] ?? 'completed',
            'payload' => $payload,
        ];

        $existingLogs = [];
        if (!empty($agent->logs)) {
            $decoded = json_decode($agent->logs, true);
            if (is_array($decoded)) {
                $existingLogs = $decoded;
            }
        }

        $existingLogs[] = $entry;
        $agent->update(['logs' => json_encode($existingLogs, JSON_UNESCAPED_UNICODE)]);
    }

    /**
     * Map orchestrator/n8n status to workspace agent status.
     */
    public function mapOrchestratorStatusToAgentStatus(string $status): string
    {
        $normalized = strtolower(trim($status));

        if ($normalized === 'review') {
            return 'review';
        }

        if (in_array($normalized, ['queued', 'pending', 'accepted'], true)) {
            return 'pending';
        }

        $n8nStatus = $this->mapOrchestratorStatus($status);

        if (in_array($normalized, ['cancelled', 'canceled', 'stopped'], true)) {
            return 'stopped';
        }

        return match ($n8nStatus) {
            'completed' => 'completed',
            'failed', 'skipped' => 'failed',
            'pending' => 'pending',
            default => 'running',
        };
    }

    /**
     * Build orchestrator/n8n prompt text.
     * When exact_prompt is true, preserve description byte-for-byte (incl. JS/code blocks).
     */
    public function buildDedicatedPrompt(?string $title, ?string $description, bool $exactPrompt = false): string
    {
        $title = $title ?? '';
        $description = $description ?? '';

        if ($exactPrompt) {
            if ($description !== '') {
                return $description;
            }

            return $title;
        }

        if ($title !== '' && $description !== '') {
            return $title . "\n\n" . $description;
        }

        return $description !== '' ? $description : $title;
    }

    /**
     * Map CRM label to orchestrator specialist role
     */
    private function mapCrmLabelToSpecialistRole(string $crmCode): string
    {
        $mapping = [
            'frontend' => 'frontend dev',
            'backend' => 'backend dev', 
            'fullstack' => 'general',
            'ui' => 'ux',
            'ux' => 'ux',
            'design' => 'ux',
            'bug' => 'bugfix',
            'debug' => 'bugfix',
        ];

        $lowercaseCode = strtolower($crmCode);
        
        foreach ($mapping as $pattern => $role) {
            if (str_contains($lowercaseCode, $pattern)) {
                return $role;
            }
        }

        return 'general'; // Default fallback
    }

    /**
     * Verify callback authentication
     */
    public function verifyCallbackAuth(Request $request): bool
    {
        $expectedHeader = config('services.n8n.callback_auth_header');
        $expectedValue = config('services.n8n.callback_auth_value');

        if (!empty($expectedHeader) && !empty($expectedValue)) {
            $receivedValue = $request->header($expectedHeader);
            if ($receivedValue === $expectedValue) {
                return true;
            }
        }

        // Unified orchestrator signs callbacks with X-Orchestrator-Signature
        $orchestratorSignature = $request->header('X-Orchestrator-Signature');
        if ($orchestratorSignature) {
            $n8nWebhookService = app(N8nWebhookService::class);
            if ($n8nWebhookService->verifySignature($request->getContent(), $orchestratorSignature)) {
                return true;
            }

            $orchestratorSecret = config('services.n8n.orchestrator_webhook_secret');
            if (!empty($orchestratorSecret)) {
                $expected = hash_hmac('sha256', $request->getContent(), (string) $orchestratorSecret);
                if (hash_equals($expected, $orchestratorSignature)) {
                    return true;
                }
            }
        }

        Log::warning('N8N callback authentication failed: no valid auth header or signature');
        return false;
    }

    /**
     * Append a step to task N8N logs
     */
    public function appendStep(CrmProjectTask $task, array $data): CrmProjectTaskN8nStep
    {
        $stepData = [
            'crm_project_task_id' => $task->id,
            'step_key' => $data['step_key'],
            'title' => $data['title'] ?? null,
            'message' => $data['message'] ?? null,
            'status' => $data['status'] ?? 'pending',
            'payload' => $data['payload'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
        ];

        return CrmProjectTaskN8nStep::create($stepData);
    }

    /**
     * Handle callback from orchestrator
     */
    public function handleCallback(CrmProjectTask $task, array $payload): void
    {
        Log::info('Processing N8N callback', [
            'task_id' => $task->id,
            'payload_keys' => array_keys($payload)
        ]);

        try {
            // Update task based on callback data
            $updateData = [];

            // Handle different callback types
            if (isset($payload['event'])) {
                $this->handleEventCallback($task, $payload);
            }

            // Handle status updates
            if (isset($payload['status'])) {
                $status = strtolower($payload['status']);
                $updateData['n8n_status'] = $this->mapOrchestratorStatus($status);
                
                if ($status === 'completed') {
                    $updateData['n8n_completed_at'] = now();
                    $updateData['progress'] = 100;
                    
                    // Auto-complete task if execution_mode is 'agent'
                    if ($task->execution_mode === 'agent') {
                        $updateData['status'] = 'completed';
                        $updateData['completed_date'] = now();
                    }
                } else if ($status === 'failed') {
                    $updateData['n8n_error'] = $payload['error'] ?? 'Task failed in orchestrator';
                }
            }

            // Handle progress updates
            if (isset($payload['progress'])) {
                $updateData['progress'] = max(0, min(100, (int)$payload['progress']));
            }

            // Store full response
            if (!empty($payload)) {
                $updateData['n8n_response'] = $payload;
                $updateData['n8n_response_format'] = 'callback';
            }

            if (!empty($updateData)) {
                $task->update($updateData);
            }

            // Handle steps if provided
            if (isset($payload['steps']) && is_array($payload['steps'])) {
                foreach ($payload['steps'] as $index => $stepData) {
                    $this->appendStep($task, [
                        'step_key' => $stepData['key'] ?? "step_{$index}",
                        'title' => $stepData['title'] ?? null,
                        'message' => $stepData['message'] ?? $stepData['description'] ?? null,
                        'status' => $this->mapOrchestratorStatus($stepData['status'] ?? 'pending'),
                        'payload' => $stepData,
                        'sort_order' => $stepData['order'] ?? ($index + 100)
                    ]);
                }
            }

            // Create generic callback step
            $this->appendStep($task, [
                'step_key' => 'callback_' . time(),
                'title' => 'Aggiornamento dall\'orchestratore',
                'message' => $payload['message'] ?? 'Callback ricevuto',
                'status' => 'completed',
                'payload' => $payload,
                'sort_order' => 1000 + time()
            ]);

            Log::info('N8N callback processed successfully', ['task_id' => $task->id]);

        } catch (Exception $e) {
            Log::error('Error processing N8N callback', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
                'payload' => $payload
            ]);
            
            // Update task with error
            $task->update([
                'n8n_status' => 'failed',
                'n8n_error' => 'Callback processing error: ' . $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Handle event-based callbacks
     */
    private function handleEventCallback(CrmProjectTask $task, array $payload): void
    {
        $event = $payload['event'];
        
        switch ($event) {
            case 'job.started':
                $task->update(['n8n_status' => 'processing']);
                $this->appendStep($task, [
                    'step_key' => 'job_started',
                    'title' => 'Agent iniziato',
                    'message' => 'L\'agent ha iniziato a lavorare sul task',
                    'status' => 'completed',
                    'payload' => $payload
                ]);
                break;
                
            case 'job.completed':
                $task->update([
                    'n8n_status' => 'completed',
                    'n8n_completed_at' => now(),
                    'progress' => 100
                ]);
                
                if ($task->execution_mode === 'agent') {
                    $task->update([
                        'status' => 'completed',
                        'completed_date' => now()
                    ]);
                }
                
                $this->appendStep($task, [
                    'step_key' => 'job_completed',
                    'title' => 'Agent completato',
                    'message' => 'L\'agent ha completato il task',
                    'status' => 'completed',
                    'payload' => $payload
                ]);
                break;
                
            case 'job.failed':
                $task->update([
                    'n8n_status' => 'failed',
                    'n8n_error' => $payload['error'] ?? 'Job failed'
                ]);
                
                $this->appendStep($task, [
                    'step_key' => 'job_failed',
                    'title' => 'Agent fallito',
                    'message' => $payload['error'] ?? 'L\'agent ha avuto un errore',
                    'status' => 'failed',
                    'payload' => $payload
                ]);
                break;
        }
    }

    /**
     * Map orchestrator/n8n callback status to internal n8n_status enum value.
     */
    public function mapOrchestratorStatus(string $status): string
    {
        $mapping = [
            'queued' => 'pending',
            'accepted' => 'processing',
            'running' => 'processing',
            'processing' => 'processing',
            'completed' => 'completed',
            'failed' => 'failed',
            'cancelled' => 'skipped',
            'error' => 'failed',
        ];

        $normalized = strtolower(trim($status));
        $mapped = $mapping[$normalized] ?? $normalized;

        $allowed = ['pending', 'processing', 'completed', 'failed', 'skipped'];

        return in_array($mapped, $allowed, true) ? $mapped : 'processing';
    }

    /**
     * Build update payload for POST /api/webhooks/n8n/status callbacks.
     */
    public function buildStatusCallbackUpdate(array $payload): array
    {
        $updateData = [];

        $rawStatus = $payload['n8n_status'] ?? $payload['status'] ?? null;
        if ($rawStatus !== null && $rawStatus !== '') {
            $updateData['n8n_status'] = $this->mapOrchestratorStatus((string) $rawStatus);
        }

        if (isset($payload['progress'])) {
            $updateData['progress'] = max(0, min(100, (int) $payload['progress']));
        }

        $executionId = $payload['run_id'] ?? $payload['orchestrator_job_id'] ?? $payload['n8n_execution_id'] ?? null;
        if (!empty($executionId)) {
            $updateData['n8n_execution_id'] = (string) $executionId;
        }

        if (array_key_exists('n8n_response', $payload)) {
            $updateData['n8n_response'] = $payload['n8n_response'];
            $updateData['n8n_response_format'] = 'webhook_status';
        } elseif (!empty($payload)) {
            $updateData['n8n_response'] = $payload;
            $updateData['n8n_response_format'] = 'webhook_status';
        }

        if (($updateData['n8n_status'] ?? null) === 'failed') {
            $updateData['n8n_error'] = $payload['message'] ?? $payload['error'] ?? 'Task failed in orchestrator';
        }

        return $updateData;
    }
}