<?php

namespace App\Http\Controllers;

use App\Models\ExpenseReimbursementRequest;
use App\Models\UscitaCocchi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ExpenseReimbursementController extends Controller
{
    /**
     * GET /api/expense-reimbursements
     * Lista richieste rimborsi con filtri
     */
    public function index(Request $request)
    {
        $query = ExpenseReimbursementRequest::with(['user', 'reviewer', 'project', 'client']);

        // Filtri
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('crm_code')) {
            $query->where('crm_code', $request->crm_code);
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->has('date_from')) {
            $query->where('expense_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('expense_date', '<=', $request->date_to);
        }

        // Search
        if ($request->has('q')) {
            $search = $request->q;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'requested_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $reimbursements = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $reimbursements,
        ]);
    }

    /**
     * GET /api/expense-reimbursements/pending
     * Solo pending per admin/segreteria
     */
    public function pending()
    {
        $reimbursements = ExpenseReimbursementRequest::with(['user', 'project'])
            ->pending()
            ->orderBy('requested_at', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $reimbursements,
            'count' => $reimbursements->count(),
        ]);
    }

    /**
     * GET /api/expense-reimbursements/my
     * Mie richieste rimborsi
     */
    public function my()
    {
        $userId = auth()->id();
        $reimbursements = ExpenseReimbursementRequest::with(['reviewer', 'uscita'])
            ->forUser($userId)
            ->orderBy('requested_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $reimbursements,
        ]);
    }

    /**
     * GET /api/expense-reimbursements/{id}
     * Dettaglio singola richiesta
     */
    public function show($id)
    {
        $reimbursement = ExpenseReimbursementRequest::with([
            'user', 
            'reviewer', 
            'payer', 
            'uscita', 
            'project', 
            'client'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $reimbursement,
        ]);
    }

    /**
     * POST /api/expense-reimbursements
     * Crea nuova richiesta rimborso
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'expense_date' => 'required|date',
            'crm_code' => 'nullable|string|max:50',
            'project_id' => 'nullable|exists:projects,id',
            'client_id' => 'nullable|exists:clients,id',
            'receipt_file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB
            'additional_files.*' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        DB::beginTransaction();
        try {
            // Upload receipt
            $receiptPath = $request->file('receipt_file')->store('reimbursements/receipts', 'public');
            
            // Upload additional files
            $additionalFiles = [];
            if ($request->hasFile('additional_files')) {
                foreach ($request->file('additional_files') as $file) {
                    $path = $file->store('reimbursements/additional', 'public');
                    $additionalFiles[] = [
                        'path' => $path,
                        'name' => $file->getClientOriginalName(),
                    ];
                }
            }

            $reimbursement = ExpenseReimbursementRequest::create([
                'user_id' => auth()->id(),
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'amount' => $validated['amount'],
                'category' => $validated['category'] ?? null,
                'expense_date' => $validated['expense_date'],
                'crm_code' => $validated['crm_code'] ?? null,
                'project_id' => $validated['project_id'] ?? null,
                'client_id' => $validated['client_id'] ?? null,
                'receipt_file_path' => $receiptPath,
                'receipt_file_name' => $request->file('receipt_file')->getClientOriginalName(),
                'additional_files' => $additionalFiles,
                'status' => 'pending',
                'requested_at' => now(),
            ]);

            DB::commit();

            // TODO: Send notification to admin/segreteria

            return response()->json([
                'success' => true,
                'message' => 'Richiesta rimborso inviata con successo',
                'data' => $reimbursement->load('user'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la creazione: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/expense-reimbursements/{id}/approve
     * Approva richiesta
     */
    public function approve($id, Request $request)
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $reimbursement = ExpenseReimbursementRequest::findOrFail($id);

        if ($reimbursement->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Questa richiesta non può essere approvata',
            ], 400);
        }

        $reimbursement->approve(auth()->id(), $request->notes);

        // TODO: Send notification to user

        return response()->json([
            'success' => true,
            'message' => 'Richiesta approvata con successo',
            'data' => $reimbursement->fresh(['user', 'reviewer']),
        ]);
    }

    /**
     * PUT /api/expense-reimbursements/{id}/reject
     * Rifiuta richiesta
     */
    public function reject($id, Request $request)
    {
        $request->validate([
            'reason' => 'required|string',
        ]);

        $reimbursement = ExpenseReimbursementRequest::findOrFail($id);

        if ($reimbursement->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Questa richiesta non può essere rifiutata',
            ], 400);
        }

        $reimbursement->reject(auth()->id(), $request->reason);

        // TODO: Send notification to user

        return response()->json([
            'success' => true,
            'message' => 'Richiesta rifiutata',
            'data' => $reimbursement->fresh(['user', 'reviewer']),
        ]);
    }

    /**
     * PUT /api/expense-reimbursements/{id}/pay
     * Paga rimborso approvato
     */
    public function pay($id, Request $request)
    {
        $request->validate([
            'payment_method' => 'required|string',
            'serbatoio_id' => 'nullable|exists:serbatoi,id',
            'payment_notes' => 'nullable|string',
        ]);

        $reimbursement = ExpenseReimbursementRequest::findOrFail($id);

        if ($reimbursement->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Solo richieste approvate possono essere pagate',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Crea uscita cocchi
            $uscita = UscitaCocchi::create([
                'title' => "Rimborso: {$reimbursement->title}",
                'description' => $reimbursement->description,
                'amount' => $reimbursement->amount,
                'type' => 'rimborso',
                'category' => $reimbursement->category,
                'team_member_id' => $reimbursement->user_id,
                'project_id' => $reimbursement->project_id,
                'client_id' => $reimbursement->client_id,
                'serbatoio_id' => $request->serbatoio_id,
                'payment_date' => now()->toDateString(),
                'status' => 'paid',
                'notes' => $request->payment_notes,
                'created_by' => auth()->id(),
                'paid_by' => auth()->id(),
                'paid_at' => now(),
            ]);

            // Marca come pagato
            $reimbursement->markAsPaid(auth()->id(), $uscita->id);
            $reimbursement->payment_method = $request->payment_method;
            $reimbursement->save();

            // Se c'è serbatoio, sottrai importo
            if ($request->serbatoio_id) {
                $uscita->serbatoio->subtractCocchi(
                    $reimbursement->amount,
                    'reimbursement',
                    "Rimborso {$reimbursement->user->name}: {$reimbursement->title}",
                    null,
                    auth()->id()
                );
            }

            DB::commit();

            // TODO: Send notification to user

            return response()->json([
                'success' => true,
                'message' => 'Rimborso pagato con successo',
                'data' => $reimbursement->fresh(['user', 'payer', 'uscita']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante il pagamento: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/expense-reimbursements/{id}
     * Cancella/Annulla richiesta
     */
    public function destroy($id)
    {
        $reimbursement = ExpenseReimbursementRequest::findOrFail($id);

        // Solo l'utente può cancellare se pending
        if ($reimbursement->user_id !== auth()->id() || $reimbursement->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Non puoi cancellare questa richiesta',
            ], 403);
        }

        $reimbursement->cancel();

        return response()->json([
            'success' => true,
            'message' => 'Richiesta cancellata',
        ]);
    }

    /**
     * GET /api/expense-reimbursements/stats
     * Statistiche rimborsi
     */
    public function stats()
    {
        $stats = [
            'pending_count' => ExpenseReimbursementRequest::pending()->count(),
            'pending_amount' => ExpenseReimbursementRequest::pending()->sum('amount'),
            'approved_count' => ExpenseReimbursementRequest::approved()->count(),
            'approved_amount' => ExpenseReimbursementRequest::approved()->sum('amount'),
            'paid_this_month' => ExpenseReimbursementRequest::paid()
                ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])
                ->sum('amount'),
            'total_reimbursed' => ExpenseReimbursementRequest::paid()->sum('amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}

