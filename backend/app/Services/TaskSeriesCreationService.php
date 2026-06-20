<?php

namespace App\Services;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TaskSeriesCreationService
{
    public function __construct(
        private readonly CrmProjectTaskCreationService $taskCreationService
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array{parent_task: CrmProjectTask|null, tasks: CrmProjectTask[], count: int}
     */
    public function createSeries(CrmProject $project, User $user, array $payload): array
    {
        $validator = Validator::make($payload, [
            'series_title' => 'required|string|max:255',
            'create_parent_task' => 'nullable|boolean',
            'dispatch_agents' => 'nullable|boolean',
            'tasks' => 'required|array|min:1|max:50',
            'tasks.*.title' => 'required|string|max:255',
            'tasks.*.description' => 'nullable|string',
            'tasks.*.execution_mode' => 'nullable|in:human,agent,agent_human',
            'tasks.*.exact_prompt' => 'nullable|boolean',
            'tasks.*.status' => 'nullable|in:pending,in_progress,review,completed,cancelled',
            'tasks.*.priority' => 'nullable|in:low,medium,high,urgent',
            'tasks.*.start_date' => 'nullable|date',
            'tasks.*.due_date' => 'nullable|date',
            'tasks.*.estimated_hours' => 'nullable|numeric|min:0',
            'tasks.*.selected' => 'nullable|boolean',
            'tasks.*.assignments' => 'nullable|array',
            'tasks.*.assignments.*.user_id' => 'required|exists:users,id',
            'tasks.*.assignments.*.payment_method' => 'required|in:hourly,per_task,per_project,fixed,no_payment',
            'tasks.*.assignments.*.hourly_rate_cocchi' => 'nullable|numeric|min:0',
            'tasks.*.assignments.*.hours_requested' => 'nullable|numeric|min:0',
            'tasks.*.assignments.*.task_rate_cocchi' => 'nullable|numeric|min:0',
            'tasks.*.assignments.*.project_rate_cocchi' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            throw new \InvalidArgumentException(
                'Dati non validi: ' . $validator->errors()->first()
            );
        }

        $data = $validator->validated();
        $createParent = filter_var($data['create_parent_task'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $dispatchAgents = filter_var($data['dispatch_agents'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $seriesTitle = $data['series_title'];

        $selectedTasks = array_values(array_filter(
            $data['tasks'],
            fn ($t) => filter_var($t['selected'] ?? true, FILTER_VALIDATE_BOOLEAN)
        ));

        if (empty($selectedTasks)) {
            throw new \InvalidArgumentException('Seleziona almeno un task da creare.');
        }

        foreach ($selectedTasks as $index => $taskInput) {
            $mode = $taskInput['execution_mode'] ?? 'human';
            if (in_array($mode, ['human', 'agent_human'], true)) {
                $assignments = array_filter(
                    $taskInput['assignments'] ?? [],
                    fn ($a) => !empty($a['user_id'])
                );
                if (empty($assignments)) {
                    throw new \InvalidArgumentException(
                        "Task \"{$taskInput['title']}\": le modalità Umano e Agente + Umano richiedono almeno un'assegnazione."
                    );
                }
            }
        }

        $createdTasks = [];
        $parentTask = null;

        DB::beginTransaction();
        try {
            if ($createParent) {
                $parentTask = $this->taskCreationService->createTask($project, $user, [
                    'title' => $seriesTitle,
                    'description' => 'Task contenitore per la serie: ' . $seriesTitle,
                    'status' => 'pending',
                    'execution_mode' => 'human',
                    'priority' => 'medium',
                ], dispatchAgents: false);
            }

            foreach ($selectedTasks as $taskInput) {
                $executionMode = in_array($taskInput['execution_mode'] ?? 'human', ['human', 'agent', 'agent_human'], true)
                    ? ($taskInput['execution_mode'] ?? 'human')
                    : 'human';

                $taskData = [
                    'title' => $taskInput['title'],
                    'description' => $taskInput['description'] ?? null,
                    'status' => $taskInput['status'] ?? 'pending',
                    'execution_mode' => $executionMode,
                    'exact_prompt' => filter_var($taskInput['exact_prompt'] ?? false, FILTER_VALIDATE_BOOLEAN),
                    'priority' => $taskInput['priority'] ?? 'medium',
                    'start_date' => $taskInput['start_date'] ?? null,
                    'due_date' => $taskInput['due_date'] ?? null,
                    'estimated_hours' => $taskInput['estimated_hours'] ?? null,
                    'assignments' => $taskInput['assignments'] ?? [],
                ];

                if ($parentTask) {
                    $taskData['parent_task_id'] = $parentTask->id;
                }

                $createdTasks[] = $this->taskCreationService->createTask(
                    $project,
                    $user,
                    $taskData,
                    dispatchAgents: $dispatchAgents
                );
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return [
            'parent_task' => $parentTask,
            'tasks' => $createdTasks,
            'count' => count($createdTasks),
        ];
    }
}
