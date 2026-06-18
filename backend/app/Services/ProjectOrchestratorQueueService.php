<?php

namespace App\Services;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\WorkspaceAgent;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Coda orchestrator unificata per progetto: workspace agents + task CRM (gestionale).
 * Un solo job alla volta per project_id, sia lato CRM che lato orchestrator.
 */
class ProjectOrchestratorQueueService
{
    /** @var list<string> */
    public const WORKSPACE_ACTIVE_STATUSES = ['running', 'review'];

    /** @var list<string> */
    public const WORKSPACE_TERMINAL_STATUSES = ['completed', 'failed', 'stopped'];

    /** @var list<string> */
    public const CRM_AGENT_MODES = ['agent', 'agent_human'];

    /** @var list<string> */
    public const CRM_TERMINAL_N8N_STATUSES = ['completed', 'failed', 'skipped'];

    public function hasActiveWork(int $projectId): bool
    {
        if (WorkspaceAgent::where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->whereIn('status', self::WORKSPACE_ACTIVE_STATUSES)
            ->exists()) {
            return true;
        }

        return CrmProjectTask::where('crm_project_id', $projectId)
            ->whereIn('execution_mode', self::CRM_AGENT_MODES)
            ->where('n8n_status', 'processing')
            ->exists();
    }

    public function enqueueWorkspaceAgent(WorkspaceAgent $agent): WorkspaceAgent
    {
        $position = $this->nextQueuePosition($agent->project_id);
        $agent->update([
            'status' => 'pending',
            'queue_position' => $position,
        ]);

        return $agent->fresh();
    }

    public function enqueueCrmTask(CrmProjectTask $task): CrmProjectTask
    {
        $position = $this->nextQueuePosition($task->crm_project_id);
        $task->update([
            'n8n_status' => 'pending',
            'n8n_queue_position' => $position,
            'n8n_error' => null,
        ]);

        return $task->fresh();
    }

    /**
     * Chiamare quando un job termina (callback, stop manuale, sync) per avviare il successivo.
     */
    public function releaseProjectSlot(int $projectId): void
    {
        $this->syncAllQueuePositions($projectId);
        $this->tryDispatchNext($projectId);
    }

    public function tryDispatchNext(int $projectId): void
    {
        $taskN8nService = app(TaskN8nService::class);
        if (!$taskN8nService->isEnabled()) {
            return;
        }

        if ($this->hasActiveWork($projectId)) {
            return;
        }

        $project = CrmProject::find($projectId);
        if (!$project || empty($project->github_url)) {
            return;
        }

        $next = $this->getNextQueueItem($projectId);
        if (!$next) {
            return;
        }

        try {
            if ($next['type'] === 'workspace') {
                /** @var WorkspaceAgent $agent */
                $agent = $next['model'];
                $taskN8nService->dispatchWorkspaceAgent($agent, $project);
            } else {
                /** @var CrmProjectTask $task */
                $task = $next['model'];
                $taskN8nService->sendTaskToOrchestrator($task, $project);
            }
        } catch (\Throwable $e) {
            Log::error('Project orchestrator queue dispatch failed', [
                'project_id' => $projectId,
                'type' => $next['type'],
                'id' => $next['model']->id,
                'error' => $e->getMessage(),
            ]);
            $this->releaseProjectSlot($projectId);
        }
    }

    public function canDispatchWorkspaceAgent(WorkspaceAgent $agent): bool
    {
        if ($agent->status !== 'pending' || $this->hasActiveWork($agent->project_id)) {
            return false;
        }

        $next = $this->getNextQueueItem($agent->project_id);

        return $next !== null
            && $next['type'] === 'workspace'
            && $next['model']->id === $agent->id;
    }

    /**
     * @param list<int> $workspaceAgentIds
     */
    public function reorderWorkspaceQueue(int $projectId, array $workspaceAgentIds): void
    {
        DB::transaction(function () use ($projectId, $workspaceAgentIds) {
            $pendingIds = WorkspaceAgent::where('project_id', $projectId)
                ->whereNull('deleted_at')
                ->where('status', 'pending')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $orderedWorkspace = array_values(array_filter(
                array_map('intval', $workspaceAgentIds),
                fn (int $id) => in_array($id, $pendingIds, true)
            ));

            foreach ($pendingIds as $id) {
                if (!in_array($id, $orderedWorkspace, true)) {
                    $orderedWorkspace[] = $id;
                }
            }

            $crmPending = CrmProjectTask::where('crm_project_id', $projectId)
                ->whereIn('execution_mode', self::CRM_AGENT_MODES)
                ->where('n8n_status', 'pending')
                ->orderBy('n8n_queue_position')
                ->orderBy('created_at')
                ->get();

            $position = 1;
            foreach ($orderedWorkspace as $agentId) {
                WorkspaceAgent::where('id', $agentId)->update(['queue_position' => $position++]);
            }
            foreach ($crmPending as $task) {
                $task->update(['n8n_queue_position' => $position++]);
            }
        });
    }

