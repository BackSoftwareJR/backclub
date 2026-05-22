<?php

namespace App\Services;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class N8nTaskService
{
    public function isEnabled(): bool
    {
        return (bool) config('n8n.enabled')
            && !empty(config('n8n.webhook_url'));
    }

    public function callbackUrl(): string
    {
        return rtrim((string) config('app.url'), '/') . '/api/webhooks/n8n/task-events';
    }

    public function callbackStatusUrl(): string
    {
        return rtrim((string) config('app.url'), '/') . '/api/webhooks/n8n/status';
    }

    public function callbackCompletedUrl(): string
    {
        return rtrim((string) config('app.url'), '/') . '/api/webhooks/n8n/completed';
    }

    /**
     * Avvia il workflow N8N (non attende il completamento — timeout breve).
     *
     * @return array{accepted: bool, error: ?string, http_status: ?int}
     */
    public function triggerWorkflowStart(CrmProjectTask $task, CrmProject $project, User $creator): array
    {
        if (!$this->isEnabled()) {
            return [
                'accepted' => false,
                'error' => 'Integrazione N8N non configurata',
                'http_status' => null,
            ];
        }

        $payload = $this->buildPayload($task, $project, $creator);

        try {
            $timeout = (int) config('n8n.start_timeout_seconds', 30);
            $request = Http::timeout($timeout)->acceptJson();
            $request = $this->applyWebhookAuth($request);

            $response = $request->post(config('n8n.webhook_url'), $payload);

            if (!$response->successful()) {
                Log::warning('N8N avvio workflow non OK', [
                    'task_id' => $task->id,
                    'status' => $response->status(),
                    'body' => substr((string) $response->body(), 0, 500),
                ]);

                return [
                    'accepted' => false,
                    'error' => 'N8N HTTP ' . $response->status(),
                    'http_status' => $response->status(),
                ];
            }

            return [
                'accepted' => true,
                'error' => null,
                'http_status' => $response->status(),
            ];
        } catch (\Throwable $e) {
            Log::error('N8N avvio workflow errore', [
                'task_id' => $task->id,
                'message' => $e->getMessage(),
            ]);

            return [
                'accepted' => false,
                'error' => $e->getMessage(),
                'http_status' => null,
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPayload(CrmProjectTask $task, CrmProject $project, User $creator): array
    {
        $task->loadMissing(['assignments.user:id,name,email']);

        return [
            'task_id' => $task->id,
            'project_id' => $project->id,
            'project_name' => $project->name,
            'github_url' => $project->github_url,
            'website_url' => $project->website_url,
            'execution_mode' => $task->execution_mode,
            'title' => $task->title,
            'description' => $task->description,
            'status' => $task->status,
            'priority' => $task->priority,
            'start_date' => $task->start_date?->toDateString(),
            'due_date' => $task->due_date?->toDateString(),
            'assignments' => $task->assignments->map(fn ($a) => [
                'user_id' => $a->user_id,
                'user_name' => $a->user?->name,
                'user_email' => $a->user?->email,
                'payment_method' => $a->payment_method,
            ])->values()->all(),
            'created_by' => [
                'id' => $creator->id,
                'name' => $creator->name,
                'email' => $creator->email,
            ],
            'callback_url' => $this->callbackUrl(),
            'callback_status_url' => $this->callbackStatusUrl(),
            'callback_completed_url' => $this->callbackCompletedUrl(),
            'callback_auth_header' => config('n8n.callback_auth_header', config('n8n.webhook_auth_header')),
            'triggered_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @param \Illuminate\Http\Client\PendingRequest $request
     * @return \Illuminate\Http\Client\PendingRequest
     */
    private function applyWebhookAuth($request)
    {
        $headerName = config('n8n.webhook_auth_header');
        $headerValue = config('n8n.webhook_auth_value');

        if (!empty($headerName) && !empty($headerValue)) {
            return $request->withHeaders([$headerName => $headerValue]);
        }

        $token = config('n8n.webhook_auth_token');
        if (!empty($token)) {
            return $request->withToken($token);
        }

        return $request;
    }
}
