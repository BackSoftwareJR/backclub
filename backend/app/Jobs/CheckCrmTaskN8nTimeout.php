<?php

namespace App\Jobs;

use App\Models\CrmProjectTask;
use App\Models\WorkspaceAgent;
use App\Services\ProjectOrchestratorQueueService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CheckCrmTaskN8nTimeout implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public int $taskId) {}

    /**
     * Se il task è ancora in 'processing' dopo 10 minuti senza aggiornamenti,
     * lo marca come completato con flag "verificare manualmente" e libera la coda.
     */
    public function handle(): void
    {
        $task = CrmProjectTask::find($this->taskId);

        if (!$task) {
            return;
        }

        // Task già terminato: non fare nulla
        if (!in_array($task->n8n_status, ['processing', 'pending'], true)) {
            return;
        }

        // Controlla se ci sono stati aggiornamenti negli ultimi 10 minuti
        $staleThreshold = now()->subMinutes(10);
        if ($task->updated_at > $staleThreshold) {
            // Il task ha ricevuto aggiornamenti, non è bloccato
            return;
        }

        Log::warning('CRM task N8N timeout: nessun aggiornamento ricevuto in 10 minuti', [
            'task_id' => $task->id,
            'n8n_status' => $task->n8n_status,
            'n8n_execution_id' => $task->n8n_execution_id,
            'last_update' => $task->updated_at,
        ]);

        $task->update([
            'n8n_status' => 'completed',
            'n8n_completed_at' => now(),
            'n8n_error' => 'Timeout: nessun aggiornamento ricevuto in 10 minuti. Verificare manualmente il risultato.',
            'progress' => 100,
        ]);

        // Aggiorna anche il WorkspaceAgent collegato se esiste
        $agent = WorkspaceAgent::where('crm_task_id', $task->id)
            ->whereNull('deleted_at')
            ->whereIn('status', ['pending', 'running'])
            ->first();

        if ($agent) {
            $agent->update([
                'status' => 'completed',
                'completed_at' => now(),
                'result' => 'Timeout: nessun aggiornamento dall\'orchestratore in 10 minuti. Verificare manualmente.',
            ]);

            app(\App\Services\TaskN8nService::class)->appendWorkspaceAgentLog($agent, [
                'step_key' => 'timeout_auto_complete',
                'title' => 'Completato per timeout',
                'message' => 'Nessun aggiornamento ricevuto in 10 minuti — marcato come completato. Verificare manualmente il risultato nell\'orchestratore.',
                'status' => 'completed',
                'payload' => [
                    'task_id' => $task->id,
                    'n8n_execution_id' => $task->n8n_execution_id,
                    'timed_out_at' => now()->toISOString(),
                ],
            ]);
        }

        // Libera il progetto dalla coda per non bloccare altri task
        app(ProjectOrchestratorQueueService::class)->releaseProjectSlot($task->crm_project_id);
    }
}
