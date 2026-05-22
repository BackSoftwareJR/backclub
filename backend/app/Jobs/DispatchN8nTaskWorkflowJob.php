<?php

namespace App\Jobs;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskEvent;
use App\Models\CrmProjectTaskN8nStep;
use App\Models\User;
use App\Services\N8nTaskService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DispatchN8nTaskWorkflowJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 60;

    public function __construct(
        public int $taskId,
        public int $projectId,
        public int $creatorId,
    ) {}

    public function handle(N8nTaskService $n8n): void
    {
        $task = CrmProjectTask::find($this->taskId);
        $project = CrmProject::find($this->projectId);
        $creator = User::find($this->creatorId);

        if (!$task || !$project || !$creator) {
            return;
        }

        CrmProjectTaskN8nStep::create([
            'crm_project_task_id' => $task->id,
            'step_key' => 'workflow_start',
            'step_index' => 0,
            'status' => CrmProjectTaskN8nStep::STATUS_RUNNING,
            'title' => 'Avvio automazione',
            'message' => 'Connessione al workflow N8N in corso...',
            'actor_type' => CrmProjectTaskN8nStep::ACTOR_SYSTEM,
            'actor_name' => 'Sistema',
            'progress' => 0,
        ]);

        $result = $n8n->triggerWorkflowStart($task, $project, $creator);

        if (!$result['accepted']) {
            $task->update([
                'n8n_status' => CrmProjectTask::N8N_FAILED,
                'n8n_error' => $result['error'] ?? 'Impossibile avviare N8N',
            ]);

            CrmProjectTaskN8nStep::create([
                'crm_project_task_id' => $task->id,
                'step_key' => 'workflow_start_failed',
                'step_index' => 1,
                'status' => CrmProjectTaskN8nStep::STATUS_FAILED,
                'title' => 'Avvio fallito',
                'message' => $result['error'] ?? 'Errore connessione N8N',
                'actor_type' => CrmProjectTaskN8nStep::ACTOR_SYSTEM,
                'actor_name' => 'Sistema',
                'is_final' => true,
            ]);

            Log::warning('N8N workflow start failed', ['task_id' => $task->id, 'error' => $result['error']]);

            return;
        }

        CrmProjectTaskN8nStep::create([
            'crm_project_task_id' => $task->id,
            'step_key' => 'workflow_started',
            'step_index' => 1,
            'status' => CrmProjectTaskN8nStep::STATUS_COMPLETED,
            'title' => 'Workflow avviato',
            'message' => 'L\'agente sta elaborando la richiesta. Gli aggiornamenti appariranno qui.',
            'actor_type' => CrmProjectTaskN8nStep::ACTOR_AGENT,
            'actor_name' => 'Agente N8N',
            'progress' => 5,
        ]);

        $task->update([
            'n8n_status' => CrmProjectTask::N8N_PROCESSING,
            'status' => 'in_progress',
            'n8n_error' => null,
        ]);

        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $creator->id,
            'event_type' => 'n8n_automation_started',
            'description' => 'Automazione N8N avviata in background',
            'created_at' => now(),
        ]);
    }
}
