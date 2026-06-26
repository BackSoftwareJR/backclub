<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskAssignment;
use App\Models\CrmProjectTaskRescheduleRequest;
use App\Models\CrmProjectTaskDeletionRequest;
use App\Models\CrmProjectTaskComment;
use App\Models\CrmProjectTaskCommentAttachment;
use App\Models\CrmProjectTaskAttachment;
use App\Models\CrmProjectTaskEvent;
use App\Models\CrmDepartment;
use App\Models\User;
use App\Notifications\TaskRequestReviewed;
use App\Notifications\TaskAssigned;
use App\Notifications\TaskReassigned;
use App\Mail\TaskRescheduleRequestReviewed;
use App\Mail\TaskDeletionRequestReviewed;
use App\Services\CrmProjectTaskCreationService;
use App\Services\MailService;
use App\Services\TaskN8nService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CrmProjectTaskController extends Controller
{
    /**
     * GET /api/crm-projects/{id}/tasks
     * Lista tutti i task del progetto
     */
    public function index(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();
        
        $query = CrmProjectTask::where('crm_project_id', $project->id)
            ->with([
                'creator:id,name,email',
                'assignments.user:id,name,email,avatar',
                'rescheduleRequests.user:id,name',
                'comments.user:id,name',
                'crmLabel:id,code,name,color,icon',
            ]);

        // Filtri
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->has('user_id')) {
            $query->whereHas('assignments', function ($q) use ($request) {
                $q->where('user_id', $request->user_id)->where('is_active', true);
            });
        }

        $tasks = $query->orderBy('due_date', 'asc')
            ->orderBy('priority', 'desc')
            ->get();

        // Filtra le task in base alla visibilità CRM
        // Admin e manager del progetto vedono tutte le task
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            $tasks = $tasks->filter(function ($task) use ($user, $project) {
                // Se la task non ha etichetta CRM, è visibile a tutti
                if (!$task->crm_label_id) {
                    return true;
                }

                // Se la task ha un'etichetta CRM, verifica se l'utente può vederla
                // L'utente può vedere la task se:
                // 1. È assegnato direttamente alla task
                $isAssigned = $task->assignments()
                    ->where('user_id', $user->id)
                    ->where('is_active', true)
                    ->exists();
                if ($isAssigned) {
                    return true;
                }

                // 2. È team member del progetto E appartiene al CRM dell'etichetta
                $isTeamMember = $project->teamMembers()
                    ->where('user_id', $user->id)
                    ->exists();
                if ($isTeamMember) {
                    $userCrmIds = $user->crmDepartments()->pluck('crm_departments.id')->toArray();
                    if (in_array($task->crm_label_id, $userCrmIds)) {
                        return true;
                    }
                }

                // 3. È il responsabile del CRM dell'etichetta
                $crmLabel = \App\Models\CrmDepartment::find($task->crm_label_id);
                if ($crmLabel && $crmLabel->manager_id === $user->id) {
                    return true;
                }

                return false;
            })->values();
        }

        return response()->json([
            'success' => true,
            'data' => $tasks,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks
     * Crea un nuovo task
     */
    public function store(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        if (!$this->canCreateTask($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai il permesso di creare task in questo progetto.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:pending,in_progress,review,completed,cancelled',
            'execution_mode' => 'nullable|in:human,agent,agent_human',
            'exact_prompt' => 'nullable|boolean',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'budget_cocchi' => 'nullable|numeric|min:0',
            'crm_label_id' => 'nullable|exists:crm_departments,id',
            'parent_task_id' => 'nullable|exists:crm_project_tasks,id',
            'assignments' => 'nullable|array',
            'assignments.*.user_id' => 'required|exists:users,id',
            'assignments.*.payment_method' => 'required|in:hourly,per_task,per_project,fixed,no_payment',
            'assignments.*.hourly_rate_cocchi' => 'nullable|numeric|min:0|required_if:assignments.*.payment_method,hourly',
            'assignments.*.hours_requested' => 'nullable|numeric|min:0|required_if:assignments.*.payment_method,hourly',
            'assignments.*.task_rate_cocchi' => 'nullable|numeric|min:0|required_if:assignments.*.payment_method,per_task',
            'assignments.*.project_rate_cocchi' => 'nullable|numeric|min:0|required_if:assignments.*.payment_method,per_project',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $task = app(CrmProjectTaskCreationService::class)->createTask(
                $project,
                $user,
                $validator->validated()
            );

            $task->load([
                'creator',
                'assignments.user',
                'project',
                'events.user',
                'comments.user',
                'crmLabel:id,code,name,color,icon'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Task creato con successo',
                'data' => $task,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione del task: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/crm-projects/{id}/tasks/{taskId}
     * Mostra dettagli di un task. Accesso: admin, PM del progetto, assegnatario o team member.
     */
    public function show($id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->with([
                'creator',
                'assignments.user',
                'assignments.assigner',
                'rescheduleRequests.user',
                'rescheduleRequests.reviewer',
                'comments.user',
                'events.user',
                'attachments.user:id,name,email,avatar',
                'subtasks',
                'parentTask',
                'crmLabel:id,code,name,color,icon',
                'project:id,name,crm_department_id',
                'project.crmDepartment:id,code,name,color,icon',
            ])
            ->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        if ($task->n8n_status === 'processing' && !empty($task->n8n_execution_id)) {
            app(TaskN8nService::class)->syncCrmTaskFromOrchestrator($task);
            $task->refresh();
        }

        return response()->json([
            'success' => true,
            'data' => $task,
        ]);
    }

    /**
     * Verifica se l'utente può accedere al task: admin, PM, assegnatario attivo o team member del progetto.
     */
    private function userCanAccessTask($user, CrmProject $project, CrmProjectTask $task): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        if ((int) $project->manager_id === (int) $user->id) {
            return true;
        }
        $isAssigned = $task->assignments()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();
        if ($isAssigned) {
            return true;
        }
        $isTeamMember = $project->teamMembers()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();

        return $isTeamMember;
    }

    /**
     * PUT /api/crm-projects/{id}/tasks/{taskId}
     * Aggiorna un task
     */
    public function update(Request $request, $id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Non autenticato',
            ], 401);
        }
        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai il permesso di modificare questa task',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:pending,in_progress,review,completed,cancelled',
            'execution_mode' => 'sometimes|in:human,agent,agent_human',
            'exact_prompt' => 'sometimes|boolean',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'completed_date' => 'nullable|date',
            'progress' => 'sometimes|integer|min:0|max:100',
            'estimated_hours' => 'nullable|numeric|min:0',
            'actual_hours' => 'nullable|numeric|min:0',
            'budget_cocchi' => 'nullable|numeric|min:0',
            'crm_label_id' => 'nullable|exists:crm_departments,id',
            'work_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Se il task viene completato, imposta la data di completamento
        if ($request->has('status') && $request->status === 'completed' && !$task->completed_date) {
            $validator->validated()['completed_date'] = now();
        }

        $oldStatus = $task->status;
        $validated = $validator->validated();
        $task->update($validated);

        if ($request->has('status') && $request->status !== $oldStatus) {
            $this->recordStatusChangeEvent($task, $user, $oldStatus, $request->status);
        }

        $task->load([
            'creator',
            'assignments.user',
            'project'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Task aggiornato con successo',
            'data' => $task,
        ]);
    }

    /**
     * DELETE /api/crm-projects/{id}/tasks/{taskId}
     * Elimina un task
     */
    public function destroy($id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        $task->delete();

        return response()->json([
            'success' => true,
            'message' => 'Task eliminato con successo',
        ]);
    }

    /**
     * PUT /api/crm-projects/{id}/tasks/{taskId}/update-due-date
     * Aggiorna la data di scadenza (per admin/manager)
     */
    public function updateDueDate(Request $request, $id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);
        $user = Auth::user();

        // Solo admin o manager del progetto possono modificare direttamente
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per modificare la data di scadenza',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'due_date' => 'required|date|after_or_equal:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $oldDueDate = $task->due_date;
        $task->update(['due_date' => $request->due_date]);

        // Crea evento per la modifica scadenza
        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => 'modifica_scadenza',
            'event_data' => [
                'old_due_date' => $oldDueDate,
                'new_due_date' => $request->due_date,
            ],
            'description' => "Data scadenza modificata da {$oldDueDate} a {$request->due_date}",
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data di scadenza aggiornata con successo',
            'data' => $task,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/reschedule-request
     * Crea una richiesta di spostamento data
     */
    public function createRescheduleRequest(Request $request, $id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);
        $user = Auth::user();

        // Verifica che l'utente sia assegnato al task
        $isAssigned = $task->assignments()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();

        if (!$isAssigned && $user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Solo gli utenti assegnati possono richiedere lo spostamento',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'requested_due_date' => 'required|date',
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $rescheduleRequest = CrmProjectTaskRescheduleRequest::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'current_due_date' => $task->due_date,
            'requested_due_date' => $request->requested_due_date,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Crea evento per la richiesta di spostamento
        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => 'richiesta_spostamento',
            'event_data' => [
                'current_due_date' => $task->due_date,
                'requested_due_date' => $request->requested_due_date,
                'reschedule_request_id' => $rescheduleRequest->id,
            ],
            'description' => $request->reason ? "Richiesta spostamento: {$request->reason}" : "Richiesta spostamento data da {$task->due_date} a {$request->requested_due_date}",
            'created_at' => now(),
        ]);

        $rescheduleRequest->load('user', 'task');

        return response()->json([
            'success' => true,
            'message' => 'Richiesta di spostamento creata con successo',
            'data' => $rescheduleRequest,
        ], 201);
    }

    /**
     * GET /api/crm-projects/{id}/tasks/reschedule-requests
     * Lista tutte le richieste di spostamento del progetto
     */
    public function getRescheduleRequests($id)
    {
        $project = CrmProject::findOrFail($id);

        $requests = CrmProjectTaskRescheduleRequest::whereHas('task', function ($q) use ($project) {
            $q->where('crm_project_id', $project->id);
        })
            ->with(['user', 'task', 'reviewer'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    /**
     * PUT /api/crm-projects/{id}/tasks/reschedule-requests/{requestId}/review
     * Approva o rifiuta una richiesta di spostamento
     */
    public function reviewRescheduleRequest(Request $request, $id, $requestId)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        // Solo admin o manager possono approvare
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per approvare richieste',
            ], 403);
        }

        $rescheduleRequest = CrmProjectTaskRescheduleRequest::whereHas('task', function ($q) use ($project) {
            $q->where('crm_project_id', $project->id);
        })->findOrFail($requestId);

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected',
            'review_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $rescheduleRequest->update([
            'status' => $request->status,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_notes' => $request->review_notes,
        ]);

        // Se approvata, aggiorna la data del task
        if ($request->status === 'approved') {
            $rescheduleRequest->task->update([
                'due_date' => $rescheduleRequest->requested_due_date
            ]);
        }

        // Crea evento per approvazione/rifiuto
        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $rescheduleRequest->task->id,
            'user_id' => $user->id,
            'event_type' => $request->status === 'approved' ? 'approvazione_spostamento' : 'rifiuto_spostamento',
            'event_data' => [
                'reschedule_request_id' => $rescheduleRequest->id,
                'requested_due_date' => $rescheduleRequest->requested_due_date,
                'review_notes' => $request->review_notes,
            ],
            'description' => $request->status === 'approved' 
                ? "Richiesta spostamento approvata. Nuova data: {$rescheduleRequest->requested_due_date}"
                : "Richiesta spostamento rifiutata" . ($request->review_notes ? ": {$request->review_notes}" : ''),
            'created_at' => now(),
        ]);

        $rescheduleRequest->load('user', 'task', 'reviewer', 'task.project.manager');

        // Invia notifica al freelance che ha fatto la richiesta
        if ($rescheduleRequest->user) {
            $rescheduleRequest->user->notify(
                new TaskRequestReviewed($rescheduleRequest, 'reschedule', $request->status, $user)
            );
        }

        // Invia email al freelance
        if ($rescheduleRequest->user && $rescheduleRequest->user->email) {
            try {
                // Reload request with all relations for email
                $rescheduleRequest->refresh();
                $rescheduleRequest->load('user', 'task.project', 'reviewer');
                
                Mail::to($rescheduleRequest->user->email)->send(
                    new TaskRescheduleRequestReviewed($rescheduleRequest, $request->status, $user)
                );
            } catch (\Exception $e) {
                \Log::error('Error sending reschedule request reviewed email: ' . $e->getMessage());
            }
        }

        // Invia notifica e email al Project Manager (se diverso dal revisore)
        $project = $rescheduleRequest->task->project;
        if (!$project) {
            $project = CrmProject::find($rescheduleRequest->task->crm_project_id);
        }
        if ($project && $project->manager_id && $project->manager_id !== $user->id) {
            $pm = User::find($project->manager_id);
            if ($pm) {
                // Notifica al PM
                $pm->notify(
                    new TaskRequestReviewed($rescheduleRequest, 'reschedule', $request->status, $user)
                );

                // Email al PM
                if ($pm->email) {
                    try {
                        // Reload request with all relations for email
                        $rescheduleRequest->refresh();
                        $rescheduleRequest->load('user', 'task.project', 'reviewer');
                        
                        Mail::to($pm->email)->send(
                            new TaskRescheduleRequestReviewed($rescheduleRequest, $request->status, $user)
                        );
                    } catch (\Exception $e) {
                        \Log::error('Error sending PM reschedule request reviewed email: ' . $e->getMessage());
                    }
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Richiesta ' . ($request->status === 'approved' ? 'approvata' : 'rifiutata') . ' con successo',
            'data' => $rescheduleRequest,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/deletion-request
     * Crea una richiesta di eliminazione task
     */
    public function createDeletionRequest(Request $request, $id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);
        $user = Auth::user();

        // Verifica che l'utente sia assegnato al task
        $isAssigned = $task->assignments()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();

        if (!$isAssigned && $user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Solo gli utenti assegnati possono richiedere l\'eliminazione',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $deletionRequest = CrmProjectTaskDeletionRequest::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Crea evento per la richiesta di eliminazione
        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => 'richiesta_eliminazione',
            'event_data' => [
                'deletion_request_id' => $deletionRequest->id,
            ],
            'description' => "Richiesta eliminazione: {$request->reason}",
            'created_at' => now(),
        ]);

        $deletionRequest->load('user:id,name,email,avatar', 'task');

        return response()->json([
            'success' => true,
            'message' => 'Richiesta di eliminazione creata con successo',
            'data' => $deletionRequest,
        ], 201);
    }

    /**
     * GET /api/crm-projects/{id}/tasks/deletion-requests
     * Lista tutte le richieste di eliminazione del progetto
     */
    public function getDeletionRequests($id)
    {
        $project = CrmProject::findOrFail($id);

        $requests = CrmProjectTaskDeletionRequest::whereHas('task', function ($q) use ($project) {
            $q->where('crm_project_id', $project->id);
        })
            ->with(['user:id,name,email,avatar', 'task', 'reviewer:id,name,email,avatar'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    /**
     * GET /api/crm-projects/{id}/tasks/{taskId}/deletion-requests
     * Lista le richieste di eliminazione per una specifica task
     */
    public function getTaskDeletionRequests($id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        $requests = CrmProjectTaskDeletionRequest::where('crm_project_task_id', $task->id)
            ->with(['user:id,name,email,avatar', 'reviewer:id,name,email,avatar'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    /**
     * PUT /api/crm-projects/{id}/tasks/deletion-requests/{requestId}/review
     * Approva o rifiuta una richiesta di eliminazione
     */
    public function reviewDeletionRequest(Request $request, $id, $requestId)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        // Solo admin o manager possono approvare
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per approvare richieste',
            ], 403);
        }

        $deletionRequest = CrmProjectTaskDeletionRequest::whereHas('task', function ($q) use ($project) {
            $q->where('crm_project_id', $project->id);
        })->findOrFail($requestId);

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected',
            'review_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $deletionRequest->update([
            'status' => $request->status,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_notes' => $request->review_notes,
        ]);

        // Se approvata, marca la task come cancellata
        if ($request->status === 'approved') {
            $deletionRequest->task->update([
                'status' => 'cancelled'
            ]);
        }

        // Crea evento per approvazione/rifiuto
        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $deletionRequest->task->id,
            'user_id' => $user->id,
            'event_type' => $request->status === 'approved' ? 'approvazione_eliminazione' : 'rifiuto_eliminazione',
            'event_data' => [
                'deletion_request_id' => $deletionRequest->id,
                'review_notes' => $request->review_notes,
            ],
            'description' => $request->status === 'approved' 
                ? "Richiesta eliminazione approvata" . ($request->review_notes ? ": {$request->review_notes}" : '')
                : "Richiesta eliminazione rifiutata" . ($request->review_notes ? ": {$request->review_notes}" : ''),
            'created_at' => now(),
        ]);

        $deletionRequest->load('user:id,name,email,avatar', 'task', 'task.project.manager', 'reviewer:id,name,email,avatar');

        // Invia notifica al freelance che ha fatto la richiesta
        if ($deletionRequest->user) {
            $deletionRequest->user->notify(
                new TaskRequestReviewed($deletionRequest, 'deletion', $request->status, $user)
            );
        }

        // Invia email al freelance
        if ($deletionRequest->user && $deletionRequest->user->email) {
            try {
                // Reload request with all relations for email
                $deletionRequest->refresh();
                $deletionRequest->load('user', 'task.project', 'reviewer');
                
                Mail::to($deletionRequest->user->email)->send(
                    new TaskDeletionRequestReviewed($deletionRequest, $request->status, $user)
                );
            } catch (\Exception $e) {
                \Log::error('Error sending deletion request reviewed email: ' . $e->getMessage());
            }
        }

        // Invia notifica e email al Project Manager (se diverso dal revisore)
        $project = $deletionRequest->task->project;
        if (!$project) {
            $project = CrmProject::find($deletionRequest->task->crm_project_id);
        }
        if ($project && $project->manager_id && $project->manager_id !== $user->id) {
            $pm = User::find($project->manager_id);
            if ($pm) {
                // Notifica al PM
                $pm->notify(
                    new TaskRequestReviewed($deletionRequest, 'deletion', $request->status, $user)
                );

                // Email al PM
                if ($pm->email) {
                    try {
                        // Reload request with all relations for email
                        $deletionRequest->refresh();
                        $deletionRequest->load('user', 'task.project', 'reviewer');
                        
                        Mail::to($pm->email)->send(
                            new TaskDeletionRequestReviewed($deletionRequest, $request->status, $user)
                        );
                    } catch (\Exception $e) {
                        \Log::error('Error sending PM deletion request reviewed email: ' . $e->getMessage());
                    }
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Richiesta ' . ($request->status === 'approved' ? 'approvata' : 'rifiutata') . ' con successo',
            'data' => $deletionRequest,
        ]);
    }

    /**
     * Calcola il costo di un'assegnazione in base al metodo di pagamento
     */
    private function canCreateTask($user, CrmProject $project): bool
    {
        if (!$user) {
            return false;
        }

        return $user->role === 'admin' || (int) $project->manager_id === (int) $user->id;
    }

    private function calculateAssignmentCost(CrmProjectTaskAssignment $assignment): float
    {
        return app(CrmProjectTaskCreationService::class)->calculateAssignmentCost($assignment);
    }

    /**
     * GET /api/crm-projects/{id}/tasks/{taskId}/events
     * Recupera tutti gli eventi di un task
     */
    public function getEvents($id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        $events = CrmProjectTaskEvent::where('crm_project_task_id', $task->id)
            ->with('user:id,name,email,avatar')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $events,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/notes
     * Crea una nota su un task. Accesso: admin, PM, assegnatario o team member (così il PM può commentare).
     */
    public function createNote(Request $request, $id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'comment' => 'required_without:files|nullable|string',
            'files' => 'nullable|array|max:10',
            'files.*' => 'file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $commentText = trim((string) $request->input('comment', ''));
        $hasFiles = $request->hasFile('files') || $request->hasFile('file');

        if ($commentText === '' && !$hasFiles) {
            return response()->json([
                'success' => false,
                'message' => 'Inserisci un commento o allega almeno un file',
            ], 422);
        }

        $comment = CrmProjectTaskComment::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'comment' => $commentText !== '' ? $commentText : '[Allegato]',
            'is_note' => true,
        ]);

        $uploadedFiles = [];
        if ($request->hasFile('files')) {
            $uploadedFiles = $request->file('files');
        } elseif ($request->hasFile('file')) {
            $uploadedFiles = [$request->file('file')];
        }

        foreach ($uploadedFiles as $file) {
            $stored = $this->storeTaskFile($file, 'crm-projects/task-comments');
            if ($stored) {
                CrmProjectTaskCommentAttachment::create([
                    'crm_project_task_comment_id' => $comment->id,
                    'file_path' => $stored['path'],
                    'file_name' => $stored['name'],
                    'file_size' => $stored['size'],
                    'mime_type' => $stored['mime'],
                ]);
            }
        }

        // Crea evento per la nota aggiunta
        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => 'aggiunta_note',
            'description' => 'Nota aggiunta alla task',
            'created_at' => now(),
        ]);

        $comment->load('user:id,name,email,avatar', 'attachments');

        $comment = $this->formatCommentWithUrls($comment);

        return response()->json([
            'success' => true,
            'message' => 'Nota aggiunta con successo',
            'data' => $comment,
        ], 201);
    }

    /**
     * GET /api/crm-projects/{id}/tasks/{taskId}/notes
     * Recupera tutte le note di un task. Accesso: admin, PM, assegnatario o team member.
     */
    public function getNotes($id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        $notes = CrmProjectTaskComment::where('crm_project_task_id', $task->id)
            ->where('is_note', true)
            ->with(['user:id,name,email,avatar', 'attachments'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($note) => $this->formatCommentWithUrls($note));

        return response()->json([
            'success' => true,
            'data' => $notes,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/reassign
     * Riassegna un task a un altro utente
     */
    public function reassign(Request $request, $id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->with(['assignments.user'])
            ->findOrFail($taskId);

        $validator = Validator::make($request->all(), [
            'new_user_id' => 'required|exists:users,id',
            'new_due_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dati non validi',
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Trova le assegnazioni attive (se nessuna, trattiamo come "assegna" invece di "riassegna")
            $activeAssignments = $task->assignments()->where('is_active', true)->get();

            if ($activeAssignments->isEmpty()) {
                $oldUserIds = [];
                $oldUserNames = [];
            } else {
                $oldUserIds = $activeAssignments->pluck('user_id')->toArray();
                $oldUserNames = $activeAssignments->map(function ($a) {
                    return $a->user ? $a->user->name : 'Utente sconosciuto';
                })->toArray();

                // Disattiva tutte le assegnazioni esistenti
                foreach ($activeAssignments as $assignment) {
                    $assignment->update([
                        'is_active' => false,
                        'end_date' => now(),
                    ]);
                }
            }

            $newUser = User::findOrFail($request->new_user_id);

            // Nuova assegnazione: se il nuovo utente ha già una riga (anche disattivata), riattivala; altrimenti creala
            $existingAssignment = CrmProjectTaskAssignment::where('crm_project_task_id', $task->id)
                ->where('user_id', $request->new_user_id)
                ->first();

            if ($existingAssignment) {
                $existingAssignment->update([
                    'is_active' => true,
                    'start_date' => now(),
                    'end_date' => null,
                    'assigned_by' => $user->id,
                    'payment_method' => $existingAssignment->payment_method ?: 'hourly',
                ]);
            } else {
                CrmProjectTaskAssignment::create([
                    'crm_project_task_id' => $task->id,
                    'user_id' => $request->new_user_id,
                    'assigned_by' => $user->id,
                    'payment_method' => 'hourly',
                    'is_active' => true,
                    'start_date' => now(),
                ]);
            }

            // Aggiorna la data di scadenza del task (prima dell'email così l'email mostra la nuova scadenza)
            $oldDueDate = $task->due_date;
            $task->update([
                'due_date' => $request->new_due_date,
            ]);
            
            // Invia email via PHPMailer (MailService) e notifica in-app (database)
            $newUser = User::find($request->new_user_id);
            if ($newUser) {
                $newUser->notify(new TaskReassigned($task, $project, $user));
                try {
                    $mailService = app(MailService::class);
                    $mailService->sendTaskReassignedEmail(
                        $newUser->email,
                        $newUser->name,
                        $task,
                        $project,
                        $user
                    );
                } catch (\Exception $e) {
                    Log::warning('Task reassigned email failed (task still reassigned)', [
                        'task_id' => $task->id,
                        'to' => $newUser->email,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Crea evento (riassegnazione o prima assegnazione)
            $eventDescription = $oldUserNames !== []
                ? sprintf(
                    'Task riassegnato da %s a %s. Data scadenza modificata da %s a %s',
                    implode(', ', $oldUserNames),
                    $newUser->name,
                    $oldDueDate ? date('d/m/Y', strtotime($oldDueDate)) : 'non definita',
                    date('d/m/Y', strtotime($request->new_due_date))
                )
                : sprintf(
                    'Task assegnato a %s. Data scadenza: %s',
                    $newUser->name,
                    date('d/m/Y', strtotime($request->new_due_date))
                );

            CrmProjectTaskEvent::create([
                'crm_project_task_id' => $task->id,
                'user_id' => $user->id,
                'event_type' => $oldUserNames !== [] ? 'reassign' : 'assign',
                'event_data' => [
                    'old_user_ids' => $oldUserIds,
                    'old_user_names' => $oldUserNames,
                    'new_user_id' => $request->new_user_id,
                    'new_user_name' => $newUser->name,
                    'old_due_date' => $oldDueDate,
                    'new_due_date' => $request->new_due_date,
                ],
                'description' => $eventDescription,
                'created_at' => now(),
            ]);

            DB::commit();

            $task->load([
                'assignments.user:id,name,email,avatar',
                'creator:id,name,email',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Task riassegnato con successo',
                'data' => $task,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la riassegnazione: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/crm-projects/{id}/tasks/{taskId}/n8n-steps
     * Recupera lo stato N8N e gli steps di un task
     */
    public function getN8nSteps($id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->with(['n8nSteps' => function($query) {
                $query->ordered();
            }])
            ->findOrFail($taskId);

        $user = Auth::user();
        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'task_id' => $task->id,
                'execution_mode' => $task->execution_mode,
                'n8n_status' => $task->n8n_status,
                'n8n_execution_id' => $task->n8n_execution_id,
                'n8n_error' => $task->n8n_error,
                'n8n_completed_at' => $task->n8n_completed_at,
                'progress' => $task->progress,
                'steps' => $task->n8nSteps->map(function ($step) {
                    return [
                        'id' => $step->id,
                        'step_key' => $step->step_key,
                        'title' => $step->title,
                        'message' => $step->message,
                        'status' => $step->status,
                        'payload' => $step->payload,
                        'sort_order' => $step->sort_order,
                        'created_at' => $step->created_at,
                        'updated_at' => $step->updated_at,
                    ];
                })
            ]
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/n8n-callback
     * Webhook callback dall'orchestratore N8N (endpoint pubblico)
     */
    public function n8nCallback(Request $request, $id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        $taskN8nService = app(TaskN8nService::class);

        // Verify callback authentication
        if (!$taskN8nService->verifyCallbackAuth($request)) {
            Log::warning('N8N callback authentication failed', [
                'task_id' => $taskId,
                'ip' => $request->ip(),
                'headers' => $request->headers->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Authentication failed'
            ], 401);
        }

        try {
            $payload = $request->all();
            $taskN8nService->handleCallback($task, $payload);

            return response()->json([
                'success' => true,
                'message' => 'Callback processed successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('N8N callback processing failed', [
                'task_id' => $taskId,
                'error' => $e->getMessage(),
                'payload' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Callback processing failed'
            ], 500);
        }
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/n8n-actions
     * Azioni N8N per admin/PM: restart, stop, request_review
     */
    public function n8nAction(Request $request, $id, $taskId)
    {
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        $user = Auth::user();

        // Check permissions: admin, PM del progetto, o creatore del task
        if ($user->role !== 'admin' && 
            $project->manager_id !== $user->id && 
            $task->created_by !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per eseguire azioni N8N su questo task'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:restart,stop,request_review,update_progress',
            'review_message' => 'nullable|string|max:2000',
            'progress' => 'nullable|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $action = $request->action;

        try {
            $taskN8nService = app(TaskN8nService::class);

            switch ($action) {
                case 'restart':
                    if (!$taskN8nService->isEnabled()) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Integrazione N8N non abilitata',
                        ], 422);
                    }

                    $task->update([
                        'n8n_status' => null,
                        'n8n_execution_id' => null,
                        'n8n_queue_position' => null,
                        'n8n_error' => null,
                        'n8n_response' => null,
                        'progress' => 0,
                    ]);

                    $queue = app(\App\Services\ProjectOrchestratorQueueService::class);

                    if ($request->review_message) {
                        $this->dispatchTaskWithRevision($task, $project, $request->review_message, $taskN8nService);
                    } else {
                        $queue->enqueueCrmTask($task);
                        $queue->bumpCrmTaskToFront($task);
                        // forceResetStuck=true: sblocca job stuck bloccati da più di 2 ore
                        $queue->tryDispatchNext($project->id, forceResetStuck: true);
                    }

                    $taskN8nService->appendStep($task, [
                        'step_key' => 'manual_restart',
                        'title' => 'Task riavviato manualmente',
                        'message' => "Task riavviato da {$user->name}" . ($request->review_message ? " con feedback: {$request->review_message}" : ''),
                        'status' => 'completed',
                        'payload' => ['restarted_by' => $user->id, 'restarted_at' => now(), 'feedback' => $request->review_message]
                    ]);

                    $message = 'Task riavviato con successo';
                    break;

                case 'stop':
                    $task->update([
                        'n8n_status' => 'skipped',
                        'n8n_queue_position' => null,
                        'n8n_error' => "Fermato manualmente da {$user->name}"
                    ]);

                    app(\App\Services\ProjectOrchestratorQueueService::class)
                        ->releaseProjectSlot($project->id);

                    $taskN8nService->appendStep($task, [
                        'step_key' => 'manual_stop',
                        'title' => 'Task fermato manualmente',
                        'message' => "Task fermato da {$user->name}",
                        'status' => 'skipped',
                        'payload' => ['stopped_by' => $user->id, 'stopped_at' => now()]
                    ]);

                    $message = 'Task fermato con successo';
                    break;

                case 'request_review':
                    // For request_review with message, dispatch with revision
                    if ($request->review_message) {
                        $this->dispatchTaskWithRevision($task, $project, $request->review_message, $taskN8nService);
                        $message = 'Task riavviato con feedback per revisione';
                    } else {
                        // Change execution mode to require human review
                        $task->update([
                            'execution_mode' => 'agent_human',
                            'n8n_status' => 'completed' // Mark N8N part as done
                        ]);
                        $message = 'Revisione umana richiesta con successo';
                    }

                    $taskN8nService->appendStep($task, [
                        'step_key' => 'request_review',
                        'title' => 'Richiesta revisione umana',
                        'message' => $request->review_message ?: "Revisione richiesta da {$user->name}",
                        'status' => 'completed',
                        'payload' => [
                            'requested_by' => $user->id,
                            'requested_at' => now(),
                            'message' => $request->review_message
                        ]
                    ]);

                    break;

                case 'update_progress':
                    $progress = max(0, min(100, (int) $request->input('progress', 0)));
                    $task->update(['progress' => $progress]);
                    $message = "Progresso aggiornato a {$progress}%";
                    break;
            }

            Log::info("N8N action '{$action}' executed", [
                'task_id' => $taskId,
                'user_id' => $user->id,
                'action' => $action
            ]);

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'task_id' => $task->id,
                    'action' => $action,
                    'n8n_status' => $task->n8n_status
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("N8N action '{$action}' failed", [
                'task_id' => $taskId,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => "Errore eseguendo azione '{$action}': " . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/crm-projects/{id}/n8n-queue-status
     * Diagnostica: stato della coda N8N per il progetto (admin/PM only)
     */
    public function n8nQueueStatus(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Accesso negato'], 403);
        }

        $queueService = app(\App\Services\ProjectOrchestratorQueueService::class);
        $taskN8nService = app(TaskN8nService::class);

        $activeAgents = \App\Models\WorkspaceAgent::where('project_id', $project->id)
            ->whereNull('deleted_at')
            ->whereIn('status', \App\Services\ProjectOrchestratorQueueService::WORKSPACE_ACTIVE_STATUSES)
            ->get(['id', 'title', 'status', 'started_at', 'updated_at', 'n8n_execution_id']);

        $processingTasks = CrmProjectTask::where('crm_project_id', $project->id)
            ->whereIn('execution_mode', \App\Services\ProjectOrchestratorQueueService::CRM_AGENT_MODES)
            ->where('n8n_status', 'processing')
            ->get(['id', 'title', 'n8n_status', 'n8n_execution_id', 'updated_at', 'created_at']);

        $pendingTasks = CrmProjectTask::where('crm_project_id', $project->id)
            ->whereIn('execution_mode', \App\Services\ProjectOrchestratorQueueService::CRM_AGENT_MODES)
            ->where('n8n_status', 'pending')
            ->orderBy('n8n_queue_position')
            ->get(['id', 'title', 'n8n_status', 'n8n_queue_position', 'created_at']);

        $staleThreshold = now()->subMinutes(120);

        return response()->json([
            'success' => true,
            'data' => [
                'n8n_enabled' => $taskN8nService->isEnabled(),
                'has_active_work' => $queueService->hasActiveWork($project->id),
                'active_workspace_agents' => $activeAgents->map(fn ($a) => array_merge(
                    $a->toArray(),
                    ['is_stale' => $a->updated_at < $staleThreshold]
                )),
                'processing_tasks' => $processingTasks->map(fn ($t) => array_merge(
                    $t->toArray(),
                    ['is_stale' => $t->updated_at < $staleThreshold]
                )),
                'pending_tasks' => $pendingTasks,
                'queue_blocked_by' => $activeAgents->count() + $processingTasks->count() > 0
                    ? 'active_work'
                    : null,
            ],
        ]);
    }

    /**
     * Dispatch task with revision feedback
     */
    private function dispatchTaskWithRevision(CrmProjectTask $task, CrmProject $project, string $revisionFeedback, TaskN8nService $taskN8nService): void
    {
        $task->update([
            'n8n_status' => null,
            'n8n_execution_id' => null,
            'n8n_queue_position' => null,
            'n8n_error' => null,
            'n8n_response' => null,
            'progress' => 0,
        ]);

        $task->revision_feedback = $revisionFeedback;
        $task->is_revision = true;

        $queue = app(\App\Services\ProjectOrchestratorQueueService::class);
        $queue->enqueueCrmTask($task);
        $queue->bumpCrmTaskToFront($task);
        $task->refresh();
        $task->revision_feedback = $revisionFeedback;
        $task->is_revision = true;
        $queue->tryDispatchNext($project->id);

        unset($task->revision_feedback);
        unset($task->is_revision);
    }

    /**
     * PATCH /api/crm-projects/{id}/tasks/{taskId}/work-notes
     */
    public function updateWorkNotes(Request $request, $id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'work_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $task->update(['work_notes' => $request->input('work_notes')]);

        return response()->json([
            'success' => true,
            'message' => 'Note salvate',
            'data' => [
                'work_notes' => $task->work_notes,
                'updated_at' => $task->updated_at,
            ],
        ]);
    }

    /**
     * GET /api/crm-projects/{id}/tasks/{taskId}/attachments
     */
    public function getAttachments($id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        $attachments = CrmProjectTaskAttachment::where('crm_project_task_id', $task->id)
            ->with('user:id,name,email,avatar')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($attachment) => $this->formatAttachmentWithUrl($attachment));

        return response()->json([
            'success' => true,
            'data' => $attachments,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/attachments
     */
    public function storeAttachment(Request $request, $id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $stored = $this->storeTaskFile($request->file('file'), 'crm-projects/task-attachments');
        if (!$stored) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nel salvataggio del file',
            ], 500);
        }

        $attachment = CrmProjectTaskAttachment::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'file_path' => $stored['path'],
            'file_name' => $stored['name'],
            'file_size' => $stored['size'],
            'mime_type' => $stored['mime'],
        ]);

        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => 'aggiunta_allegato',
            'description' => "Allegato caricato: {$stored['name']}",
            'created_at' => now(),
        ]);

        $attachment->load('user:id,name,email,avatar');

        return response()->json([
            'success' => true,
            'message' => 'File caricato con successo',
            'data' => $this->formatAttachmentWithUrl($attachment),
        ], 201);
    }

    /**
     * DELETE /api/crm-projects/{id}/tasks/{taskId}/attachments/{attachmentId}
     */
    public function destroyAttachment($id, $taskId, $attachmentId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        $attachment = CrmProjectTaskAttachment::where('crm_project_task_id', $task->id)
            ->findOrFail($attachmentId);

        $canDelete = $user->role === 'admin'
            || (int) $project->manager_id === (int) $user->id
            || (int) $attachment->user_id === (int) $user->id;

        if (!$canDelete) {
            return response()->json([
                'success' => false,
                'message' => 'Non puoi eliminare questo allegato',
            ], 403);
        }

        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $fileName = $attachment->file_name;
        $attachment->delete();

        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => 'rimozione_allegato',
            'description' => "Allegato rimosso: {$fileName}",
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Allegato eliminato',
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/take-charge
     */
    public function takeCharge($id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->with('assignments')
            ->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        if (in_array($task->status, ['completed', 'cancelled', 'review'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Questa task non può essere presa in carico nel suo stato attuale',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $isAssigned = $task->assignments()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->exists();

            if (!$isAssigned) {
                $existing = CrmProjectTaskAssignment::where('crm_project_task_id', $task->id)
                    ->where('user_id', $user->id)
                    ->first();

                if ($existing) {
                    $existing->update([
                        'is_active' => true,
                        'start_date' => now(),
                        'end_date' => null,
                        'assigned_by' => $user->id,
                    ]);
                } else {
                    CrmProjectTaskAssignment::create([
                        'crm_project_task_id' => $task->id,
                        'user_id' => $user->id,
                        'assigned_by' => $user->id,
                        'payment_method' => 'hourly',
                        'is_active' => true,
                        'start_date' => now(),
                    ]);
                }
            }

            $oldStatus = $task->status;
            if ($task->status === 'pending') {
                $task->update(['status' => 'in_progress']);
            }

            CrmProjectTaskEvent::create([
                'crm_project_task_id' => $task->id,
                'user_id' => $user->id,
                'event_type' => 'presa_in_carico',
                'event_data' => [
                    'old_status' => $oldStatus,
                    'new_status' => $task->status,
                ],
                'description' => "{$user->name} ha preso in carico la task",
                'created_at' => now(),
            ]);

            DB::commit();

            $task->load(['assignments.user:id,name,email,avatar', 'creator:id,name,email']);

            return response()->json([
                'success' => true,
                'message' => 'Task presa in carico',
                'data' => $task,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la presa in carico: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/deliver
     */
    public function deliver(Request $request, $id, $taskId)
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        if (!in_array($task->status, ['in_progress', 'pending'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'La task non è in uno stato consegnabile',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'satisfaction' => 'nullable|integer|min:1|max:5',
            'feedback' => 'nullable|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $oldStatus = $task->status;
        $task->update(['status' => 'review']);

        if ($request->filled('feedback') || $request->filled('satisfaction')) {
            $feedbackParts = [];
            if ($request->filled('satisfaction')) {
                $feedbackParts[] = 'Valutazione: ' . $request->satisfaction . '/5';
            }
            if ($request->filled('feedback')) {
                $feedbackParts[] = $request->feedback;
            }

            CrmProjectTaskComment::create([
                'crm_project_task_id' => $task->id,
                'user_id' => $user->id,
                'comment' => '[Consegna] ' . implode("\n", $feedbackParts),
                'is_note' => true,
            ]);
        }

        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => 'termine_incarico',
            'event_data' => [
                'old_status' => $oldStatus,
                'new_status' => 'review',
            ],
            'description' => "{$user->name} ha consegnato la task per revisione",
            'created_at' => now(),
        ]);

        $task->load(['assignments.user:id,name,email,avatar', 'creator:id,name,email']);

        return response()->json([
            'success' => true,
            'message' => 'Task consegnata per revisione',
            'data' => $task,
        ]);
    }

    private function recordStatusChangeEvent(CrmProjectTask $task, $user, string $oldStatus, string $newStatus): void
    {
        $eventType = match ($newStatus) {
            'in_progress' => $oldStatus === 'pending' ? 'presa_in_carico' : 'aggiornamento_stato',
            'review' => 'termine_incarico',
            'completed' => 'completamento',
            'cancelled' => 'annullamento',
            default => 'aggiornamento_stato',
        };

        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => $eventType,
            'event_data' => [
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ],
            'description' => "Stato aggiornato da {$oldStatus} a {$newStatus}",
            'created_at' => now(),
        ]);
    }

    /**
     * @return array{path: string, name: string, size: int, mime: string}|null
     */
    private function storeTaskFile($file, string $directory): ?array
    {
        if (!Storage::disk('public')->exists($directory)) {
            Storage::disk('public')->makeDirectory($directory, 0755, true);
        }

        $path = $file->store($directory, 'public');

        if (!Storage::disk('public')->exists($path)) {
            Log::error('Task file not saved', ['path' => $path]);
            return null;
        }

        return [
            'path' => $path,
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime' => $file->getMimeType(),
        ];
    }

    private function buildPublicStorageUrl(string $path): string
    {
        $baseUrl = rtrim(config('app.url'), '/');
        return $baseUrl . '/backend/storage/' . $path;
    }

    private function formatAttachmentWithUrl(CrmProjectTaskAttachment $attachment): CrmProjectTaskAttachment
    {
        if (Storage::disk('public')->exists($attachment->file_path)) {
            $attachment->file_url = $this->buildPublicStorageUrl($attachment->file_path);
        }
        return $attachment;
    }

    private function formatCommentWithUrls(CrmProjectTaskComment $comment): CrmProjectTaskComment
    {
        if ($comment->relationLoaded('attachments')) {
            $comment->attachments = $comment->attachments->map(function ($attachment) {
                if (Storage::disk('public')->exists($attachment->file_path)) {
                    $attachment->file_url = $this->buildPublicStorageUrl($attachment->file_path);
                }
                return $attachment;
            });
        }
        return $comment;
    }
}