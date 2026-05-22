<?php

namespace App\Http\Controllers;

use App\Models\CrmDepartment;
use App\Models\Serbatoio;
use App\Models\SerbatoioTransaction;
use App\Models\BudgetAllocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BudgetDistributionController extends Controller
{
    /**
     * POST /api/budget/distribute-to-crm
     * Distribuisce budget dal serbatoio Budget a un CRM
     */
    public function distributeToCrm(Request $request)
    {
        // Check admin permission
        $user = auth()->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo gli amministratori possono distribuire budget',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'crm_code' => 'required|string|exists:crm_departments,code',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Find Budget serbatoio
            $budgetSerbatoio = Serbatoio::where('name', 'Budget')
                ->where('is_active', true)
                ->firstOrFail();

            // Find CRM department
            $crm = CrmDepartment::where('code', $request->crm_code)->firstOrFail();

            $amount = $request->amount;

            // Check if budget serbatoio has enough balance
            if ($budgetSerbatoio->balance < $amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Budget serbatoio non ha abbastanza fondi disponibili',
                ], 422);
            }

            // Deduct from serbatoio Budget
            $budgetSerbatoio->balance -= $amount;
            $budgetSerbatoio->save();

            // Create transaction for serbatoio
            SerbatoioTransaction::create([
                'serbatoio_id' => $budgetSerbatoio->id,
                'type' => 'allocation_to_crm',
                'amount' => -$amount,
                'balance_before' => $budgetSerbatoio->balance + $amount,
                'balance_after' => $budgetSerbatoio->balance,
                'reason' => $request->reason ?? "Allocazione budget a CRM: {$crm->name}",
                'created_by' => auth()->id(),
            ]);

            // Add to CRM budget_allocated
            $crm->budget_allocated += $amount;
            $crm->save();

            // Create allocation record for history tracking
            BudgetAllocation::create([
                'crm_department_id' => $crm->id,
                'amount' => $amount,
                'allocated_by' => auth()->id(),
                'reason' => $request->reason,
                'status' => 'active',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Budget di ¢ {$amount} distribuito con successo a {$crm->name}",
                'data' => [
                    'serbatoio' => $budgetSerbatoio->fresh(),
                    'crm' => $crm->fresh(),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la distribuzione del budget: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/budget/crm/{code}/allocate-to-project
     * Alloca budget da un CRM a un progetto specifico
     */
    public function allocateToProject(Request $request, $code)
    {
        $validator = Validator::make($request->all(), [
            'project_id' => 'required|exists:projects,id',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:500',
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
            $amount = $request->amount;

            // Calculate available budget
            $available = $crm->budget_allocated - $crm->budget_spent;

            if ($available < $amount) {
                return response()->json([
                    'success' => false,
                    'message' => "Budget disponibile insufficiente. Disponibile: ¢ {$available}",
                ], 422);
            }

            // Create allocation record (you can create a new model for this if needed)
            // For now, we'll just increment budget_spent
            $crm->budget_spent += $amount;
            $crm->save();

            // TODO: Create project_budget_allocations table and record
            // For now, we're just tracking in CRM expenses

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Budget di ¢ {$amount} allocato con successo al progetto",
                'data' => $crm->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante l\'allocazione del budget: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/budget/crm/{code}/reduce
     * Riduce budget allocato di un CRM (NON restituisce al serbatoio)
     * Solo admin può eseguire questa operazione
     */
    public function reduceCrmBudget(Request $request, $code)
    {
        // Check admin permission
        $user = auth()->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo gli amministratori possono ridurre il budget CRM',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'nullable|string|max:500',
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
            $amount = $request->amount;

            // Check if CRM has enough budget allocated
            if ($crm->budget_allocated < $amount) {
                return response()->json([
                    'success' => false,
                    'message' => "Il CRM ha solo ¢ {$crm->budget_allocated} allocati. Non puoi ridurre di ¢ {$amount}",
                ], 422);
            }

            // Check if reduction would create negative remaining budget
            $remaining = $crm->budget_allocated - $crm->budget_spent;
            if ($remaining < $amount) {
                return response()->json([
                    'success' => false,
                    'message' => "Budget rimanente insufficiente. Il CRM ha speso ¢ {$crm->budget_spent} di ¢ {$crm->budget_allocated}. Puoi ridurre al massimo di ¢ {$remaining}",
                ], 422);
            }

            // Reduce CRM budget_allocated (NO serbatoio change)
            $crm->budget_allocated -= $amount;
            $crm->save();

            // Mark relevant BudgetAllocation as revoked (optional, for audit)
            BudgetAllocation::create([
                'crm_department_id' => $crm->id,
                'amount' => -$amount, // Negative to indicate reduction
                'allocated_by' => auth()->id(),
                'reason' => $request->reason ?? "Riduzione budget di ¢ {$amount}",
                'status' => 'active',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Budget ridotto di ¢ {$amount}. Il serbatoio Budget non è stato modificato.",
                'data' => $crm->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la riduzione del budget: ' . $e->getMessage(),
            ], 500);
        }
    }
}
