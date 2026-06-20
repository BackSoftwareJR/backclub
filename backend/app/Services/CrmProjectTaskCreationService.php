<?php

namespace App\Services;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskAssignment;
use App\Models\User;
use App\Notifications\TaskAssigned;
use Illuminate\Support\Facades\Log;

class CrmProjectTaskCreationService
{
    /**
     * Create a single CRM project task with assignments and optional N8N dispatch.
     *
     * @param  array<string, mixed>  $data  Validated task fields (may include 'assignments')
     */
    public function createTask(
        CrmProject $project,
        User $user,
        array $data,
        bool $dispatchAgents = true
    ): CrmProjectTask {
        $taskData = $data;
        $taskData['crm_project_id'] = $project->id;
        $taskData['created_by'] = $user->id;
        $taskData['status'] = $taskData['status'] ?? 'pending';
        $taskData['execution_mode'] = in_array($taskData['execution_mode'] ?? 'human', ['human', 'agent', 'agent_human'], true)
            ? $taskData['execution_mode']
            : 'human';
        $taskData['exact_prompt'] = filter_var($taskData['exact_prompt'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $taskData['priority'] = $taskData['priority'] ?? 'medium';

        $assignments = $taskData['assignments'] ?? [];
        unset($taskData['assignments']);

        $task = CrmProjectTask::create($taskData);

        $totalBudget = 0;
        foreach ($assignments as $assignmentData) {
            if (empty($assignmentData['user_id'])) {
                continue;
            }

            $assignment = new CrmProjectTaskAssignment($assignmentData);
            $assignment->crm_project_task_id = $task->id;
            $assignment->assigned_by = $user->id;
            $assignment->total_cost_cocchi = $this->calculateAssignmentCost($assignment);
            $totalBudget += $assignment->total_cost_cocchi;
            $assignment->save();

            $assignedUser = User::find($assignment->user_id);
            if ($assignedUser) {
                $assignedUser->notify(new TaskAssigned($task, $project));
                try {
                    $mailService = new MailService();
                    $mailService->sendCrmTaskAssignedEmail(
                        $assignedUser->email,
                        $assignedUser->name ?? $assignedUser->email,
                        $task,
                        $project
                    );
                } catch (\Exception $e) {
                    Log::error('Email task CRM non inviata', [
                        'assignee_id' => $assignedUser->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        if (!$task->budget_cocchi && $totalBudget > 0) {
            $task->budget_cocchi = $totalBudget;
            $task->save();
        }

        if ($dispatchAgents && in_array($task->execution_mode, ['agent', 'agent_human'], true)) {
            try {
                $taskN8nService = app(TaskN8nService::class);
                if ($taskN8nService->isEnabled()) {
                    $taskN8nService->dispatchTaskAgent($task, $project);
                }
            } catch (\Exception $e) {
                Log::error('Failed to dispatch task to N8N', [
                    'task_id' => $task->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $task;
    }

    public function calculateAssignmentCost(CrmProjectTaskAssignment $assignment): float
    {
        switch ($assignment->payment_method) {
            case 'hourly':
                if ($assignment->hourly_rate_cocchi && $assignment->hours_requested) {
                    return $assignment->hourly_rate_cocchi * $assignment->hours_requested;
                }
                break;
            case 'per_task':
                return $assignment->task_rate_cocchi ?? 0;
            case 'per_project':
                return $assignment->project_rate_cocchi ?? 0;
            case 'fixed':
            case 'no_payment':
                return 0;
        }

        return 0;
    }
}
