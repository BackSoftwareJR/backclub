<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ParsesN8nWebhookPayload;
use App\Services\N8nTaskCallbackService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class N8nTaskWebhookController extends Controller
{
    use ParsesN8nWebhookPayload;

    /**
     * POST /api/webhooks/n8n/task-events
     * Chiamato da N8N a ogni step del workflow (granulare).
     */
    public function taskEvent(Request $request)
    {
        $payload = $this->parseN8nPayload($request);

        $validator = Validator::make($payload, [
            'task_id' => 'required|integer|min:1',
            'status' => 'nullable|string|max:30',
            'message' => 'nullable|string|max:10000',
            'title' => 'nullable|string|max:255',
            'step_key' => 'nullable|string|max:100',
            'step_index' => 'nullable|integer|min:0',
            'progress' => 'nullable|integer|min:0|max:100',
            'is_final' => 'nullable|boolean',
            'complete_task' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        return $this->executeCallback(
            fn () => app(N8nTaskCallbackService::class)->handleStepUpdate($payload),
            'Step registrato',
            $payload
        );
    }

    /**
     * POST /api/webhooks/n8n/status
     * N8N conferma che un agente AI ha preso in carico il lavoro.
     *
     * Payload: {"task_id": 161, "message": "L'agente frontend dev sta lavorando sul progetto."}
     */
    public function workInProgress(Request $request)
    {
        $payload = $this->parseN8nPayload($request);

        $validator = Validator::make($payload, [
            'task_id' => 'required|integer|min:1',
            'message' => 'required|string|max:10000',
            'agent_name' => 'nullable|string|max:255',
            'step_index' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        return $this->executeCallback(
            fn () => app(N8nTaskCallbackService::class)->handleWorkInProgress($payload),
            'Agente in lavorazione',
            $payload
        );
    }

    /**
     * POST /api/webhooks/n8n/completed
     * N8N segnala fine lavoro agente (push GitHub, summary tecnico).
     *
     * Payload: {"task_id": 161, "status": "success", "summary": "stdout: ... stderr: ..."}
     */
    public function taskCompleted(Request $request)
    {
        $payload = $this->parseN8nPayload($request);

        $validator = Validator::make($payload, [
            'task_id' => 'required|integer|min:1',
            'status' => 'required|string|in:success,failed,error',
            'summary' => 'required|string|max:50000',
            'agent_name' => 'nullable|string|max:255',
            'step_index' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors()->toArray());
        }

        return $this->executeCallback(
            fn () => app(N8nTaskCallbackService::class)->handleTaskCompleted($payload),
            'Completamento agente registrato',
            $payload
        );
    }

    /**
     * @param  callable(): \App\Models\CrmProjectTask  $callback
     * @param  array<string, mixed>  $payload
     */
    private function executeCallback(callable $callback, string $successMessage, array $payload)
    {
        try {
            $task = $callback();

            return response()->json([
                'success' => true,
                'message' => $successMessage,
                'data' => [
                    'task_id' => $task->id,
                    'task_status' => $task->status,
                    'n8n_status' => $task->n8n_status,
                    'progress' => $task->progress,
                    'n8n_completed_at' => $task->n8n_completed_at,
                ],
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Task non trovata',
            ], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('N8N webhook error', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Errore elaborazione webhook',
            ], 500);
        }
    }

    /**
     * @param  array<string, mixed>  $errors
     */
    private function validationError(array $errors)
    {
        return response()->json([
            'success' => false,
            'errors' => $errors,
        ], 422);
    }
}
