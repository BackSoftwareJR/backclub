<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ProjectCalendarController extends Controller
{
    /**              
     * GET /api/crm-projects/{id}/calendar/items
     * Ottiene tutti gli items del calendario per un progetto
     */
    public function getItems($projectId)
    {
        try {
            $project = CrmProject::findOrFail($projectId);
            
            // Carica eventi, call, scadenze, promemoria
            $events = DB::table('project_calendar_events')
                ->where('project_id', $projectId)
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
                    return $event;
                });

            // Carica visibilità per eventi specifici
            $eventIds = $events->pluck('id')->toArray();
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
            $userId = Auth::id();
            $filteredEvents = $events->filter(function ($event) use ($userId, $visibility) {
                if ($event->visibility === 'all') {
                    return true;
                }
                if ($event->visibility === 'freelance') {
                    // TODO: Verificare se l'utente è freelance
                    return true; // Per ora mostra a tutti
                }
                if ($event->visibility === 'specific') {
                    $visibleTo = $visibility[$event->id] ?? [];
                    return in_array($userId, $visibleTo);
                }
                return false;
            });

            // Aggiungi visible_to a ogni evento
            $eventsWithVisibility = $filteredEvents->map(function ($event) use ($visibility) {
                $eventArray = (array) $event;
                if ($event->visibility === 'specific') {
                    $eventArray['visible_to'] = $visibility[$event->id] ?? [];
                } else {
                    $eventArray['visible_to'] = [];
                }
                return $eventArray;
            });

            // Carica anche i task del progetto con assegnazioni
            $tasks = DB::table('crm_project_tasks')
                ->where('crm_project_id', $projectId)
                ->where(function($query) {
                    $query->whereNotNull('start_date')
                          ->orWhereNotNull('due_date');
                })
                ->get()
                ->map(function ($task) {
                    // Carica le assegnazioni per ogni task
                    $assignments = DB::table('crm_project_task_assignments')
                        ->where('crm_project_task_id', $task->id)
                        ->where('is_active', true)
                        ->get()
                        ->map(function ($assignment) {
                            // Carica informazioni utente
                            $user = DB::table('users')
                                ->where('id', $assignment->user_id)
                                ->first(['id', 'name', 'email', 'avatar']);
                            
                            return [
                                'id' => $assignment->id,
                                'user_id' => $assignment->user_id,
                                'payment_method' => $assignment->payment_method,
                                'hourly_rate_cocchi' => $assignment->hourly_rate_cocchi,
                                'hours_requested' => $assignment->hours_requested,
                                'task_rate_cocchi' => $assignment->task_rate_cocchi,
                                'project_rate_cocchi' => $assignment->project_rate_cocchi,
                                'total_cost_cocchi' => $assignment->total_cost_cocchi,
                                'is_active' => $assignment->is_active,
                                'assigned_by' => $assignment->assigned_by,
                                'assigned_at' => $assignment->assigned_at,
                                'user' => $user ? [
                                    'id' => $user->id,
                                    'name' => $user->name,
                                    'email' => $user->email,
                                    'avatar' => $user->avatar,
                                ] : null,
                            ];
                        });
                    
                    $taskArray = (array) $task;
                    $taskArray['assignments'] = $assignments->values();
                    return $taskArray;
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'events' => $eventsWithVisibility->values(),
                    'tasks' => $tasks,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error loading calendar items: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Errore nel caricamento degli eventi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/crm-projects/{id}/calendar/items
     * Crea un nuovo item nel calendario (evento, call, scadenza, promemoria)
     */
    public function createItem(Request $request, $projectId)
    {
        $project = CrmProject::findOrFail($projectId);

        $validator = Validator::make($request->all(), [
            'type' => 'required|in:event,call,deadline,reminder',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'location' => 'nullable|string|max:255',
            'call_link' => 'nullable|string|max:500',
            'call_notes' => 'nullable|string',
            'deadline_type' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:7',
            'visibility' => 'required|in:all,freelance,specific',
            'visible_to' => 'nullable|array',
            'visible_to.*' => 'exists:users,id',
            'checklist_items' => 'nullable|array',
            'has_checklist' => 'nullable|boolean',
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
            
            // Converti le date dal formato ISO 8601 (2026-01-15T14:50:00.000Z) al formato MySQL (2026-01-15 14:50:00)
            $startTime = $request->start_time;
            $endTime = $request->end_time;
            
            // Se le date sono in formato ISO, convertile
            if (strpos($startTime, 'T') !== false) {
                $startTime = date('Y-m-d H:i:s', strtotime($startTime));
            }
            if (strpos($endTime, 'T') !== false) {
                $endTime = date('Y-m-d H:i:s', strtotime($endTime));
            }
            
            $eventData = [
                'project_id' => $projectId,
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
                'visibility' => $request->visibility,
                'user_id' => $userId,
                'created_by' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            
            // Aggiungi checklist_items se presente (solo per eventi)
            if ($request->type === 'event' && $request->has('checklist_items') && $request->has_checklist) {
                $eventData['checklist_items'] = json_encode($request->checklist_items);
            }
            
            $eventId = DB::table('project_calendar_events')->insertGetId($eventData);

            // Se visibility è 'specific', salva gli utenti
            if ($request->visibility === 'specific' && $request->has('visible_to')) {
                foreach ($request->visible_to as $userId) {
                    DB::table('project_calendar_event_visibility')->insert([
                        'event_id' => $eventId,
                        'user_id' => $userId,
                        'created_at' => now(),
                    ]);
                }
            }

            // Se è una call, crea le notifiche
            if ($request->type === 'call') {
                // Notifica 10 minuti prima
                DB::table('project_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'email',
                    'minutes_before' => 10,
                    'created_at' => now(),
                ]);
                DB::table('project_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'email',
                    'minutes_before' => 5,
                    'created_at' => now(),
                ]);
                DB::table('project_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'in_app',
                    'minutes_before' => 10,
                    'created_at' => now(),
                ]);
                DB::table('project_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'in_app',
                    'minutes_before' => 5,
                    'created_at' => now(),
                ]);
            }

            DB::commit();

            $event = DB::table('project_calendar_events')->where('id', $eventId)->first();

            return response()->json([
                'success' => true,
                'data' => $event,
                'message' => 'Item creato con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating calendar item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione dell\'item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/crm-projects/{id}/calendar/items/{itemId}
     * Aggiorna un item del calendario
     */
    public function updateItem(Request $request, $projectId, $itemId)
    {
        $project = CrmProject::findOrFail($projectId);
        
        $event = DB::table('project_calendar_events')
            ->where('id', $itemId)
            ->where('project_id', $projectId)
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
            'visibility' => 'sometimes|in:all,freelance,specific',
            'visible_to' => 'nullable|array',
            'visible_to.*' => 'exists:users,id',
            'checklist_items' => 'nullable|array',
            'has_checklist' => 'nullable|boolean',
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
                            'call_link', 'call_notes', 'deadline_type', 'color', 'visibility',
                            'completed_at', 'completed_by'];
            
            foreach ($allowedFields as $field) {
                if ($request->has($field)) {
                    $value = $request->$field;
                    
                    // Converti le date dal formato ISO 8601 al formato MySQL
                    if (($field === 'start_time' || $field === 'end_time' || $field === 'completed_at') && strpos($value, 'T') !== false) {
                        $value = date('Y-m-d H:i:s', strtotime($value));
                    }
                    
                    $updateData[$field] = $value;
                }
            }
            
            // Aggiungi checklist_items se presente (solo per eventi)
            if ($request->has('checklist_items') && $request->has('has_checklist')) {
                if ($request->has_checklist && $request->checklist_items) {
                    $updateData['checklist_items'] = json_encode($request->checklist_items);
                } else {
                    $updateData['checklist_items'] = null;
                }
            }
            
            $updateData['updated_at'] = now();

            DB::table('project_calendar_events')
                ->where('id', $itemId)
                ->update($updateData);

            // Aggiorna visibilità se specificata
            if ($request->has('visibility')) {
                DB::table('project_calendar_event_visibility')
                    ->where('event_id', $itemId)
                    ->delete();

                if ($request->visibility === 'specific' && $request->has('visible_to')) {
                    foreach ($request->visible_to as $userId) {
                        DB::table('project_calendar_event_visibility')->insert([
                            'event_id' => $itemId,
                            'user_id' => $userId,
                            'created_at' => now(),
                        ]);
                    }
                }
            }

            DB::commit();

            $updatedEvent = DB::table('project_calendar_events')->where('id', $itemId)->first();

            return response()->json([
                'success' => true,
                'data' => $updatedEvent,
                'message' => 'Item aggiornato con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating calendar item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'aggiornamento dell\'item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/crm-projects/{id}/calendar/items/{itemId}
     * Elimina un item del calendario (soft delete)
     */
    public function deleteItem($projectId, $itemId)
    {
        $project = CrmProject::findOrFail($projectId);
        
        $event = DB::table('project_calendar_events')
            ->where('id', $itemId)
            ->where('project_id', $projectId)
            ->first();

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Item non trovato'
            ], 404);
        }

        DB::table('project_calendar_events')
            ->where('id', $itemId)
            ->update(['deleted_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Item eliminato con successo'
        ]);
    }

    /**
     * PUT /api/crm-projects/{id}/calendar/items/{itemId}/drag
     * Aggiorna posizione di un item dopo drag & drop
     */
    public function dragItem(Request $request, $projectId, $itemId)
    {
        $project = CrmProject::findOrFail($projectId);
        
        $event = DB::table('project_calendar_events')
            ->where('id', $itemId)
            ->where('project_id', $projectId)
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

        // Converti le date dal formato ISO 8601 al formato MySQL
        $startTime = $request->start_time;
        $endTime = $request->end_time;
        
        if (strpos($startTime, 'T') !== false) {
            $startTime = date('Y-m-d H:i:s', strtotime($startTime));
        }
        if (strpos($endTime, 'T') !== false) {
            $endTime = date('Y-m-d H:i:s', strtotime($endTime));
        }
        
        DB::table('project_calendar_events')
            ->where('id', $itemId)
            ->update([
                'start_time' => $startTime,
                'end_time' => $endTime,
                'updated_at' => now(),
            ]);

        $updatedEvent = DB::table('project_calendar_events')->where('id', $itemId)->first();

        return response()->json([
            'success' => true,
            'data' => $updatedEvent,
            'message' => 'Posizione aggiornata con successo'
        ]);
    }
}
