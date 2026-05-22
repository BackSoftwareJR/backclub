<?php

namespace App\Http\Controllers;

use App\Models\AgendaItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class AgendaController extends Controller
{
    /**
     * GET /api/agenda
     * Lista elementi agenda
     */
    public function index(Request $request)
    {
        $query = AgendaItem::with(['relatedClient', 'relatedProject', 'relatedInvoice'])
            ->where('user_id', Auth::id());

        // Filtri
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        if ($request->has('date_from') && $request->has('date_to')) {
            // Include anche i memo senza data quando richiesto
            if ($request->boolean('include_memos_without_date')) {
                $query->where(function($q) use ($request) {
                    $q->where(function($q1) use ($request) {
                        // Elementi con data nel range
                        $q1->whereNotNull('date')
                           ->whereBetween('date', [$request->date_from, $request->date_to]);
                    })
                    ->orWhere(function($q2) use ($request) {
                        // Memo senza data creati nel range
                        $q2->where('type', 'memo')
                           ->whereNull('date')
                           ->whereBetween('created_at', [
                               $request->date_from . ' 00:00:00',
                               $request->date_to . ' 23:59:59'
                           ]);
                    });
                });
            } else {
                $query->whereNotNull('date')
                      ->whereBetween('date', [$request->date_from, $request->date_to]);
            }
        }

        if ($request->boolean('pinned_only')) {
            $query->where('is_pinned', true);
        }

        if ($request->boolean('upcoming_only')) {
            $query->upcoming();
        }

        // Ordinamento
        $query->orderBy('is_pinned', 'desc')
              ->orderBy('priority', 'desc')
              ->orderBy('date', 'asc')
              ->orderBy('time', 'asc');

        $items = $query->get();

        return response()->json([
            'success' => true,
            'data' => $items
        ]);
    }

    /**
     * POST /api/agenda
     * Crea nuovo elemento agenda
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:memo,reminder,checklist,event',
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'date' => 'required_if:type,reminder,checklist,event|nullable|date',
            'time' => 'nullable|date_format:H:i',
            'reminder_datetime' => 'nullable|date',
            'all_day' => 'nullable|boolean',
            'end_datetime' => 'nullable|date|after:reminder_datetime',
            'checklist_items' => 'nullable|array',
            'checklist_items.*.text' => 'required_with:checklist_items|string',
            'checklist_items.*.completed' => 'nullable|boolean',
            'location' => 'nullable|string|max:255',
            'participants' => 'nullable|array',
            'description' => 'nullable|string',
            'is_pinned' => 'nullable|boolean',
            'color' => 'nullable|string|max:7',
            'priority' => 'nullable|integer|in:0,1,2',
            'tags' => 'nullable|array',
            'notes' => 'nullable|string',
            'related_client_id' => 'nullable|exists:clients,id',
            'related_project_id' => 'nullable|exists:crm_projects,id',
            'related_invoice_id' => 'nullable|exists:invoices,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['user_id'] = Auth::id();

        // Se è un memo senza data, non richiedere date
        if ($request->type === 'memo' && !$request->has('date')) {
            $data['date'] = null;
        }

        $item = AgendaItem::create($data);

        $item->load(['relatedClient', 'relatedProject', 'relatedInvoice']);

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Elemento agenda creato con successo'
        ], 201);
    }

    /**
     * GET /api/agenda/{id}
     * Dettaglio elemento agenda
     */
    public function show($id)
    {
        $item = AgendaItem::with(['relatedClient', 'relatedProject', 'relatedInvoice'])
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $item
        ]);
    }

    /**
     * PUT /api/agenda/{id}
     * Aggiorna elemento agenda
     */
    public function update(Request $request, $id)
    {
        $item = AgendaItem::where('user_id', Auth::id())->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'date' => 'nullable|date',
            'time' => 'nullable|date_format:H:i',
            'reminder_datetime' => 'nullable|date',
            'all_day' => 'nullable|boolean',
            'end_datetime' => 'nullable|date',
            'checklist_items' => 'nullable|array',
            'location' => 'nullable|string|max:255',
            'participants' => 'nullable|array',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,completed,cancelled',
            'is_pinned' => 'nullable|boolean',
            'color' => 'nullable|string|max:7',
            'priority' => 'nullable|integer|in:0,1,2',
            'tags' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $item->update($request->all());
        $item->load(['relatedClient', 'relatedProject', 'relatedInvoice']);

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Elemento agenda aggiornato con successo'
        ]);
    }

    /**
     * DELETE /api/agenda/{id}
     * Elimina elemento agenda
     */
    public function destroy($id)
    {
        $item = AgendaItem::where('user_id', Auth::id())->findOrFail($id);
        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Elemento agenda eliminato con successo'
        ]);
    }

    /**
     * POST /api/agenda/{id}/toggle-pin
     * Appunta/rimuovi appuntamento
     */
    public function togglePin($id)
    {
        $item = AgendaItem::where('user_id', Auth::id())->findOrFail($id);
        $item->is_pinned = !$item->is_pinned;
        $item->save();

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => $item->is_pinned ? 'Appuntato' : 'Rimosso dagli appuntati'
        ]);
    }

    /**
     * POST /api/agenda/{id}/complete
     * Segna come completato
     */
    public function complete($id)
    {
        $item = AgendaItem::where('user_id', Auth::id())->findOrFail($id);
        $item->status = 'completed';
        $item->save();

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Elemento completato'
        ]);
    }

    /**
     * POST /api/agenda/{id}/checklist-item
     * Aggiorna item checklist
     */
    public function updateChecklistItem(Request $request, $id)
    {
        $item = AgendaItem::where('user_id', Auth::id())
            ->where('type', 'checklist')
            ->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'item_id' => 'required|string',
            'text' => 'nullable|string',
            'completed' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $checklistItems = $item->checklist_items ?? [];
        $itemId = $request->item_id;
        $found = false;

        foreach ($checklistItems as &$checklistItem) {
            if ($checklistItem['id'] === $itemId) {
                if ($request->has('text')) {
                    $checklistItem['text'] = $request->text;
                }
                if ($request->has('completed')) {
                    $checklistItem['completed'] = $request->completed;
                }
                $found = true;
                break;
            }
        }

        if (!$found && $request->has('text')) {
            // Aggiungi nuovo item
            $checklistItems[] = [
                'id' => $itemId,
                'text' => $request->text,
                'completed' => $request->boolean('completed', false),
            ];
        }

        $item->checklist_items = $checklistItems;
        $item->save();

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Checklist aggiornata'
        ]);
    }
}
