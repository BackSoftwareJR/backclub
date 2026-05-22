<?php

namespace App\Http\Controllers;

use App\Models\ProjectTemplate;
use App\Models\ProjectTemplateRole;
use App\Models\ProjectTemplateTask;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProjectTemplateController extends Controller
{
    /**
     * Get all templates
     */
    public function index(Request $request)
    {
        $query = ProjectTemplate::with(['projectType', 'roles', 'tasks']);

        if ($request->has('active_only') && $request->active_only) {
            $query->active();
        }

        if ($request->has('with_tasks') && $request->with_tasks) {
            $query->withTasks();
        }

        $templates = $query->withCount(['roles', 'tasks'])->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Get single template with full details
     */
    public function show($id)
    {
        $template = ProjectTemplate::with([
            'projectType',
            'roles' => function ($query) {
                $query->orderBy('role_name');
            },
            'tasks' => function ($query) {
                $query->orderBy('order_index');
            }
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $template,
        ]);
    }

    /**
     * Create new template
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|unique:project_templates,code|max:100',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'project_type_id' => 'nullable|exists:project_types,id',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'default_duration_days' => 'nullable|integer|min:1',
            'has_tasks' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $template = ProjectTemplate::create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Template creato con successo',
            'data' => $template,
        ], 201);
    }

    /**
     * Update template
     */
    public function update(Request $request, $id)
    {
        $template = ProjectTemplate::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code' => 'string|unique:project_templates,code,' . $id . '|max:100',
            'name' => 'string|max:255',
            'description' => 'nullable|string',
            'project_type_id' => 'nullable|exists:project_types,id',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'default_duration_days' => 'nullable|integer|min:1',
            'has_tasks' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $template->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Template aggiornato con successo',
            'data' => $template->fresh(),
        ]);
    }

    /**
     * Delete template
     */
    public function destroy($id)
    {
        $template = ProjectTemplate::findOrFail($id);

        // Check if template is used by projects
        if ($template->projects()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Impossibile eliminare: il template è utilizzato da ' . $template->projects()->count() . ' progetti',
            ], 400);
        }

        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Template eliminato con successo',
        ]);
    }

    /**
     * Add role to template
     */
    public function addRole(Request $request, $id)
    {
        $template = ProjectTemplate::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'role_code' => 'required|string|max:100',
            'role_name' => 'required|string|max:255',
            'is_required' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $role = $template->roles()->create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Ruolo aggiunto al template',
            'data' => $role,
        ], 201);
    }

    /**
     * Update template role
     */
    public function updateRole(Request $request, $templateId, $roleId)
    {
        $role = ProjectTemplateRole::where('template_id', $templateId)
            ->where('id', $roleId)
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'role_code' => 'string|max:100',
            'role_name' => 'string|max:255',
            'is_required' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $role->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Ruolo aggiornato',
            'data' => $role,
        ]);
    }

    /**
     * Delete template role
     */
    public function deleteRole($templateId, $roleId)
    {
        $role = ProjectTemplateRole::where('template_id', $templateId)
            ->where('id', $roleId)
            ->firstOrFail();

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ruolo rimosso dal template',
        ]);
    }

    /**
     * Add task to template
     */
    public function addTask(Request $request, $id)
    {
        $template = ProjectTemplate::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'role_code' => 'nullable|string|max:100',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'start_offset_days' => 'nullable|integer|min:0',
            'due_offset_days' => 'nullable|integer|min:0',
            'estimated_hours' => 'nullable|numeric|min:0',
            'order_index' => 'nullable|integer|min:0',
            'dependencies' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $task = $template->tasks()->create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Task aggiunta al template',
            'data' => $task,
        ], 201);
    }

    /**
     * Update template task
     */
    public function updateTask(Request $request, $templateId, $taskId)
    {
        $task = ProjectTemplateTask::where('template_id', $templateId)
            ->where('id', $taskId)
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'role_code' => 'nullable|string|max:100',
            'title' => 'string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'start_offset_days' => 'nullable|integer|min:0',
            'due_offset_days' => 'nullable|integer|min:0',
            'estimated_hours' => 'nullable|numeric|min:0',
            'order_index' => 'nullable|integer|min:0',
            'dependencies' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $task->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Task aggiornata',
            'data' => $task,
        ]);
    }

    /**
     * Delete template task
     */
    public function deleteTask($templateId, $taskId)
    {
        $task = ProjectTemplateTask::where('template_id', $templateId)
            ->where('id', $taskId)
            ->firstOrFail();

        $task->delete();

        return response()->json([
            'success' => true,
            'message' => 'Task rimossa dal template',
        ]);
    }

    /**
     * Create project from template
     */
    public function createProjectFromTemplate(Request $request, $templateId)
    {
        $template = ProjectTemplate::with(['roles', 'tasks'])->findOrFail($templateId);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'client_id' => 'required|exists:clients,id',
            'manager_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'description' => 'nullable|string',
            'status' => 'nullable|in:planning,active,on_hold,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'budget' => 'nullable|numeric|min:0',
            'role_assignments' => 'required|array',
            'role_assignments.*.role_code' => 'required|string',
            'role_assignments.*.user_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create project
            $projectData = $request->only([
                'name', 'client_id', 'manager_id', 'start_date', 'end_date',
                'description', 'status', 'priority', 'budget'
            ]);
            $projectData['template_id'] = $template->id;
            $projectData['project_type_id'] = $template->project_type_id;
            $projectData['status'] = $projectData['status'] ?? 'planning';
            $projectData['priority'] = $projectData['priority'] ?? 'medium';

            $project = Project::create($projectData);

            // Create tasks from template
            $roleAssignments = collect($request->role_assignments)->keyBy('role_code');
            $createdTasks = [];

            foreach ($template->tasks as $templateTask) {
                $dates = $templateTask->calculateDates($project->start_date);
                
                $assignedUserId = null;
                if ($templateTask->role_code && isset($roleAssignments[$templateTask->role_code])) {
                    $assignedUserId = $roleAssignments[$templateTask->role_code]['user_id'];
                }

                $task = Task::create([
                    'project_id' => $project->id,
                    'title' => $templateTask->title,
                    'description' => $templateTask->description,
                    'status' => 'pending',
                    'priority' => $templateTask->priority,
                    'start_date' => $dates['start_date'],
                    'due_date' => $dates['due_date'],
                    'estimated_hours' => $templateTask->estimated_hours,
                    'created_by' => auth()->id(),
                ]);

                // Assign task to user
                if ($assignedUserId) {
                    $task->assignees()->attach($assignedUserId);
                }

                $createdTasks[] = $task;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Progetto creato da template con ' . count($createdTasks) . ' task',
                'data' => [
                    'project' => $project->load(['client', 'manager', 'projectType']),
                    'tasks' => $createdTasks,
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione del progetto: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Duplicate template
     */
    public function duplicate($id)
    {
        $original = ProjectTemplate::with(['roles', 'tasks'])->findOrFail($id);

        DB::beginTransaction();
        try {
            // Create new template
            $newTemplate = ProjectTemplate::create([
                'code' => $original->code . '_copy_' . time(),
                'name' => $original->name . ' (Copia)',
                'description' => $original->description,
                'project_type_id' => $original->project_type_id,
                'icon' => $original->icon,
                'color' => $original->color,
                'default_duration_days' => $original->default_duration_days,
                'has_tasks' => $original->has_tasks,
                'is_active' => false, // Inactive by default
            ]);

            // Copy roles
            foreach ($original->roles as $role) {
                $newTemplate->roles()->create([
                    'role_code' => $role->role_code,
                    'role_name' => $role->role_name,
                    'is_required' => $role->is_required,
                ]);
            }

            // Copy tasks
            foreach ($original->tasks as $task) {
                $newTemplate->tasks()->create([
                    'role_code' => $task->role_code,
                    'title' => $task->title,
                    'description' => $task->description,
                    'priority' => $task->priority,
                    'start_offset_days' => $task->start_offset_days,
                    'due_offset_days' => $task->due_offset_days,
                    'estimated_hours' => $task->estimated_hours,
                    'order_index' => $task->order_index,
                    'dependencies' => $task->dependencies,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Template duplicato con successo',
                'data' => $newTemplate->load(['roles', 'tasks']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nella duplicazione: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import template from JSON
     */
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'template_data' => 'required|json',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = json_decode($request->template_data, true);

        DB::beginTransaction();
        try {
            // Create template
            $template = ProjectTemplate::create([
                'code' => $data['code'] ?? 'imported_' . time(),
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'project_type_id' => $data['project_type_id'] ?? null,
                'icon' => $data['icon'] ?? null,
                'color' => $data['color'] ?? null,
                'default_duration_days' => $data['default_duration_days'] ?? 90,
                'has_tasks' => isset($data['tasks']) && count($data['tasks']) > 0,
                'is_active' => $data['is_active'] ?? true,
            ]);

            // Create roles
            if (isset($data['roles'])) {
                foreach ($data['roles'] as $roleData) {
                    $template->roles()->create([
                        'role_code' => $roleData['role_code'],
                        'role_name' => $roleData['role_name'],
                        'is_required' => $roleData['is_required'] ?? true,
                    ]);
                }
            }

            // Create tasks
            if (isset($data['tasks'])) {
                foreach ($data['tasks'] as $index => $taskData) {
                    $template->tasks()->create([
                        'role_code' => $taskData['role_code'] ?? null,
                        'title' => $taskData['title'],
                        'description' => $taskData['description'] ?? null,
                        'priority' => $taskData['priority'] ?? 'medium',
                        'start_offset_days' => $taskData['start_offset_days'] ?? 0,
                        'due_offset_days' => $taskData['due_offset_days'] ?? 7,
                        'estimated_hours' => $taskData['estimated_hours'] ?? null,
                        'order_index' => $taskData['order_index'] ?? $index,
                        'dependencies' => $taskData['dependencies'] ?? null,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Template importato con successo',
                'data' => $template->load(['roles', 'tasks']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'importazione: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export template to JSON
     */
    public function export($id)
    {
        $template = ProjectTemplate::with(['roles', 'tasks'])->findOrFail($id);

        $export = [
            'code' => $template->code,
            'name' => $template->name,
            'description' => $template->description,
            'project_type_id' => $template->project_type_id,
            'icon' => $template->icon,
            'color' => $template->color,
            'default_duration_days' => $template->default_duration_days,
            'has_tasks' => $template->has_tasks,
            'is_active' => $template->is_active,
            'roles' => $template->roles->map(function ($role) {
                return [
                    'role_code' => $role->role_code,
                    'role_name' => $role->role_name,
                    'is_required' => $role->is_required,
                ];
            }),
            'tasks' => $template->tasks->map(function ($task) {
                return [
                    'role_code' => $task->role_code,
                    'title' => $task->title,
                    'description' => $task->description,
                    'priority' => $task->priority,
                    'start_offset_days' => $task->start_offset_days,
                    'due_offset_days' => $task->due_offset_days,
                    'estimated_hours' => $task->estimated_hours,
                    'order_index' => $task->order_index,
                    'dependencies' => $task->dependencies,
                ];
            }),
        ];

        return response()->json([
            'success' => true,
            'data' => $export,
        ]);
    }
}

