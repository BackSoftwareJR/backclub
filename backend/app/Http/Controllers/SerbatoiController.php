<?php

namespace App\Http\Controllers;

use App\Models\Serbatoio;
use App\Models\SerbatoioTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class SerbatoiController extends Controller
{
    /**
     * GET /api/serbatoi
     * Lista tutti i serbatoi
     */
    public function index(Request $request)
    {
        $query = Serbatoio::with(['creator']);

        // Filtri opzionali
        if ($request->has('active_only')) {
            $query->active();
        }

        if ($request->has('auto_enabled_only')) {
            $query->autoEnabled();
        }

        $serbatoi = $query->byPriority()->get();

        // Statistiche generali
        $stats = [
            'total_balance' => $serbatoi->sum('balance'),
            'total_serbatoi' => $serbatoi->count(),
            'active_serbatoi' => $serbatoi->where('is_active', true)->count(),
            'auto_enabled' => $serbatoi->where('auto_distribution_enabled', true)->count(),
            'total_auto_percentage' => $serbatoi->where('auto_distribution_enabled', true)
                                                 ->sum('auto_distribution_percentage'),
        ];

        return response()->json([
            'success' => true,
            'data' => $serbatoi,
            'stats' => $stats,
        ]);
    }

    /**
     * GET /api/serbatoi/{id}
     * Dettaglio singolo serbatoio
     */
    public function show($id)
    {
        $serbatoio = Serbatoio::with([
            'creator',
            'transactions' => function($query) {
                $query->with(['fromSerbatoio', 'toSerbatoio', 'creator'])
                      ->limit(50);
            }
        ])->findOrFail($id);

        // Statistiche transazioni
        $stats = [
            'total_income' => $serbatoio->transactions()
                                        ->where('amount', '>', 0)
                                        ->sum('amount'),
            'total_expenses' => abs($serbatoio->transactions()
                                              ->where('amount', '<', 0)
                                              ->sum('amount')),
            'transaction_count' => $serbatoio->transactions()->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $serbatoio,
            'stats' => $stats,
        ]);
    }

    /**
     * POST /api/serbatoi
     * Crea nuovo serbatoio
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:serbatoi,name',
            'description' => 'nullable|string',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'auto_distribution_enabled' => 'boolean',
            'auto_distribution_percentage' => 'required_if:auto_distribution_enabled,true|numeric|min:0|max:100',
            'priority_order' => 'nullable|integer|min:0',
            'balance' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $serbatoio = Serbatoio::create(array_merge(
            $validator->validated(),
            ['created_by' => auth()->id()]
        ));

        return response()->json([
            'success' => true,
            'message' => 'Serbatoio creato con successo',
            'data' => $serbatoio->load('creator'),
        ], 201);
    }

    /**
     * PUT /api/serbatoi/{id}
     * Aggiorna serbatoio
     */
    public function update(Request $request, $id)
    {
        $serbatoio = Serbatoio::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:serbatoi,name,' . $id,
            'description' => 'nullable|string',
            'color' => 'sometimes|required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'auto_distribution_enabled' => 'boolean',
            'auto_distribution_percentage' => 'required_if:auto_distribution_enabled,true|numeric|min:0|max:100',
            'priority_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $serbatoio->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Serbatoio aggiornato con successo',
            'data' => $serbatoio->fresh(['creator']),
        ]);
    }

    /**
     * DELETE /api/serbatoi/{id}
     * Elimina serbatoio (soft delete)
     */
    public function destroy($id)
    {
        $serbatoio = Serbatoio::findOrFail($id);

        if ($serbatoio->balance > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Impossibile eliminare un serbatoio con saldo positivo',
            ], 400);
        }

        $serbatoio->delete();

        return response()->json([
            'success' => true,
            'message' => 'Serbatoio eliminato con successo',
        ]);
    }

    /**
     * POST /api/serbatoi/transfer
     * Trasferimento manuale tra serbatoi
     */
    public function transfer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'from_serbatoio_id' => 'required|exists:serbatoi,id',
            'to_serbatoio_id' => 'required|exists:serbatoi,id|different:from_serbatoio_id',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $result = Serbatoio::transfer(
                $request->from_serbatoio_id,
                $request->to_serbatoio_id,
                $request->amount,
                $request->reason,
                auth()->id()
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Trasferimento completato con successo',
                'data' => [
                    'from' => $result['from']->load('creator'),
                    'to' => $result['to']->load('creator'),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * POST /api/serbatoi/{id}/adjustment
     * Crea un adjustment (aggiunta o rimozione manuale)
     */
    public function createAdjustment(Request $request, $id)
    {
        $serbatoio = Serbatoio::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:1000',
            'type' => 'required|in:add,remove',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $amount = $request->amount;
        $type = $request->type;
        
        // Per rimozioni, l'importo deve essere negativo
        if ($type === 'remove') {
            $amount = -abs($amount);
        } else {
            $amount = abs($amount);
        }

        $balanceBefore = $serbatoio->balance;
        $balanceAfter = $balanceBefore + $amount;

        // Crea la transazione
        $transaction = SerbatoioTransaction::create([
            'serbatoio_id' => $serbatoio->id,
            'type' => 'adjustment',
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'reason' => $request->reason,
            'created_by' => auth()->id(),
        ]);

        // Aggiorna il saldo del serbatoio
        $serbatoio->update(['balance' => $balanceAfter]);

        return response()->json([
            'success' => true,
            'message' => $type === 'add' ? 'Cocchi aggiunti con successo' : 'Cocchi rimossi con successo',
            'data' => [
                'serbatoio' => $serbatoio->fresh(['creator']),
                'transaction' => $transaction->load('serbatoio', 'creator'),
            ],
        ]);
    }

    /**
     * GET /api/serbatoi/transactions
     * Storico transazioni (tutte o filtrate)
     */
    public function transactions(Request $request)
    {
        $query = SerbatoioTransaction::with([
            'serbatoio',
            'fromSerbatoio',
            'toSerbatoio',
            'creator'
        ]);

        // Filtri
        if ($request->has('serbatoio_id')) {
            $query->where('serbatoio_id', $request->serbatoio_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->forPeriod($request->start_date, $request->end_date);
        }

        $transactions = $query->orderBy('created_at', 'desc')
                              ->paginate($request->get('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    /**
     * PUT /api/serbatoi/{id}/automation
     * Aggiorna configurazione automazione
     */
    public function updateAutomation(Request $request, $id)
    {
        $serbatoio = Serbatoio::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'auto_distribution_enabled' => 'required|boolean',
            'auto_distribution_percentage' => 'required_if:auto_distribution_enabled,true|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $serbatoio->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Automazione aggiornata con successo',
            'data' => $serbatoio->fresh(['creator']),
        ]);
    }

    /**
     * POST /api/serbatoi/distribute-income
     * Distribuisci entrata automaticamente a tutti i serbatoi con auto-distribuzione
     */
    public function distributeIncome(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'total_amount' => 'required|numeric|min:0.01',
            'source' => 'nullable|string',
            'related_type' => 'nullable|string',
            'related_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $metadata = [
                'source' => $request->source,
                'related_type' => $request->related_type,
                'related_id' => $request->related_id,
            ];

            $transactions = Serbatoio::distributeIncome(
                $request->total_amount,
                auth()->id(),
                $metadata
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Distribuzione completata con successo',
                'data' => [
                    'transactions_count' => count($transactions),
                    'total_distributed' => collect($transactions)->sum('amount'),
                    'transactions' => $transactions,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * GET /api/serbatoi/{id}/comments
     * Get all comments for a serbatoio
     */
    public function getComments($id)
    {
        $serbatoio = Serbatoio::findOrFail($id);
        $comments = $serbatoio->comments;

        return response()->json([
            'success' => true,
            'data' => $comments,
        ]);
    }

    /**
     * POST /api/serbatoi/{id}/comments
     * Add a comment to a serbatoio
     */
    public function addComment(Request $request, $id)
    {
        $serbatoio = Serbatoio::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'comment' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $comment = $serbatoio->comments()->create([
            'user_id' => auth()->id(),
            'comment' => $request->comment,
        ]);

        $comment->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Commento aggiunto con successo',
            'data' => $comment,
        ], 201);
    }

    /**
     * DELETE /api/serbatoi/comments/{commentId}
     * Delete a comment
     */
    public function deleteComment($commentId)
    {
        $comment = \App\Models\SerbatoioComment::findOrFail($commentId);

        // Check if user is the owner or admin
        if ($comment->user_id !== auth()->id() && !auth()->user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Non autorizzato ad eliminare questo commento',
            ], 403);
        }

        $comment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Commento eliminato con successo',
        ]);
    }
}
