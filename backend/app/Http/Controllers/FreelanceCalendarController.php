<?php

namespace App\Http\Controllers;

use App\Notifications\CalendarReminder;
use App\Services\FreelanceCallService;
use App\Support\CalendarDateTime;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class FreelanceCalendarController extends Controller
{
    public function __construct(
        private FreelanceCallService $callService
    ) {}

    private function enrichCallEvent(object $event): object
    {
        if ($event->type === 'call') {
            $event->participants = $this->callService->getParticipants((int) $event->id);
            $event->call_link = $event->google_meet_link ?: $event->call_link;
        }

        return $this->formatEventTimesForApi($event);
    }

    private function formatEventTimesForApi(object $event): object
    {
        if (isset($event->start_time)) {
            $event->start_time = CalendarDateTime::toApi($event->start_time);
        }
        if (isset($event->end_time)) {
            $event->end_time = CalendarDateTime::toApi($event->end_time);
        }
        if (isset($event->completed_at) && $event->completed_at) {
            $event->completed_at = CalendarDateTime::toApi($event->completed_at);
        }

        return $event;
    }

    /**
     * GET /api/freelance/calendar/items/{itemId}
     */
    public function getItem($itemId)
    {
        $userId = Auth::id();

        $event = DB::table('freelance_calendar_events')
            ->where('id', $itemId)
            ->where('user_id', $userId)
            ->where('created_by', $userId)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Item non trovato',
            ], 404);
        }

        $event->is_personal = true;

        return response()->json([
            'success' => true,
            'data' => $this->enrichCallEvent($event),
        ]);
    }

    /**
     * GET /api/freelance/calendar/items
     * Ottiene tutti gli items del calendario per il freelance corrente
     */
    public function getItems(Request $request)
    {
        try {
            $userId = Auth::id();
            
            // 1. Carica eventi personali del freelance (creati da lui)
            $personalEvents = DB::table('freelance_calendar_events')
                ->where('user_id', $userId)
                ->where('created_by', $userId)
                ->whereNull('deleted_at')
                ->orderBy('start_time', 'asc')
                ->get()
                ->map(function ($event) {
                    // Decodifica checklist_items se presente
                    if (isset($event->checklist_items) && $event->checklist_items) {
                        try {
                            $event->checklist_items = is_string($event->checklist_items) 
                                ? json_decode($event->checklist_items, true) 
                                : $event->checklist_items;
                        } catch (\Exception $e) {
                            $event->checklist_items = null;
                        }
                    }
                    // Aggiungi flag per identificare eventi personali
                    $event->is_personal = true;
                    $event->project_id = null;
                    $event->project_name = null;
                    $event->project_color = null;
                    if ($event->type === 'call') {
                        return $this->enrichCallEvent($event);
                    }
                    return $this->formatEventTimesForApi($event);
                });

            // 2. Carica progetti del freelance (team member O project manager, così eventi/task del progetto sono visibili anche al PM)
            $teamProjectIds = DB::table('crm_project_team_members')
                ->where('user_id', $userId)
                ->where('is_active', true)
                ->pluck('crm_project_id');
            $managerProjectIds = DB::table('crm_projects')
                ->where('manager_id', $userId)
                ->pluck('id');
            $projectIds = $teamProjectIds->merge($managerProjectIds)->unique()->values()->toArray();

            $projects = DB::table('crm_projects')
                ->whereIn('crm_projects.id', $projectIds)
                ->leftJoin('crm_departments', 'crm_projects.crm_department_id', '=', 'crm_departments.id')
                ->select(
                    'crm_projects.id as project_id',
                    'crm_projects.name as project_name',
                    'crm_departments.color as project_color'
                )
                ->get()
                ->keyBy('project_id');

            // 3. Carica task assegnate al freelance dai progetti
            $tasks = [];
            if (!empty($projectIds)) {
                $taskAssignments = DB::table('crm_project_task_assignments')
                    ->where('user_id', $userId)
                    ->where('is_active', true)
                    ->pluck('crm_project_task_id')
                    ->toArray();

                if (!empty($taskAssignments)) {
                    $tasks = DB::table('crm_project_tasks')
                        ->whereIn('crm_project_tasks.id', $taskAssignments)
                        ->whereIn('crm_project_tasks.crm_project_id', $projectIds)
                        ->whereNotIn('crm_project_tasks.status', ['completed', 'cancelled'])
                        ->select(
                            'crm_project_tasks.*',
                            'crm_project_tasks.crm_project_id as project_id'
                        )
                        ->get()
                        ->map(function ($task) use ($projects) {
                            $project = $projects->get($task->project_id);
                            
                            // Converti le date nel formato corretto
                            $startDate = $task->start_date ?: $task->due_date;
                            $endDate = $task->due_date ?: $task->start_date;
                            
                            // Se non ci sono date, usa oggi come default
                            if (!$startDate && !$endDate) {
                                $startDate = date('Y-m-d') . ' 09:00:00';
                                $endDate = date('Y-m-d') . ' 10:00:00';
                            } elseif (!$startDate) {
                                $startDate = $endDate;
                            } elseif (!$endDate) {
                                $endDate = $startDate;
                            }
                            
                            // Assicurati che le date siano nel formato datetime completo
                            if (strlen($startDate) === 10) {
                                $startDate .= ' 09:00:00';
                            }
                            if (strlen($endDate) === 10) {
                                $endDate .= ' 10:00:00';
                            }
                            
                            $task->type = 'task';
                            $task->start_time = $startDate;
                            $task->end_time = $endDate;
                            $task->is_personal = false;
                            $task->project_name = $project ? $project->project_name : null;
                            $task->project_color = $project ? $project->project_color : null;
                            // Aggiungi campi necessari per il formato API
                            $task->title = $task->title ?? 'Task senza titolo';
                            $task->description = $task->description ?? null;
                            $task->created_by = $task->created_by ?? null;
                            return $task;
                        });
                }
            }

            // 4. Carica eventi/call/scadenze dai progetti (con visibilità appropriata)
            $projectEvents = [];
            if (!empty($projectIds)) {
                $allProjectEvents = DB::table('project_calendar_events')
                    ->whereIn('project_id', $projectIds)
                    ->whereNull('deleted_at')
                    ->orderBy('start_time', 'asc')
                    ->get();

                // Carica visibilità per eventi specifici
                $eventIds = $allProjectEvents->pluck('id')->toArray();
                $visibility = [];
                if (!empty($eventIds)) {
                    $visibility = DB::table('project_calendar_event_visibility')
                        ->whereIn('event_id', $eventIds)
                        ->get()
                        ->groupBy('event_id')
                        ->map(function ($group) {
                            return $group->pluck('user_id')->toArray();
                        })
                        ->toArray();
                }

                // Filtra eventi in base alla visibilità
                $projectEvents = $allProjectEvents->filter(function ($event) use ($userId, $visibility) {
                    if ($event->visibility === 'all') {
                        return true;
                    }
                    if ($event->visibility === 'freelance') {
                        return true; // I freelance vedono eventi con visibilità freelance
                    }
                    if ($event->visibility === 'specific') {
                        $visibleTo = $visibility[$event->id] ?? [];
                        return in_array($userId, $visibleTo);
                    }
                    return false;
                })->map(function ($event) use ($projects, $visibility) {
                    // Decodifica checklist_items se presente
                    if (isset($event->checklist_items) && $event->checklist_items) {
                        try {
                            $event->checklist_items = is_string($event->checklist_items) 
                                ? json_decode($event->checklist_items, true) 
                                : $event->checklist_items;
                        } catch (\Exception $e) {
                            $event->checklist_items = null;
                        }
                    }
                    $project = $projects->get($event->project_id);
                    $event->is_personal = false;
                    $event->project_id = $event->project_id;
                    $event->project_name = $project ? $project->project_name : null;
                    $event->project_color = $project ? $project->project_color : null;
                    if ($event->visibility === 'specific') {
                        $event->visible_to = $visibility[$event->id] ?? [];
                    } else {
                        $event->visible_to = [];
                    }
                    return $this->formatEventTimesForApi($event);
                });
            }

            // Formatta date task progetto per API
            $tasks = collect($tasks)->map(function ($task) {
                if (isset($task->start_time)) {
                    $task->start_time = CalendarDateTime::toApi($task->start_time);
                }
                if (isset($task->end_time)) {
                    $task->end_time = CalendarDateTime::toApi($task->end_time);
                }
                return $task;
            })->all();
            $allEvents = $personalEvents->concat($projectEvents)->values();

            // Log per debug (rimuovere in produzione)
            Log::info('Freelance Calendar Items', [
                'user_id' => $userId,
                'personal_events_count' => $personalEvents->count(),
                'project_events_count' => $projectEvents->count(),
                'tasks_count' => count($tasks),
                'projects_count' => $projects->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'events' => $allEvents,
                    'tasks' => $tasks,
                    'projects' => $projects->values()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error loading freelance calendar items: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Errore nel caricamento degli eventi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/freelance/calendar/items
     * Crea un nuovo item nel calendario (evento, call, scadenza, promemoria, task)
     */
    public function createItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:event,call,deadline,reminder,task',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'location' => 'nullable|string|max:255',
            'call_link' => 'nullable|string|max:500',
            'call_notes' => 'nullable|string',
            'deadline_type' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:7',
            'checklist_items' => 'nullable|array',
            'has_checklist' => 'nullable|boolean',
            'participants' => 'nullable|array',
            'participants.*.email' => 'required_with:participants|email|max:255',
            'participants.*.name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $userId = Auth::id();
            
            // Salva in UTC (il frontend invia ISO8601 UTC)
            $startTime = CalendarDateTime::toStorage($request->start_time);
            $endTime = CalendarDateTime::toStorage($request->end_time);
            
            $eventData = [
                'user_id' => $userId,
                'type' => $request->type,
                'title' => $request->title,
                'description' => $request->description,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'location' => $request->location,
                'call_link' => $request->call_link,
                'call_notes' => $request->call_notes,
                'deadline_type' => $request->deadline_type,
                'color' => $request->color,
                'created_by' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            
            // Aggiungi checklist_items se presente (solo per eventi)
            if ($request->type === 'event' && $request->has('checklist_items') && $request->has_checklist) {
                $eventData['checklist_items'] = json_encode($request->checklist_items);
                $eventData['has_checklist'] = true;
            } else {
                $eventData['has_checklist'] = false;
            }
            
            $eventId = DB::table('freelance_calendar_events')->insertGetId($eventData);
            
            // Carica l'evento appena creato per la notifica
            $event = (object) array_merge($eventData, ['id' => $eventId]);
            
            // Se è un reminder, invia notifica immediata
            if ($request->type === 'reminder') {
                $user = Auth::user();
                $user->notify(new CalendarReminder($event));
            }

            // Se è una call, crea le notifiche
            if ($request->type === 'call') {
                // Notifica 10 minuti prima
                DB::table('freelance_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'email',
                    'minutes_before' => 10,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('freelance_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'email',
                    'minutes_before' => 5,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('freelance_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'in_app',
                    'minutes_before' => 10,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('freelance_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'in_app',
                    'minutes_before' => 5,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if ($request->has('participants')) {
                    $this->callService->saveParticipants($eventId, $request->participants ?? []);
                }
            }

            DB::commit();

            if ($request->type === 'call') {
                $this->callService->afterCallCreated($eventId, $userId);
            }

            $event = DB::table('freelance_calendar_events')->where('id', $eventId)->first();
            if ($event) {
                $event = $event->type === 'call'
                    ? $this->enrichCallEvent($event)
                    : $this->formatEventTimesForApi($event);
            }

            return response()->json([
                'success' => true,
                'data' => $event,
                'message' => 'Item creato con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating freelance calendar item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione dell\'item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/freelance/calendar/items/{itemId}
     * Aggiorna un item del calendario
     */
    public function updateItem(Request $request, $itemId)
    {
        $userId = Auth::id();
        
        $event = DB::table('freelance_calendar_events')
            ->where('id', $itemId)
            ->where('user_id', $userId)
            ->where('created_by', $userId)
            ->first();

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Item non trovato'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'location' => 'nullable|string|max:255',
            'call_link' => 'nullable|string|max:500',
            'call_notes' => 'nullable|string',
            'deadline_type' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:7',
            'checklist_items' => 'nullable|array',
            'has_checklist' => 'nullable|boolean',
            'participants' => 'nullable|array',
            'participants.*.email' => 'required_with:participants|email|max:255',
            'participants.*.name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $updateData = [];
            $allowedFields = ['title', 'description', 'start_time', 'end_time', 'location', 
                            'call_link', 'call_notes', 'deadline_type', 'color',
                            'completed_at', 'completed_by'];
            
            foreach ($allowedFields as $field) {
                if ($request->has($field)) {
                    $value = $request->$field;
                    
                    if (($field === 'start_time' || $field === 'end_time' || $field === 'completed_at') && $value) {
                        $value = CalendarDateTime::toStorage($value);
                    }
                    
                    $updateData[$field] = $value;
                }
            }
            
            // Aggiungi checklist_items se presente (solo per eventi)
            if ($request->has('checklist_items') && $request->has('has_checklist')) {
                if ($request->has_checklist && $request->checklist_items) {
                    $updateData['checklist_items'] = json_encode($request->checklist_items);
                    $updateData['has_checklist'] = true;
                } else {
                    $updateData['checklist_items'] = null;
                    $updateData['has_checklist'] = false;
                }
            }
            
            $updateData['updated_at'] = now();

            DB::table('freelance_calendar_events')
                ->where('id', $itemId)
                ->update($updateData);

            if ($event->type === 'call' && $request->has('participants')) {
                $this->callService->saveParticipants((int) $itemId, $request->participants ?? []);
                $this->callService->afterCallUpdated((int) $itemId, $userId);
            } elseif ($event->type === 'call') {
                $this->callService->afterCallUpdated((int) $itemId, $userId);
            }

            DB::commit();

            $updatedEvent = DB::table('freelance_calendar_events')->where('id', $itemId)->first();
            if ($updatedEvent) {
                $updatedEvent = $updatedEvent->type === 'call'
                    ? $this->enrichCallEvent($updatedEvent)
                    : $this->formatEventTimesForApi($updatedEvent);
            }

            return response()->json([
                'success' => true,
                'data' => $updatedEvent,
                'message' => 'Item aggiornato con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating freelance calendar item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'aggiornamento dell\'item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/freelance/calendar/items/{itemId}
     * Elimina un item del calendario (soft delete)
     */
    public function deleteItem($itemId)
    {
        $userId = Auth::id();
        
        $event = DB::table('freelance_calendar_events')
            ->where('id', $itemId)
            ->where('user_id', $userId)
            ->where('created_by', $userId)
            ->first();

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Item non trovato'
            ], 404);
        }

        if ($event->type === 'call' && !empty($event->google_event_id)) {
            $this->callService->afterCallDeleted($userId, $event->google_event_id);
        }

        DB::table('freelance_calendar_events')
            ->where('id', $itemId)
            ->update(['deleted_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Item eliminato con successo'
        ]);
    }

    /**
     * PUT /api/freelance/calendar/items/{itemId}/drag
     * Aggiorna posizione di un item dopo drag & drop
     */
    public function dragItem(Request $request, $itemId)
    {
        $userId = Auth::id();
        
        $event = DB::table('freelance_calendar_events')
            ->where('id', $itemId)
            ->where('user_id', $userId)
            ->where('created_by', $userId)
            ->first();

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Item non trovato'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $startTime = CalendarDateTime::toStorage($request->start_time);
        $endTime = CalendarDateTime::toStorage($request->end_time);
        
        DB::table('freelance_calendar_events')
            ->where('id', $itemId)
            ->update([
                'start_time' => $startTime,
                'end_time' => $endTime,
                'updated_at' => now(),
            ]);

        if ($event->type === 'call') {
            $this->callService->afterCallUpdated((int) $itemId, $userId);
        }

        $updatedEvent = DB::table('freelance_calendar_events')->where('id', $itemId)->first();
        if ($updatedEvent) {
            $updatedEvent = $updatedEvent->type === 'call'
                ? $this->enrichCallEvent($updatedEvent)
                : $this->formatEventTimesForApi($updatedEvent);
        }

        return response()->json([
            'success' => true,
            'data' => $updatedEvent,
            'message' => 'Posizione aggiornata con successo'
        ]);
    }

    /**
     * POST /api/freelance/calendar/items/{itemId}/complete
     * Completa un item del calendario
     */
    public function completeItem($itemId)
    {
        $userId = Auth::id();
        
        $event = DB::table('freelance_calendar_events')
            ->where('id', $itemId)
            ->where('user_id', $userId)
            ->where('created_by', $userId)
            ->first();

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Item non trovato'
            ], 404);
        }

        DB::table('freelance_calendar_events')
            ->where('id', $itemId)
            ->update([
                'completed_at' => now(),
                'completed_by' => $userId,
                'updated_at' => now(),
            ]);

        $updatedEvent = DB::table('freelance_calendar_events')->where('id', $itemId)->first();

        return response()->json([
            'success' => true,
            'data' => $updatedEvent,
            'message' => 'Item completato con successo'
        ]);
    }
}
