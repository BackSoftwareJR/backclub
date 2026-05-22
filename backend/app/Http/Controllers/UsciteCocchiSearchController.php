<?php

namespace App\Http\Controllers;

use App\Models\UsciteCocchi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UsciteCocchiSearchController extends Controller
{
    /**
     * GET /api/uscite-cocchi/search
     * Search uscite with filters
     */
    public function search(Request $request)
    {
        try {
            $query = UsciteCocchi::query();

            // Search by query string
            if ($request->has('q') && $request->q) {
                $query->where(function($q) use ($request) {
                    $q->where('title', 'like', '%' . $request->q . '%')
                      ->orWhere('description', 'like', '%' . $request->q . '%')
                      ->orWhere('paid_to', 'like', '%' . $request->q . '%');
                });
            }

            // Filter by CRM code
            if ($request->has('crm_code')) {
                $query->where('crm_code', $request->crm_code);
            }

            // Filter by team member
            if ($request->has('team_member_id')) {
                $query->where('team_member_id', $request->team_member_id);
            }

            // Filter by type
            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Date range filters
            if ($request->has('date_from')) {
                $query->where('payment_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('payment_date', '<=', $request->date_to);
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'payment_date');
            $sortDir = $request->input('sort_dir', 'desc');
            $query->orderBy($sortBy, $sortDir);

            // Pagination
            $perPage = $request->input('per_page', 20);
            $uscite = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $uscite->items(),
                'pagination' => [
                    'total' => $uscite->total(),
                    'per_page' => $uscite->perPage(),
                    'current_page' => $uscite->currentPage(),
                    'last_page' => $uscite->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nella ricerca: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/filters
     * Get available filter options
     */
    public function getFilters()
    {
        try {
            // CRM codes
            $crmCodes = UsciteCocchi::select('crm_code')
                ->whereNotNull('crm_code')
                ->distinct()
                ->pluck('crm_code')
                ->toArray();

            // Team members
            $users = DB::table('users')
                ->join('uscite_cocchi', 'users.id', '=', 'uscite_cocchi.team_member_id')
                ->select('users.id', 'users.name')
                ->distinct()
                ->get()
                ->toArray();

            // Types
            $types = UsciteCocchi::select('type')
                ->distinct()
                ->pluck('type')
                ->toArray();

            // Statuses
            $statuses = ['pending', 'paid', 'cancelled', 'refunded'];

            return response()->json([
                'success' => true,
                'data' => [
                    'crm_codes' => $crmCodes,
                    'users' => $users,
                    'types' => $types,
                    'statuses' => $statuses,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/quick-stats
     * Get quick summary statistics
     */
    public function getQuickStats()
    {
        try {
            $totalPending = UsciteCocchi::where('status', 'pending')->sum('amount');
            $totalPaid = UsciteCocchi::where('status', 'paid')->sum('amount');
            $countPending = UsciteCocchi::where('status', 'pending')->count();
            $countPaid = UsciteCocchi::where('status', 'paid')->count();
            $total = UsciteCocchi::sum('amount');
            $countTotal = UsciteCocchi::count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_pending' => (float)$totalPending,
                    'total_paid' => (float)$totalPaid,
                    'count_pending' => $countPending,
                    'count_paid' => $countPaid,
                    'total' => (float)$total,
                    'count_total' => $countTotal,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }
}
