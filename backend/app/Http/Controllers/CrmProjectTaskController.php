<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\CrmProjectTaskAssignment;
use App\Models\CrmProjectTaskRescheduleRequest;
use App\Models\CrmProjectTaskDeletionRequest;
use App\Models\CrmProjectTaskComment;
use App\Models\CrmProjectTaskEvent;
use App\Models\CrmDepartment;
use App\Models\User;
use App\Notifications\TaskRequestReviewed;
use App\Notifications\TaskAssigned;
use App\Notifications\TaskReassigned;
use App\Mail\TaskRescheduleRequestReviewed;
use App\Mail\TaskDeletionRequestReviewed;
use App\Jobs\DispatchN8nTaskWorkflowJob;
use App\Models\CrmProjectTaskN8nStep;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

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

        if (!$this->userCanCreateTask($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per creare task su questo progetto',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'execution_mode' => 'required|in:agent,agent_human,human',
            'status' => 'nullable|in:pending,in_progress,review,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'budget_cocchi' => 'nullable|numeric|min:0',
            'crm_label_id' => 'nullable|exists:crm_departments,id',
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

        $executionMode = $request->input('execution_mode', CrmProjectTask::EXECUTION_HUMAN);
        $assignmentsInput = $request->input('assignments', []);

        if (in_array($executionMode, [CrmProjectTask::EXECUTION_HUMAN, CrmProjectTask::EXECUTION_AGENT_HUMAN], true)
            && count($assignmentsInput) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Per le modalità con completamento umano è richiesta almeno un\'assegnazione',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $taskData = $validator->validated();
            $taskData['crm_project_id'] = $project->id;
            $taskData['created_by'] = $user->id;
            $taskData['execution_mode'] = $executionMode;
            $taskData['priority'] = $taskData['priority'] ?? 'medium';

            if ($executionMode === CrmProjectTask::EXECUTION_AGENT) {
                $taskData['status'] = 'pending';
                $taskData['n8n_status'] = CrmProjectTask::N8N_PENDING;
            } elseif ($executionMode === CrmProjectTask::EXECUTION_AGENT_HUMAN) {
                $taskData['status'] = $taskData['status'] ?? 'pending';
                $taskData['n8n_status'] = CrmProjectTask::N8N_PENDING;
            } else {
                $taskData['status'] = $taskData['status'] ?? 'pending';
                $taskData['n8n_status'] = CrmProjectTask::N8N_SKIPPED;
            }

            // Rimuovi assignments dai dati del task
            $assignments = $taskData['assignments'] ?? [];
            unset($taskData['assignments']);

            $task = CrmProjectTask::create($taskData);

            // Crea le assegnazioni
            $totalBudget = 0;
            foreach ($assignments as $assignmentData) {
                $assignment = new CrmProjectTaskAssignment($assignmentData);
                $assignment->crm_project_task_id = $task->id;
                $assignment->assigned_by = $user->id;
                
                // Calcola il costo totale
                $assignment->total_cost_cocchi = $this->calculateAssignmentCost($assignment);
                $totalBudget += $assignment->total_cost_cocchi;
                
                $assignment->save();
                
                // Notifica in-app (solo database) + email via PHPMailer (stessa config venditori)
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
                        // Non bloccare la creazione del task
                    }
                }
            }

            // Aggiorna il budget totale del task se non specificato
            if (!$task->budget_cocchi && $totalBudget > 0) {
                $task->budget_cocchi = $totalBudget;
                $task->save();
            }

            DB::commit();

            if ($task->usesN8nAutomation()) {
                DispatchN8nTaskWorkflowJob::dispatchAfterResponse(
                    $task->id,
                    $project->id,
                    $user->id
                );
            }

            $task->load([
                'creator',
                'assignments.user',
                'project',
                'events.user',
                'comments.user',
                'crmLabel:id,code,name,color,icon',
                'n8nSteps',
            ]);

            $message = 'Task creato con successo';
            if ($task->usesN8nAutomation()) {
                $message = 'Task creato. L\'agente N8N sta elaborando in background — segui gli aggiornamenti nella chat della task.';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $task,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
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
                'subtasks',
                'parentTask',
                'crmLabel:id,code,name,color,icon',
                'project:id,name,crm_department_id',
                'project.crmDepartment:id,code,name,color,icon',
                'n8nSteps',
            ])
            ->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai accesso a questo task',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $task,
        ]);
    }

    /**
     * Verifica se l'utente può accedere al task: admin, PM, assegnatario attivo o team member del progetto.
     */
    /**
     * Admin o project manager possono creare task sul progetto.
     */
    private function userCanCreateTask($user, CrmProject $project): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return (int) $project->manager_id === (int) $user->id;
    }

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
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'completed_date' => 'nullable|date',
            'progress' => 'sometimes|integer|min:0|max:100',
            'estimated_hours' => 'nullable|numeric|min:0',
            'actual_hours' => 'nullable|numeric|min:0',
            'budget_cocchi' => 'nullable|numeric|min:0',
            'crm_label_id' => 'nullable|exists:crm_departments,id',
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

        $task->update($validator->validated());
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
        $user = Auth::user();
        $task = CrmProjectTask::where('crm_project_id', $project->id)
            ->findOrFail($taskId);

        if (!$this->userCanCreateTask($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per eliminare task su questo progetto',
            ], 403);
        }

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
     * GET /api/crm-projects/{id}/tasks/{taskId}/n8n-steps
     * Timeline chat step agente N8N (polling frontend).
     */
    public function getN8nSteps($id, $taskId)
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

        $steps = CrmProjectTaskN8nStep::where('crm_project_task_id', $task->id)
            ->orderBy('step_index')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'task' => [
                    'id' => $task->id,
                    'execution_mode' => $task->execution_mode,
                    'n8n_status' => $task->n8n_status,
                    'status' => $task->status,
                    'progress' => $task->progress,
                    'n8n_error' => $task->n8n_error,
                    'n8n_response' => $task->n8n_response,
                    'n8n_completed_at' => $task->n8n_completed_at,
                ],
                'steps' => $steps,
            ],
        ]);
    }

    /**
     * Calcola il costo di un'assegnazione in base al metodo di pagamento
     */
    private function calculateAssignmentCost(CrmProjectTaskAssignment $assignment): float
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
                return 0; // Nessun cocco per pagamento fisso
            case 'no_payment':
                return 0; // Nessun pagamento
        }
        return 0;
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
            'comment' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $comment = CrmProjectTaskComment::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'comment' => $request->comment,
            'is_note' => true,
        ]);

        // Crea evento per la nota aggiunta
        CrmProjectTaskEvent::create([
            'crm_project_task_id' => $task->id,
            'user_id' => $user->id,
            'event_type' => 'aggiunta_note',
            'description' => 'Nota aggiunta alla task',
            'created_at' => now(),
        ]);

        $comment->load('user:id,name,email,avatar');

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
            ->with('user:id,name,email,avatar')
            ->orderBy('created_at', 'desc')
            ->get();

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
}