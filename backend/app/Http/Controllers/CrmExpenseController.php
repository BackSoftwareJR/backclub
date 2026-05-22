<?php

namespace App\Http\Controllers;

use App\Models\CrmExpense;
use App\Models\CrmDepartment;
use App\Models\Serbatoio;
use App\Models\SerbatoioTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CrmExpenseController extends Controller
{
    /**
     * GET /api/budget/crm/{code}/expenses
     * Lista spese CRM
     */
    public function index($code, Request $request)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $query = CrmExpense::where('crm_department_id', $department->id)
            ->with(['relatedUser', 'relatedProject', 'creator']);

        // Filtri
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('recurring_only') && $request->recurring_only) {
            $query->recurring();
        }

        $expenses = $query->orderBy('created_at', 'desc')->get();

        // Calculate totals
        $totalAmount = $expenses->sum('amount');
        $monthlyRecurring = $expenses->where('frequency', 'monthly')->sum('amount');
        $yearlyRecurring = $expenses->where('frequency', 'yearly')->sum('amount');

        return response()->json([
            'success' => true,
            'data' => $expenses,
            'stats' => [
                'total' => $totalAmount,
                'monthly_recurring' => $monthlyRecurring,
                'yearly_recurring' => $yearlyRecurring,
                'count' => $expenses->count(),
            ],
        ]);
    }

    /**
     * POST /api/budget/crm/{code}/expenses
     * Crea nuova spesa
     */
    public function store(Request $request, $code)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'type' => 'required|in:abbonamento,spesa_prevista,spesa_imprevista,servizio,altro',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
            'frequency' => 'required|in:once,monthly,quarterly,yearly',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'status' => 'sometimes|in:active,inactive,expired',
            'category' => 'nullable|string|max:100',
            'related_user_id' => 'nullable|exists:users,id',
            'related_project_id' => 'nullable|exists:projects,id',
            'attachment_url' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $expense = CrmExpense::create(array_merge(
            $validator->validated(),
            [
                'crm_department_id' => $department->id,
                'created_by' => auth()->id(),
            ]
        ));

        return response()->json([
            'success' => true,
            'message' => 'Spesa creata con successo',
            'data' => $expense->load(['relatedUser', 'relatedProject', 'creator']),
        ], 201);
    }

    /**
     * PUT /api/budget/expenses/{id}
     * Aggiorna spesa
     */
    public function update(Request $request, $id)
    {
        $expense = CrmExpense::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|in:abbonamento,spesa_prevista,spesa_imprevista,servizio,altro',
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'sometimes|numeric|min:0',
            'frequency' => 'sometimes|in:once,monthly,quarterly,yearly',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => 'sometimes|in:active,inactive,expired',
            'category' => 'nullable|string|max:100',
            'related_user_id' => 'nullable|exists:users,id',
            'related_project_id' => 'nullable|exists:projects,id',
            'attachment_url' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $expense->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Spesa aggiornata con successo',
            'data' => $expense->fresh(['relatedUser', 'relatedProject', 'creator']),
        ]);
    }

    /**
     * DELETE /api/budget/expenses/{id}
     * Elimina spesa
     */
    public function delete($id)
    {
        $expense = CrmExpense::findOrFail($id);
        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'Spesa eliminata con successo',
        ]);
    }

    /**
     * POST /api/budget/crm/{code}/expenses/record
     * Registra spesa effettiva con documento (fattura/ricevuta)
     * Questa azione riduce il budget del CRM E del serbatoio Budget
     */
    public function recordExpenseWithDocument(Request $request, $code)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'document_type' => 'required|in:ricevuta,fattura,altro',
            'document_number' => 'nullable|string|max:100',
            'document_file' => 'nullable|file|max:10240', // 10MB max
            'vendor' => 'required|string|max:255',
            'paid_at' => 'required|date',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $crm = CrmDepartment::where('code', $code)->firstOrFail();
            $budgetSerbatoio = Serbatoio::where('name', 'Budget')
                ->where('is_active', true)
                ->firstOrFail();

            $amount = $request->amount;

            // Verifica disponibilità budget CRM
            $available = $crm->budget_allocated - $crm->budget_spent;
            if ($available < $amount) {
                return response()->json([
                    'success' => false,
                    'message' => "Budget CRM insufficiente. Disponibile: ¢ " . number_format($available, 2),
                ], 422);
            }

            // Upload file se presente
            $documentPath = null;
            if ($request->hasFile('document_file')) {
                $documentPath = $request->file('document_file')->store('expenses', 'public');
            }

            // Crea spesa
            $expense = CrmExpense::create([
                'crm_department_id' => $crm->id,
                'type' => 'spesa_effettiva',
                'name' => $request->name,
                'amount' => $amount,
                'document_type' => $request->document_type,
                'document_number' => $request->document_number,
                'document_file' => $documentPath,
                'vendor' => $request->vendor,
                'paid_at' => $request->paid_at,
                'description' => $request->description,
                'category' => $request->category,
                'reduces_serbatoio' => true,
                'frequency' => 'once',
                'status' => 'active',
                'created_by' => auth()->id(),
            ]);

            // Aggiorna budget speso CRM
            $crm->budget_spent += $amount;
            $crm->save();

            // Riduce serbatoio Budget
            $balanceBefore = $budgetSerbatoio->balance;
            $budgetSerbatoio->balance -= $amount;
            $budgetSerbatoio->save();

            // Crea transazione serbatoio
            SerbatoioTransaction::create([
                'serbatoio_id' => $budgetSerbatoio->id,
                'type' => 'expense',
                'amount' => -$amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $budgetSerbatoio->balance,
                'reason' => "Spesa {$crm->name}: {$expense->name} ({$request->document_type} {$request->document_number})",
                'created_by' => auth()->id(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Spesa registrata con successo',
                'data' => $expense->fresh(['creator']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la registrazione della spesa: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/budget/crm/{code}/expenses/documents
     * Lista spese con documenti (ricevute/fatture)
     */
    public function getDocumentedExpenses($code)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $expenses = CrmExpense::where('crm_department_id', $department->id)
            ->whereNotNull('document_type')
            ->where('reduces_serbatoio', true)
            ->with(['creator'])
            ->orderBy('paid_at', 'desc')
            ->get();

        $totalSpent = $expenses->sum('amount');

        return response()->json([
            'success' => true,
            'data' => $expenses,
            'total_spent' => $totalSpent,
        ]);
    }
}
