<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class SellerCalendarController extends Controller
{
    /**
     * GET /api/seller/calendar/items
     * Ottiene tutti gli items del calendario per il venditore corrente
     */
    public function getItems(Request $request)
    {
        try {
            $userId = Auth::id();
            
            // Carica eventi del venditore corrente
            $events = DB::table('seller_calendar_events')
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
                    return $event;
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'events' => $events->values(),
                    'tasks' => [], // I seller non hanno task separati, solo eventi
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error loading seller calendar items: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Errore nel caricamento degli eventi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/seller/calendar/items
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
            
            // Converti le date dal formato ISO 8601 al formato MySQL
            $startTime = $request->start_time;
            $endTime = $request->end_time;
            
            if (strpos($startTime, 'T') !== false) {
                $startTime = date('Y-m-d H:i:s', strtotime($startTime));
            }
            if (strpos($endTime, 'T') !== false) {
                $endTime = date('Y-m-d H:i:s', strtotime($endTime));
            }
            
            $eventData = [
                'seller_id' => null, // Per ora null, può essere aggiunto in futuro se necessario
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
            
            $eventId = DB::table('seller_calendar_events')->insertGetId($eventData);

            // Se è una call, crea le notifiche
            if ($request->type === 'call') {
                // Notifica 10 minuti prima
                DB::table('seller_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'email',
                    'minutes_before' => 10,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('seller_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'email',
                    'minutes_before' => 5,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('seller_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'in_app',
                    'minutes_before' => 10,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('seller_calendar_call_notifications')->insert([
                    'call_id' => $eventId,
                    'notification_type' => 'in_app',
                    'minutes_before' => 5,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::commit();

            $event = DB::table('seller_calendar_events')->where('id', $eventId)->first();

            return response()->json([
                'success' => true,
                'data' => $event,
                'message' => 'Item creato con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating seller calendar item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione dell\'item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/seller/calendar/items/{itemId}
     * Aggiorna un item del calendario
     */
    public function updateItem(Request $request, $itemId)
    {
        $userId = Auth::id();
        
        $event = DB::table('seller_calendar_events')
            ->where('id', $itemId)
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
                    $updateData['has_checklist'] = true;
                } else {
                    $updateData['checklist_items'] = null;
                    $updateData['has_checklist'] = false;
                }
            }
            
            $updateData['updated_at'] = now();

            DB::table('seller_calendar_events')
                ->where('id', $itemId)
                ->update($updateData);

            DB::commit();

            $updatedEvent = DB::table('seller_calendar_events')->where('id', $itemId)->first();

            return response()->json([
                'success' => true,
                'data' => $updatedEvent,
                'message' => 'Item aggiornato con successo'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating seller calendar item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'aggiornamento dell\'item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/seller/calendar/items/{itemId}
     * Elimina un item del calendario (soft delete)
     */
    public function deleteItem($itemId)
    {
        $userId = Auth::id();
        
        $event = DB::table('seller_calendar_events')
            ->where('id', $itemId)
            ->where('created_by', $userId)
            ->first();

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Item non trovato'
            ], 404);
        }

        DB::table('seller_calendar_events')
            ->where('id', $itemId)
            ->update(['deleted_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Item eliminato con successo'
        ]);
    }

    /**
     * PUT /api/seller/calendar/items/{itemId}/drag
     * Aggiorna posizione di un item dopo drag & drop
     */
    public function dragItem(Request $request, $itemId)
    {
        $userId = Auth::id();
        
        $event = DB::table('seller_calendar_events')
            ->where('id', $itemId)
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

        // Converti le date dal formato ISO 8601 al formato MySQL
        $startTime = $request->start_time;
        $endTime = $request->end_time;
        
        if (strpos($startTime, 'T') !== false) {
            $startTime = date('Y-m-d H:i:s', strtotime($startTime));
        }
        if (strpos($endTime, 'T') !== false) {
            $endTime = date('Y-m-d H:i:s', strtotime($endTime));
        }
        
        DB::table('seller_calendar_events')
            ->where('id', $itemId)
            ->update([
                'start_time' => $startTime,
                'end_time' => $endTime,
                'updated_at' => now(),
            ]);

        $updatedEvent = DB::table('seller_calendar_events')->where('id', $itemId)->first();

        return response()->json([
            'success' => true,
            'data' => $updatedEvent,
            'message' => 'Posizione aggiornata con successo'
        ]);
    }

    /**
     * POST /api/seller/calendar/items/{itemId}/complete
     * Completa un item del calendario
     */
    public function completeItem($itemId)
    {
        $userId = Auth::id();
        
        $event = DB::table('seller_calendar_events')
            ->where('id', $itemId)
            ->where('created_by', $userId)
            ->first();

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Item non trovato'
            ], 404);
        }

        DB::table('seller_calendar_events')
            ->where('id', $itemId)
            ->update([
                'completed_at' => now(),
                'completed_by' => $userId,
                'updated_at' => now(),
            ]);

        $updatedEvent = DB::table('seller_calendar_events')->where('id', $itemId)->first();

        return response()->json([
            'success' => true,
            'data' => $updatedEvent,
            'message' => 'Item completato con successo'
        ]);
    }
}
