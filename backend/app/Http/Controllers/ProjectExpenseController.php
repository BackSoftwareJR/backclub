<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ProjectExpenseController extends Controller
{
    /**
     * GET /api/crm-projects/{id}/expenses
     * Lista tutte le spese del progetto
     */
    public function index(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);

        $query = DB::table('project_expenses')
            ->where('crm_project_id', $id)
            ->whereNull('deleted_at')
            ->leftJoin('users', 'project_expenses.user_id', '=', 'users.id')
            ->leftJoin('users as creators', 'project_expenses.created_by', '=', 'creators.id')
            ->leftJoin('users as approvers', 'project_expenses.approved_by', '=', 'approvers.id')
            ->select(
                'project_expenses.*',
                'users.name as user_name',
                'users.email as user_email',
                'creators.name as created_by_name',
                'approvers.name as approved_by_name'
            )
            ->orderBy('expense_date', 'desc')
            ->orderBy('created_at', 'desc');

        // Filtri
        if ($request->has('type')) {
            $query->where('project_expenses.type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('project_expenses.status', $request->status);
        }

        if ($request->has('user_id')) {
            $query->where('project_expenses.user_id', $request->user_id);
        }

        if ($request->has('is_reimbursement_request')) {
            $query->where('project_expenses.is_reimbursement_request', $request->is_reimbursement_request);
        }

        $expenses = $query->get();

        // Calcola totali
        $totals = [
            'total' => $expenses->sum('amount_cocchi'),
            'pending' => $expenses->where('status', 'pending')->sum('amount_cocchi'),
            'approved' => $expenses->where('status', 'approved')->sum('amount_cocchi'),
            'paid' => $expenses->where('status', 'paid')->sum('amount_cocchi'),
        ];

        return response()->json([
            'success' => true,
            'data' => $expenses,
            'totals' => $totals,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/expenses
     * Crea una nuova spesa
     */
    public function store(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'type' => 'required|in:project,user',
            'user_id' => 'required_if:type,user|nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount_cocchi' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'category' => 'nullable|string|max:100',
            'payment_method' => 'nullable|string|max:100',
            'is_reimbursement_request' => 'boolean',
            'receipt_file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            $receiptFilePath = null;
            $receiptFileName = null;

            // Upload ricevuta se presente
            if ($request->hasFile('receipt_file')) {
                $file = $request->file('receipt_file');
                $receiptFileName = $file->getClientOriginalName();
                $receiptFilePath = $file->store('project-expenses/receipts', 'public');
            }

            $expenseId = DB::table('project_expenses')->insertGetId([
                'crm_project_id' => $id,
                'type' => $request->type,
                'user_id' => $request->type === 'user' ? $request->user_id : null,
                'title' => $request->title,
                'description' => $request->description,
                'amount_cocchi' => $request->amount_cocchi,
                'expense_date' => $request->expense_date,
                'category' => $request->category,
                'status' => 'pending',
                'payment_method' => $request->payment_method,
                'receipt_file_path' => $receiptFilePath,
                'receipt_file_name' => $receiptFileName,
                'is_reimbursement_request' => $request->boolean('is_reimbursement_request', false),
                'created_by' => Auth::id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // NOTA: spent_cocchi viene aggiornato solo quando la spesa viene APPROVATA, non alla creazione
            // Questo permette di avere spese in attesa di approvazione senza impattare il budget

            DB::commit();

            $expense = DB::table('project_expenses')
                ->where('id', $expenseId)
                ->leftJoin('users', 'project_expenses.user_id', '=', 'users.id')
                ->leftJoin('users as creators', 'project_expenses.created_by', '=', 'creators.id')
                ->select(
                    'project_expenses.*',
                    'users.name as user_name',
                    'users.email as user_email',
                    'creators.name as created_by_name'
                )
                ->first();

            return response()->json([
                'success' => true,
                'message' => 'Spesa creata con successo',
                'data' => $expense,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating project expense: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione della spesa: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/crm-projects/{id}/expenses/{expenseId}/approve
     * Approva una spesa
     */
    public function approve(Request $request, $id, $expenseId)
    {
        $project = CrmProject::findOrFail($id);
        
        $expense = DB::table('project_expenses')
            ->where('id', $expenseId)
            ->where('crm_project_id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$expense) {
            return response()->json([
                'success' => false,
                'message' => 'Spesa non trovata',
            ], 404);
        }

        if ($expense->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'La spesa non è in attesa di approvazione',
            ], 422);
        }

        DB::beginTransaction();
        try {
            DB::table('project_expenses')
                ->where('id', $expenseId)
                ->update([
                    'status' => 'approved',
                    'approved_by' => Auth::id(),
                    'approved_at' => now(),
                    'updated_at' => now(),
                ]);

            // Aggiorna spent_cocchi del progetto solo quando viene approvata
            $project->spent_cocchi = ($project->spent_cocchi ?? 0) + $expense->amount_cocchi;
            $project->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Spesa approvata con successo',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving expense: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'approvazione della spesa: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/crm-projects/{id}/expenses/{expenseId}/reject
     * Rifiuta una spesa
     */
    public function reject(Request $request, $id, $expenseId)
    {
        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $project = CrmProject::findOrFail($id);
        
        $expense = DB::table('project_expenses')
            ->where('id', $expenseId)
            ->where('crm_project_id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$expense) {
            return response()->json([
                'success' => false,
                'message' => 'Spesa non trovata',
            ], 404);
        }

        if ($expense->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'La spesa non è in attesa di approvazione',
            ], 422);
        }

        // Se la spesa era stata già conteggiata in spent_cocchi, la rimuoviamo
        if ($expense->status === 'approved') {
            $project->spent_cocchi = max(0, ($project->spent_cocchi ?? 0) - $expense->amount_cocchi);
            $project->save();
        }

        DB::table('project_expenses')
            ->where('id', $expenseId)
            ->update([
                'status' => 'rejected',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
                'rejection_reason' => $request->rejection_reason,
                'updated_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Spesa rifiutata',
        ]);
    }

    /**
     * DELETE /api/crm-projects/{id}/expenses/{expenseId}
     * Elimina una spesa (soft delete)
     */
    public function destroy($id, $expenseId)
    {
        $project = CrmProject::findOrFail($id);
        
        $expense = DB::table('project_expenses')
            ->where('id', $expenseId)
            ->where('crm_project_id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$expense) {
            return response()->json([
                'success' => false,
                'message' => 'Spesa non trovata',
            ], 404);
        }

        DB::beginTransaction();
        try {
            // Soft delete
            DB::table('project_expenses')
                ->where('id', $expenseId)
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);

            // Se la spesa era approvata, rimuovila da spent_cocchi
            if ($expense->status === 'approved' || $expense->status === 'paid') {
                $project->spent_cocchi = max(0, ($project->spent_cocchi ?? 0) - $expense->amount_cocchi);
                $project->save();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Spesa eliminata con successo',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'eliminazione della spesa: ' . $e->getMessage(),
            ], 500);
        }
    }
}

