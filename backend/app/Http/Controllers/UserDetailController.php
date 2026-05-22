<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UscitaCocchi;
use App\Models\ExpenseReimbursementRequest;
use App\Models\UserCrmAllocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserDetailController extends Controller
{
    /**
     * GET /api/users/{id}/detail
     * Dettaglio completo utente con tutte le spese, rimborsi e allocazioni
     */
    public function show(Request $request, $id)
    {
        try {
            $user = User::with([
                'activeCrmMemberships.department',
                'crmAllocations.crmDepartment',
                'projects'
            ])->findOrFail($id);

            // Statistiche generali
            $stats = $this->getUserStats($id, $request);

            // Spese come beneficiario (paginato)
            $expenses = $this->getUserExpenses($id, $request);

            // Richieste rimborso (paginato)
            $reimbursements = $this->getUserReimbursements($id, $request);

            // Allocazioni CRM
            $crmAllocations = UserCrmAllocation::where('user_id', $id)
                ->with(['crmDepartment', 'project'])
                ->get();

            // Progetti attivi
            $projects = $user->projects()
                ->where('status', 'active')
                ->select('projects.id', 'projects.name', 'projects.status', 'projects.budget_cocchi', 'projects.spent_cocchi')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'avatar' => $user->avatar,
                        'phone' => $user->phone,
                        'department' => $user->department,
                        'hire_date' => $user->hire_date,
                        'salary_cocchi' => $user->salary_cocchi,
                        'is_active' => $user->is_active,
                    ],
                    'stats' => $stats,
                    'expenses' => $expenses,
                    'reimbursements' => $reimbursements,
                    'crm_allocations' => $crmAllocations,
                    'projects' => $projects,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nel recupero dettagli utente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calcola statistiche utente
     */
    private function getUserStats($userId, Request $request)
    {
        $period = $request->get('period', 'all'); // all, month, year
        $query = UscitaCocchi::where('team_member_id', $userId);
        $reimbQuery = ExpenseReimbursementRequest::where('user_id', $userId);

        // Filtro periodo
        if ($period === 'month') {
            $query->whereMonth('payment_date', now()->month)
                  ->whereYear('payment_date', now()->year);
            $reimbQuery->whereMonth('expense_date', now()->month)
                       ->whereYear('expense_date', now()->year);
        } elseif ($period === 'year') {
            $query->whereYear('payment_date', now()->year);
            $reimbQuery->whereYear('expense_date', now()->year);
        }

        // Statistiche spese
        $totalExpenses = $query->count();
        $totalPaid = $query->where('status', 'paid')->sum('amount') ?? 0;
        $totalPending = $query->where('status', 'pending')->sum('amount') ?? 0;

        // Statistiche rimborsi
        $totalReimbursements = $reimbQuery->count();
        $reimbPending = $reimbQuery->where('status', 'pending')->sum('amount') ?? 0;
        $reimbApproved = $reimbQuery->where('status', 'approved')->sum('amount') ?? 0;
        $reimbPaid = $reimbQuery->where('status', 'paid')->sum('amount') ?? 0;

        // Allocazioni CRM
        $allocations = UserCrmAllocation::where('user_id', $userId)
            ->select(
                DB::raw('SUM(cocchi_allocated) as total_allocated'),
                DB::raw('SUM(cocchi_used) as total_used')
            )
            ->first();

        $totalAllocated = $allocations->total_allocated ?? 0;
        $totalUsed = $allocations->total_used ?? 0;
        $totalRemaining = $totalAllocated - $totalUsed;

        // Progetti attivi
        $activeProjects = DB::table('project_members')
            ->where('user_id', $userId)
            ->join('projects', 'projects.id', '=', 'project_members.project_id')
            ->where('projects.status', 'active')
            ->count();

        // Ultima attività
        $lastExpense = UscitaCocchi::where('team_member_id', $userId)
            ->orderBy('payment_date', 'desc')
            ->first();
        $lastReimb = ExpenseReimbursementRequest::where('user_id', $userId)
            ->orderBy('expense_date', 'desc')
            ->first();

        $lastActivity = null;
        if ($lastExpense && $lastReimb) {
            $lastActivity = $lastExpense->payment_date > $lastReimb->expense_date 
                ? $lastExpense->payment_date 
                : $lastReimb->expense_date;
        } elseif ($lastExpense) {
            $lastActivity = $lastExpense->payment_date;
        } elseif ($lastReimb) {
            $lastActivity = $lastReimb->expense_date;
        }

        return [
            'expenses' => [
                'total_count' => $totalExpenses,
                'total_paid' => (float) $totalPaid,
                'total_pending' => (float) $totalPending,
                'formatted_paid' => '€ ' . number_format($totalPaid, 2, ',', '.'),
                'formatted_pending' => '€ ' . number_format($totalPending, 2, ',', '.'),
            ],
            'reimbursements' => [
                'total_count' => $totalReimbursements,
                'pending_amount' => (float) $reimbPending,
                'approved_amount' => (float) $reimbApproved,
                'paid_amount' => (float) $reimbPaid,
                'formatted_pending' => '€ ' . number_format($reimbPending, 2, ',', '.'),
                'formatted_approved' => '€ ' . number_format($reimbApproved, 2, ',', '.'),
                'formatted_paid' => '€ ' . number_format($reimbPaid, 2, ',', '.'),
            ],
            'allocations' => [
                'total_allocated' => (float) $totalAllocated,
                'total_used' => (float) $totalUsed,
                'total_remaining' => (float) $totalRemaining,
                'usage_percentage' => $totalAllocated > 0 ? round(($totalUsed / $totalAllocated) * 100, 1) : 0,
                'formatted_allocated' => '€ ' . number_format($totalAllocated, 2, ',', '.'),
                'formatted_used' => '€ ' . number_format($totalUsed, 2, ',', '.'),
                'formatted_remaining' => '€ ' . number_format($totalRemaining, 2, ',', '.'),
            ],
            'projects' => [
                'active_count' => $activeProjects,
            ],
            'last_activity' => $lastActivity,
        ];
    }

    /**
     * Ottieni spese utente (paginato)
     */
    private function getUserExpenses($userId, Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $status = $request->get('status');
        $category = $request->get('category');

        $query = UscitaCocchi::where('team_member_id', $userId)
            ->with(['project:id,name', 'serbatoio:id,name', 'creator:id,name'])
            ->orderBy('payment_date', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        if ($category) {
            $query->where('category', $category);
        }

        return $query->paginate($perPage);
    }

    /**
     * Ottieni rimborsi utente (paginato)
     */
    private function getUserReimbursements($userId, Request $request)
    {
        $perPage = $request->get('per_page_reimb', 10);
        $status = $request->get('reimb_status');

        $query = ExpenseReimbursementRequest::where('user_id', $userId)
            ->with(['project:id,name', 'reviewer:id,name', 'payer:id,name'])
            ->orderBy('expense_date', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        return $query->paginate($perPage);
    }

    /**
     * GET /api/users/{id}/expenses
     * Solo spese utente (per lazy loading)
     */
    public function expenses(Request $request, $id)
    {
        try {
            $expenses = $this->getUserExpenses($id, $request);
            
            return response()->json([
                'success' => true,
                'data' => $expenses
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nel recupero spese: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/users/{id}/reimbursements
     * Solo rimborsi utente (per lazy loading)
     */
    public function reimbursements(Request $request, $id)
    {
        try {
            $reimbursements = $this->getUserReimbursements($id, $request);
            
            return response()->json([
                'success' => true,
                'data' => $reimbursements
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nel recupero rimborsi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/users/{id}/activity-timeline
     * Timeline attività utente (spese + rimborsi)
     */
    public function activityTimeline(Request $request, $id)
    {
        try {
            $limit = $request->get('limit', 20);

            // Unisci spese e rimborsi in una timeline
            $expenses = UscitaCocchi::where('team_member_id', $id)
                ->select('id', 'title', 'amount', 'payment_date as date', 'status', 'category', DB::raw("'expense' as type"))
                ->get();

            $reimbursements = ExpenseReimbursementRequest::where('user_id', $id)
                ->select('id', 'title', 'amount', 'expense_date as date', 'status', 'category', DB::raw("'reimbursement' as type"))
                ->get();

            $timeline = $expenses->concat($reimbursements)
                ->sortByDesc('date')
                ->take($limit)
                ->values();

            return response()->json([
                'success' => true,
                'data' => $timeline
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nel recupero timeline: ' . $e->getMessage()
            ], 500);
        }
    }
}

