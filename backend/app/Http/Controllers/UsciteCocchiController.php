<?php

namespace App\Http\Controllers;

use App\Models\UscitaCocchi;
use App\Models\Serbatoio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class UsciteCocchiController extends Controller
{
    /**
     * GET /api/uscite-cocchi
     * Lista uscite con filtri
     */
    public function index(Request $request)
    {
        $query = UscitaCocchi::with([
            'teamMember',
            'client',
            'project',
            'serbatoio',
            'creator',
            'payer'
        ]);

        // Filtri
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->byType($request->type);
        }

        if ($request->has('category')) {
            $query->byCategory($request->category);
        }

        if ($request->has('team_member_id')) {
            $query->forTeamMember($request->team_member_id);
        }

        if ($request->has('client_id')) {
            $query->forClient($request->client_id);
        }

        if ($request->has('project_id')) {
            $query->forProject($request->project_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->forPeriod($request->start_date, $request->end_date);
        }

        if ($request->has('overdue_only') && $request->overdue_only) {
            $query->overdue();
        }

        // Ordinamento
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $uscite = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $uscite,
        ]);
    }

    /**
     * GET /api/uscite-cocchi/{id}
     * Dettaglio singola uscita
     */
    public function show($id)
    {
        $uscita = UscitaCocchi::with([
            'teamMember',
            'client',
            'project',
            'serbatoio',
            'creator',
            'payer'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $uscita,
        ]);
    }

    /**
     * POST /api/uscite-cocchi
     * Crea nuova uscita
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0.01',
            'type' => 'required|in:fattura,ricevuta,bonifico,contanti,carta,paypal,altro',
            'category' => 'nullable|string|max:100',
            'paid_to' => 'nullable|string|max:255',
            'team_member_id' => 'nullable|exists:users,id',
            'client_id' => 'nullable|exists:clients,id',
            'project_id' => 'nullable|exists:projects,id',
            'serbatoio_id' => 'nullable|exists:serbatoi,id',
            'payment_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'invoice_number' => 'nullable|string|max:100',
            'status' => 'nullable|in:pending,paid,cancelled,refunded',
            'tags' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $uscita = UscitaCocchi::create(array_merge(
            $validator->validated(),
            ['created_by' => auth()->id()]
        ));

        return response()->json([
            'success' => true,
            'message' => 'Uscita creata con successo',
            'data' => $uscita->load([
                'teamMember',
                'client',
                'project',
                'serbatoio',
                'creator'
            ]),
        ], 201);
    }

    /**
     * PUT /api/uscite-cocchi/{id}
     * Aggiorna uscita
     */
    public function update(Request $request, $id)
    {
        $uscita = UscitaCocchi::findOrFail($id);

        // Non permettere modifica se già pagata
        if ($uscita->status === 'paid' && !$request->has('force_update')) {
            return response()->json([
                'success' => false,
                'message' => 'Impossibile modificare un\'uscita già pagata',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'type' => 'sometimes|required|in:fattura,ricevuta,bonifico,contanti,carta,paypal,altro',
            'category' => 'nullable|string|max:100',
            'paid_to' => 'nullable|string|max:255',
            'team_member_id' => 'nullable|exists:users,id',
            'client_id' => 'nullable|exists:clients,id',
            'project_id' => 'nullable|exists:projects,id',
            'serbatoio_id' => 'nullable|exists:serbatoi,id',
            'payment_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'invoice_number' => 'nullable|string|max:100',
            'status' => 'nullable|in:pending,paid,cancelled,refunded',
            'tags' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $uscita->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Uscita aggiornata con successo',
            'data' => $uscita->fresh([
                'teamMember',
                'client',
                'project',
                'serbatoio',
                'creator',
                'payer'
            ]),
        ]);
    }

    /**
     * DELETE /api/uscite-cocchi/{id}
     * Elimina uscita (soft delete)
     */
    public function destroy($id)
    {
        $uscita = UscitaCocchi::findOrFail($id);

        if ($uscita->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Impossibile eliminare un\'uscita già pagata',
            ], 400);
        }

        $uscita->delete();

        return response()->json([
            'success' => true,
            'message' => 'Uscita eliminata con successo',
        ]);
    }

    /**
     * POST /api/uscite-cocchi/{id}/invoice
     * Upload fattura/ricevuta
     */
    public function uploadInvoice(Request $request, $id)
    {
        $uscita = UscitaCocchi::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Elimina file precedente se esiste
            if ($uscita->invoice_file_path) {
                Storage::disk('public')->delete($uscita->invoice_file_path);
            }

            // Upload nuovo file
            $file = $request->file('file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('invoices', $fileName, 'public');

            $uscita->update([
                'invoice_file_path' => $filePath,
                'invoice_file_name' => $file->getClientOriginalName(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'File caricato con successo',
                'data' => [
                    'file_path' => $filePath,
                    'file_name' => $fileName,
                    'file_url' => Storage::url($filePath),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore durante il caricamento del file: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/uscite-cocchi/{id}/mark-paid
     * Marca come pagata
     */
    public function markPaid(Request $request, $id)
    {
        $uscita = UscitaCocchi::findOrFail($id);

        if ($uscita->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Uscita già marcata come pagata',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'serbatoio_id' => 'nullable|exists:serbatoi,id',
            'payment_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Imposta payment_date se fornito
            if ($request->has('payment_date')) {
                $uscita->payment_date = $request->payment_date;
                $uscita->save();
            }

            $uscita->markAsPaid(
                auth()->id(),
                $request->serbatoio_id ?? $uscita->serbatoio_id
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Uscita marcata come pagata con successo',
                'data' => $uscita->fresh([
                    'teamMember',
                    'client',
                    'project',
                    'serbatoio',
                    'creator',
                    'payer'
                ]),
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
     * POST /api/uscite-cocchi/{id}/cancel
     * Annulla uscita
     */
    public function cancel($id)
    {
        $uscita = UscitaCocchi::findOrFail($id);

        if ($uscita->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Impossibile annullare un\'uscita già pagata',
            ], 400);
        }

        $uscita->cancel();

        return response()->json([
            'success' => true,
            'message' => 'Uscita annullata con successo',
            'data' => $uscita->fresh(),
        ]);
    }

    /**
     * GET /api/uscite-cocchi/stats
     * Statistiche uscite
     */
    public function stats(Request $request)
    {
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        $stats = [
            'total_amount' => UscitaCocchi::forPeriod($startDate, $endDate)->sum('amount'),
            'paid_amount' => UscitaCocchi::paid()->forPeriod($startDate, $endDate)->sum('amount'),
            'pending_amount' => UscitaCocchi::pending()->sum('amount'),
            'overdue_amount' => UscitaCocchi::overdue()->sum('amount'),
            'count_total' => UscitaCocchi::forPeriod($startDate, $endDate)->count(),
            'count_paid' => UscitaCocchi::paid()->forPeriod($startDate, $endDate)->count(),
            'count_pending' => UscitaCocchi::pending()->count(),
            'count_overdue' => UscitaCocchi::overdue()->count(),
            'by_category' => UscitaCocchi::forPeriod($startDate, $endDate)
                                         ->selectRaw('category, SUM(amount) as total, COUNT(*) as count')
                                         ->groupBy('category')
                                         ->get(),
            'by_type' => UscitaCocchi::forPeriod($startDate, $endDate)
                                     ->selectRaw('type, SUM(amount) as total, COUNT(*) as count')
                                     ->groupBy('type')
                                     ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }
}