    public function removeWorkspaceAgentFromQueue(WorkspaceAgent $agent): void
    {
        if ($agent->status !== 'pending') {
            return;
        }

        $agent->update(['queue_position' => null]);
        $this->syncAllQueuePositions($agent->project_id);
    }

    public function bumpWorkspaceAgentToFront(WorkspaceAgent $agent): void
    {
        if ($agent->status !== 'pending') {
            return;
        }

        DB::transaction(function () use ($agent) {
            $this->incrementAllQueuePositions($agent->project_id, $agent->id, null);
            $agent->update(['queue_position' => 1]);
        });
    }

    public function bumpCrmTaskToFront(CrmProjectTask $task): void
    {
        if ($task->n8n_status !== 'pending') {
            return;
        }

        DB::transaction(function () use ($task) {
            $this->incrementAllQueuePositions($task->crm_project_id, null, $task->id);
            $task->update(['n8n_queue_position' => 1]);
        });
    }

    public function syncAllQueuePositions(int $projectId): void
    {
        $items = $this->collectPendingQueueItems($projectId)->values();

        foreach ($items as $index => $item) {
            $position = $index + 1;
            if ($item['type'] === 'workspace') {
                /** @var WorkspaceAgent $model */
                $model = $item['model'];
                if ((int) $model->queue_position !== $position) {
                    $model->update(['queue_position' => $position]);
                }
            } else {
                /** @var CrmProjectTask $model */
                $model = $item['model'];
                if ((int) $model->n8n_queue_position !== $position) {
                    $model->update(['n8n_queue_position' => $position]);
                }
            }
        }
    }

    /**
     * @return array{type: 'workspace'|'crm', model: WorkspaceAgent|CrmProjectTask}|null
     */
    private function getNextQueueItem(int $projectId): ?array
    {
        return $this->collectPendingQueueItems($projectId)->first();
    }

    /**
     * @return Collection<int, array{type: 'workspace'|'crm', model: WorkspaceAgent|CrmProjectTask, position: int, created_at: \Illuminate\Support\Carbon|null}>
     */
    private function collectPendingQueueItems(int $projectId): Collection
    {
        $agents = WorkspaceAgent::where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->where('status', 'pending')
            ->get()
            ->map(fn (WorkspaceAgent $agent) => [
                'type' => 'workspace',
                'model' => $agent,
                'position' => (int) ($agent->queue_position ?? PHP_INT_MAX),
                'created_at' => $agent->created_at,
            ]);

        $tasks = CrmProjectTask::where('crm_project_id', $projectId)
            ->whereIn('execution_mode', self::CRM_AGENT_MODES)
            ->where('n8n_status', 'pending')
            ->get()
            ->map(fn (CrmProjectTask $task) => [
                'type' => 'crm',
                'model' => $task,
                'position' => (int) ($task->n8n_queue_position ?? PHP_INT_MAX),
                'created_at' => $task->created_at,
            ]);

        return $agents->concat($tasks)
            ->sortBy([
                ['position', 'asc'],
                ['created_at', 'asc'],
            ])
            ->values();
    }

    private function nextQueuePosition(int $projectId): int
    {
        $agentMax = (int) WorkspaceAgent::where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->where('status', 'pending')
            ->max('queue_position');

        $taskMax = (int) CrmProjectTask::where('crm_project_id', $projectId)
            ->whereIn('execution_mode', self::CRM_AGENT_MODES)
            ->where('n8n_status', 'pending')
            ->max('n8n_queue_position');

        return max($agentMax, $taskMax) + 1;
    }

    private function incrementAllQueuePositions(int $projectId, ?int $skipAgentId, ?int $skipTaskId): void
    {
        WorkspaceAgent::where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->where('status', 'pending')
            ->when($skipAgentId, fn ($q) => $q->where('id', '!=', $skipAgentId))
            ->increment('queue_position');

        CrmProjectTask::where('crm_project_id', $projectId)
            ->whereIn('execution_mode', self::CRM_AGENT_MODES)
            ->where('n8n_status', 'pending')
            ->when($skipTaskId, fn ($q) => $q->where('id', '!=', $skipTaskId))
            ->increment('n8n_queue_position');
    }
}
