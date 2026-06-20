<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\WorkspaceAgent;
use App\Services\ProjectOrchestratorQueueService;
use App\Services\TaskN8nService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Dashboard centralizzata della coda agenti: cross-project, visibile a PM e admin.
 */
class AgentQueueController extends Controller
{
    private const STALE_MINUTES = 30;

    /**
     * GET /api/agent-queue
     * Restituisce tutto ciò che è in coda / bloccato su tutti i progetti accessibili.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $staleThreshold = now()->subMinutes(self::STALE_MINUTES);

        // Progetti accessibili all'utente (admin vede tutto)
        $projectIds = $this->getAccessibleProjectIds($user);

        // --- Task CRM in pending / processing ---
        // Ordina per n8n_queue_position solo se la colonna esiste (migrazione potrebbe non essere ancora eseguita)
        $crmTaskQuery = CrmProjectTask::with(['project:id,name,github_url'])
            ->whereIn('crm_project_id', $projectIds)
            ->whereIn('execution_mode', ProjectOrchestratorQueueService::CRM_AGENT_MODES)
            ->whereIn('n8n_status', ['pending', 'processing']);

        $hasQueuePositionColumn = \Illuminate\Support\Facades\Schema::hasColumn('crm_project_tasks', 'n8n_queue_position');
        if ($hasQueuePositionColumn) {
            $crmTaskQuery->orderBy('n8n_queue_position');
        }
        $crmTasks = $crmTaskQuery->orderBy('updated_at')->get();

        // --- Workspace agents in pending / running / review ---
        $agents = WorkspaceAgent::with(['project:id,name,github_url', 'crmTask:id,title,status'])
            ->whereIn('project_id', $projectIds)
            ->whereNull('deleted_at')
            ->whereIn('status', ['pending', 'running', 'review'])
            ->orderBy('queue_position')
            ->orderBy('updated_at')
            ->get();

        // --- Formatta items ---
        $items = [];

        foreach ($crmTasks as $task) {
            $isStale = $task->updated_at < $staleThreshold;
            $items[] = [
                'type'              => 'crm_task',
                'id'                => $task->id,
                'title'             => $task->title,
                'status'            => $task->n8n_status,
                'queue_position'    => $task->n8n_queue_position,
                'is_stale'          => $isStale,
                'stale_minutes'     => (int) now()->diffInMinutes($task->updated_at),
                'n8n_execution_id'  => $task->n8n_execution_id,
                'n8n_error'         => $task->n8n_error,
                'project_id'        => $task->crm_project_id,
                'project_name'      => $task->project->name ?? 'Progetto',
                'updated_at'        => $task->updated_at?->toISOString(),
                'created_at'        => $task->created_at?->toISOString(),
                'url'               => '/freelance/task/' . $task->id . '?projectId=' . $task->crm_project_id,
            ];
        }

        foreach ($agents as $agent) {
            $isStale = $agent->updated_at < $staleThreshold;
            $items[] = [
                'type'              => 'workspace_agent',
                'id'                => $agent->id,
                'title'             => $agent->title,
                'status'            => $agent->status,
                'queue_position'    => $agent->queue_position,
                'is_stale'          => $isStale,
                'stale_minutes'     => (int) now()->diffInMinutes($agent->updated_at),
                'n8n_execution_id'  => $agent->n8n_execution_id,
                'n8n_error'         => null,
                'project_id'        => $agent->project_id,
                'project_name'      => $agent->project->name ?? 'Progetto',
                'crm_task_id'       => $agent->crm_task_id,
                'crm_task_title'    => $agent->crmTask?->title,
                'updated_at'        => $agent->updated_at?->toISOString(),
                'created_at'        => $agent->created_at?->toISOString(),
                'url'               => '/workspace/developer/progetti/' . $agent->project_id . '/lavorazioni/' . $agent->id,
            ];
        }

        // Ordina: stale prima, poi per position
        usort($items, function ($a, $b) {
            if ($a['is_stale'] !== $b['is_stale']) {
                return $b['is_stale'] <=> $a['is_stale'];
            }
            $posA = $a['queue_position'] ?? PHP_INT_MAX;
            $posB = $b['queue_position'] ?? PHP_INT_MAX;
            return $posA <=> $posB;
        });

        $staleCount  = count(array_filter($items, fn ($i) => $i['is_stale']));
        $blockedCount = count(array_filter($items, fn ($i) => $i['status'] === 'processing' || $i['status'] === 'running' || $i['status'] === 'review'));

        return response()->json([
            'success' => true,
            'data' => [
                'items'          => $items,
                'total'          => count($items),
                'stale_count'    => $staleCount,
                'blocked_count'  => $blockedCount,
                'n8n_enabled'    => app(TaskN8nService::class)->isEnabled(),
                'stale_threshold_minutes' => self::STALE_MINUTES,
            ],
        ]);
    }

    /**
     * POST /api/agent-queue/reset-stuck
     * Resetta tutti i job bloccati da più di STALE_MINUTES minuti su tutti i progetti.
     */
    public function resetStuck(Request $request): JsonResponse
    {
        $user = Auth::user();
        $projectIds = $this->getAccessibleProjectIds($user);

        $staleThreshold = now()->subMinutes(self::STALE_MINUTES);
        $resetCount = 0;

        // Reset CRM tasks stuck in processing
        $stuckTasks = CrmProjectTask::whereIn('crm_project_id', $projectIds)
            ->whereIn('execution_mode', ProjectOrchestratorQueueService::CRM_AGENT_MODES)
            ->where('n8n_status', 'processing')
            ->where('updated_at', '<', $staleThreshold)
            ->get();

        $hasQueueCol = \Illuminate\Support\Facades\Schema::hasColumn('crm_project_tasks', 'n8n_queue_position');
        foreach ($stuckTasks as $task) {
            $updateData = [
                'n8n_status' => 'failed',
                'n8n_error'  => 'Reset manuale da dashboard coda: nessun aggiornamento da ' . now()->diffInMinutes($task->updated_at) . ' minuti',
            ];
            if ($hasQueueCol) {
                $updateData['n8n_queue_position'] = null;
            }
            $task->update($updateData);
            $resetCount++;
        }

        // Reset workspace agents stuck in running/review
        $stuckAgents = WorkspaceAgent::whereIn('project_id', $projectIds)
            ->whereNull('deleted_at')
            ->whereIn('status', ['running', 'review'])
            ->where('updated_at', '<', $staleThreshold)
            ->get();

        foreach ($stuckAgents as $agent) {
            $agent->update([
                'status'       => 'failed',
                'completed_at' => now(),
                'queue_position' => null,
                'result'       => 'Reset manuale da dashboard coda: nessun aggiornamento da ' . now()->diffInMinutes($agent->updated_at) . ' minuti',
            ]);
            $resetCount++;
        }

        // Triggera tryDispatchNext per ogni progetto interessato
        if ($resetCount > 0) {
            $affectedProjectIds = array_unique(array_merge(
                $stuckTasks->pluck('crm_project_id')->toArray(),
                $stuckAgents->pluck('project_id')->toArray()
            ));

            $queueService = app(ProjectOrchestratorQueueService::class);
            foreach ($affectedProjectIds as $projectId) {
                try {
                    $queueService->releaseProjectSlot($projectId);
                } catch (\Throwable $e) {
                    Log::warning('AgentQueue: releaseProjectSlot failed after reset', [
                        'project_id' => $projectId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        Log::info('AgentQueue: reset stuck jobs', [
            'user_id'     => $user->id,
            'reset_count' => $resetCount,
        ]);

        return response()->json([
            'success' => true,
            'data'    => ['reset_count' => $resetCount],
            'message' => $resetCount > 0
                ? "Sbloccati {$resetCount} job. La coda ripartirà automaticamente."
                : 'Nessun job bloccato trovato.',
        ]);
    }

    /**
     * POST /api/agent-queue/force-dispatch/{projectId}
     * Forza il dispatch del prossimo item in coda per un progetto.
     */
    public function forceDispatch(Request $request, int $projectId): JsonResponse
    {
        $user = Auth::user();

        if (!$this->canAccessProject($user, $projectId)) {
            return response()->json(['success' => false, 'message' => 'Accesso negato'], 403);
        }

        $queueService = app(ProjectOrchestratorQueueService::class);
        $taskN8nService = app(TaskN8nService::class);

        if (!$taskN8nService->isEnabled()) {
            return response()->json(['success' => false, 'message' => 'N8N non abilitato'], 422);
        }

        // Reset stuck items per questo progetto, poi dispatch (0 min = resetta qualsiasi job attivo)
        $queueService->resetStuckActiveWork($projectId, 0);
        $queueService->tryDispatchNext($projectId);

        return response()->json([
            'success' => true,
            'message' => 'Dispatch forzato avviato per il progetto.',
        ]);
    }

    /**
     * POST /api/agent-queue/cancel-item
     * Cancella un singolo item dalla coda (task o agent).
     */
    public function cancelItem(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:crm_task,workspace_agent',
            'id'   => 'required|integer',
        ]);

        $user = Auth::user();

        if ($request->type === 'crm_task') {
            $task = CrmProjectTask::findOrFail($request->id);
            if (!$this->canAccessProject($user, $task->crm_project_id)) {
                return response()->json(['success' => false, 'message' => 'Accesso negato'], 403);
            }
            $cancelData = [
                'n8n_status' => 'skipped',
                'n8n_error'  => 'Cancellato manualmente da dashboard coda',
            ];
            if (\Illuminate\Support\Facades\Schema::hasColumn('crm_project_tasks', 'n8n_queue_position')) {
                $cancelData['n8n_queue_position'] = null;
            }
            $task->update($cancelData);
            app(ProjectOrchestratorQueueService::class)->releaseProjectSlot($task->crm_project_id);
        } else {
            $agent = WorkspaceAgent::findOrFail($request->id);
            if (!$this->canAccessProject($user, $agent->project_id)) {
                return response()->json(['success' => false, 'message' => 'Accesso negato'], 403);
            }
            $agent->update([
                'status'        => 'stopped',
                'completed_at'  => now(),
                'queue_position' => null,
                'result'        => 'Cancellato manualmente da dashboard coda',
            ]);
            app(ProjectOrchestratorQueueService::class)->releaseProjectSlot($agent->project_id);
        }

        return response()->json(['success' => true, 'message' => 'Item rimosso dalla coda.']);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private function getAccessibleProjectIds($user): array
    {
        if ($user->role === 'admin') {
            return CrmProject::pluck('id')->toArray();
        }

        return CrmProject::where(function ($q) use ($user) {
            $q->where('manager_id', $user->id)
              ->orWhereHas('teamMembers', fn ($q2) => $q2->where('user_id', $user->id));
        })->pluck('id')->toArray();
    }

    private function canAccessProject($user, int $projectId): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        $project = CrmProject::find($projectId);
        if (!$project) return false;
        return $project->manager_id === $user->id
            || $project->teamMembers()->where('user_id', $user->id)->exists();
    }
}
