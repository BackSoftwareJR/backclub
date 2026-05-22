<?php

namespace App\Services;

use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskEvent;
use App\Models\CrmProjectTaskN8nStep;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class N8nTaskCallbackService
{
    public const STEP_AGENT_WORK_STARTED = 'agent_work_started';
    public const STEP_AGENT_TASK_COMPLETED = 'agent_task_completed';

    /**
     * POST /webhooks/n8n/status — agente AI ha preso in carico il task.
     *
     * @param  array<string, mixed>  $data
     */
    public function handleWorkInProgress(array $data): CrmProjectTask
    {
        $task = $this->findN8nTask((int) $data['task_id']);
        $message = trim((string) $data['message']);
        $agentName = $data['agent_name'] ?? 'Agente AI';
        $stepIndex = (int) ($data['step_index'] ?? $this->nextStepIndex($task));

        DB::beginTransaction();
        try {
            CrmProjectTaskN8nStep::create([
                'crm_project_task_id' => $task->id,
                'step_key' => self::STEP_AGENT_WORK_STARTED,
                'step_index' => $stepIndex,
                'status' => CrmProjectTaskN8nStep::STATUS_RUNNING,
                'title' => 'Lavoro in corso',
                'message' => $message,
                'actor_type' => CrmProjectTaskN8nStep::ACTOR_AGENT,
                'actor_name' => $agentName,
                'payload' => ['source' => 'n8n/status'],
                'progress' => max((int) $task->progress, 10),
                'is_final' => false,
            ]);

            $task->update([
                'status' => 'in_progress',
                'n8n_status' => CrmProjectTask::N8N_PROCESSING,
                'n8n_error' => null,
                'progress' => max((int) $task->progress, 10),
            ]);

            $this->recordTaskEvent($task, 'n8n_agent_started', $message, [
                'step_key' => self::STEP_AGENT_WORK_STARTED,
                'agent_name' => $agentName,
            ]);

            DB::commit();

            return $task->fresh(['n8nSteps']);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('N8N status webhook failed', ['task_id' => $task->id, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * POST /webhooks/n8n/completed — agente ha terminato (in attesa revisione umana).
     *
     * @param  array<string, mixed>  $data
     */
    public function handleTaskCompleted(array $data): CrmProjectTask
    {
        $task = $this->findN8nTask((int) $data['task_id']);
        $summary = trim((string) $data['summary']);
        $agentName = $data['agent_name'] ?? 'Agente AI';
        $stepIndex = (int) ($data['step_index'] ?? $this->nextStepIndex($task));
        $isSuccess = in_array(strtolower((string) $data['status']), ['success'], true);

        DB::beginTransaction();
        try {
            $stepStatus = $isSuccess
                ? CrmProjectTaskN8nStep::STATUS_COMPLETED
                : CrmProjectTaskN8nStep::STATUS_FAILED;

            CrmProjectTaskN8nStep::create([
                'crm_project_task_id' => $task->id,
                'step_key' => self::STEP_AGENT_TASK_COMPLETED,
                'step_index' => $stepIndex,
                'status' => $stepStatus,
                'title' => $isSuccess ? 'Lavoro completato dall\'agente' : 'Lavoro agente fallito',
                'message' => $summary,
                'actor_type' => CrmProjectTaskN8nStep::ACTOR_AGENT,
                'actor_name' => $agentName,
                'payload' => [
                    'source' => 'n8n/completed',
                    'status' => $data['status'],
                ],
                'progress' => $isSuccess ? 100 : max((int) $task->progress, 50),
                'is_final' => true,
            ]);

            if ($isSuccess) {
                $task->update([
                    'status' => 'review',
                    'n8n_status' => CrmProjectTask::N8N_COMPLETED,
                    'n8n_completed_at' => now(),
                    'n8n_error' => null,
                    'n8n_response' => ['summary' => $summary],
                    'n8n_response_format' => 'text',
                    'progress' => 100,
                ]);

                $this->recordTaskEvent($task, 'n8n_agent_completed', 'Agente completato — in attesa di approvazione', [
                    'step_key' => self::STEP_AGENT_TASK_COMPLETED,
                    'status' => 'success',
                ]);
            } else {
                $task->update([
                    'status' => 'in_progress',
                    'n8n_status' => CrmProjectTask::N8N_FAILED,
                    'n8n_error' => $summary,
                    'n8n_response' => ['summary' => $summary],
                    'n8n_response_format' => 'text',
                ]);

                $this->recordTaskEvent($task, 'n8n_agent_failed', 'Esecuzione agente fallita', [
                    'step_key' => self::STEP_AGENT_TASK_COMPLETED,
                    'status' => $data['status'],
                ]);
            }

            DB::commit();

            return $task->fresh(['n8nSteps']);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('N8N completed webhook failed', ['task_id' => $task->id, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Gestisce un aggiornamento step inviato da N8N (HTTP Request node → CRM).
     *
     * @param  array<string, mixed>  $data
     */
    public function handleStepUpdate(array $data): CrmProjectTask
    {
        $taskId = (int) ($data['task_id'] ?? 0);
        if ($taskId <= 0) {
            throw new \InvalidArgumentException('task_id mancante o non valido');
        }

        $task = $this->findN8nTask($taskId);

        $stepStatus = $this->normalizeStepStatus($data['status'] ?? 'running');
        $isFinal = (bool) ($data['is_final'] ?? false);
        $completeTask = (bool) ($data['complete_task'] ?? false);
        $progress = isset($data['progress']) ? min(100, max(0, (int) $data['progress'])) : null;

        DB::beginTransaction();
        try {
            CrmProjectTaskN8nStep::create([
                'crm_project_task_id' => $task->id,
                'step_key' => $data['step_key'] ?? null,
                'step_index' => (int) ($data['step_index'] ?? 0),
                'status' => $stepStatus,
                'title' => $data['title'] ?? ($data['step_name'] ?? null),
                'message' => $data['message'] ?? ($data['text'] ?? null),
                'actor_type' => $data['actor_type'] ?? CrmProjectTaskN8nStep::ACTOR_AGENT,
                'actor_name' => $data['actor_name'] ?? ($data['node_name'] ?? 'Agente N8N'),
                'payload' => $data['payload'] ?? $data['data'] ?? $data,
                'progress' => $progress,
                'is_final' => $isFinal,
            ]);

            $taskUpdates = [
                'n8n_status' => $stepStatus === CrmProjectTaskN8nStep::STATUS_FAILED
                    ? CrmProjectTask::N8N_FAILED
                    : CrmProjectTask::N8N_PROCESSING,
            ];

            if ($progress !== null) {
                $taskUpdates['progress'] = $progress;
            }

            if (isset($data['result']) || isset($data['output'])) {
                $taskUpdates['n8n_response'] = $data['result'] ?? $data['output'];
                $taskUpdates['n8n_response_format'] = 'json';
            } elseif (isset($data['payload']) && is_array($data['payload'])) {
                $taskUpdates['n8n_response'] = $data['payload'];
                $taskUpdates['n8n_response_format'] = 'json';
            }

            if ($stepStatus === CrmProjectTaskN8nStep::STATUS_FAILED) {
                $taskUpdates['n8n_error'] = $data['error'] ?? $data['message'] ?? 'Step fallito';
            }

            if ($isFinal || $completeTask) {
                if ($stepStatus !== CrmProjectTaskN8nStep::STATUS_FAILED) {
                    $taskUpdates['n8n_status'] = CrmProjectTask::N8N_COMPLETED;
                    $taskUpdates['n8n_completed_at'] = now();
                    $taskUpdates['n8n_error'] = null;

                    if ($task->execution_mode === CrmProjectTask::EXECUTION_AGENT && $completeTask) {
                        $taskUpdates['status'] = 'completed';
                        $taskUpdates['completed_date'] = now();
                        $taskUpdates['progress'] = 100;
                    } elseif ($task->execution_mode === CrmProjectTask::EXECUTION_AGENT_HUMAN) {
                        $taskUpdates['status'] = 'in_progress';
                    }
                } else {
                    $taskUpdates['n8n_status'] = CrmProjectTask::N8N_FAILED;
                    if ($task->execution_mode === CrmProjectTask::EXECUTION_AGENT) {
                        $taskUpdates['status'] = 'pending';
                    }
                }
            } else {
                if ($task->status === 'pending') {
                    $taskUpdates['status'] = 'in_progress';
                }
            }

            $task->update($taskUpdates);

            $this->recordTaskEvent(
                $task,
                'n8n_step',
                $data['message'] ?? ($data['title'] ?? 'Aggiornamento agente N8N'),
                [
                    'step_key' => $data['step_key'] ?? null,
                    'step_index' => $data['step_index'] ?? 0,
                    'status' => $stepStatus,
                    'is_final' => $isFinal,
                ]
            );

            DB::commit();

            return $task->fresh(['n8nSteps']);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('N8N callback step failed', ['task_id' => $taskId, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function findN8nTask(int $taskId): CrmProjectTask
    {
        if ($taskId <= 0) {
            throw new \InvalidArgumentException('task_id mancante o non valido');
        }

        $task = CrmProjectTask::findOrFail($taskId);

        if (!$task->usesN8nAutomation()) {
            throw new \InvalidArgumentException('Questa task non usa automazione N8N');
        }

        return $task;
    }

    private function nextStepIndex(CrmProjectTask $task): int
    {
        $max = CrmProjectTaskN8nStep::where('crm_project_task_id', $task->id)->max('step_index');

        return (int) $max + 1;
    }

    /**
     * @param  array<string, mixed>  $eventData
     */
    private function recordTaskEvent(
        CrmProjectTask $task,
        string $eventType,
        string $description,
        array $eventData = []
    ): void {
        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $task->created_by,
            'event_type' => $eventType,
            'event_data' => $eventData,
            'description' => $description,
            'created_at' => now(),
        ]);
    }

    private function normalizeStepStatus(string $status): string
    {
        $status = strtolower($status);
        $allowed = [
            CrmProjectTaskN8nStep::STATUS_PENDING,
            CrmProjectTaskN8nStep::STATUS_RUNNING,
            CrmProjectTaskN8nStep::STATUS_COMPLETED,
            CrmProjectTaskN8nStep::STATUS_FAILED,
        ];

        if (in_array($status, $allowed, true)) {
            return $status;
        }

        if (in_array($status, ['success', 'done', 'ok'], true)) {
            return CrmProjectTaskN8nStep::STATUS_COMPLETED;
        }

        if (in_array($status, ['error', 'fail'], true)) {
            return CrmProjectTaskN8nStep::STATUS_FAILED;
        }

        return CrmProjectTaskN8nStep::STATUS_RUNNING;
    }
}
