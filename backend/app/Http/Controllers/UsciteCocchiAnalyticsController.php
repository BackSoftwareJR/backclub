<?php

namespace App\Http\Controllers;

use App\Models\UsciteCocchi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class UsciteCocchiAnalyticsController extends Controller
{
    /**
     * GET /api/uscite-cocchi/analytics/kpi
     * KPI cards data
     */
    public function getKPI(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
            $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

            $query = UsciteCocchi::whereBetween('payment_date', [$startDate, $endDate]);

            $totalAmount = $query->sum('amount');
            $count = $query->count();
            $avgAmount = $count > 0 ? $totalAmount / $count : 0;

            // Trend calculation (compare with previous period)
            $periodDays = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate));
            $prevStart = Carbon::parse($startDate)->subDays($periodDays);
            $prevEnd = Carbon::parse($startDate)->subDay();

            $prevTotal = UsciteCocchi::whereBetween('payment_date', [$prevStart, $prevEnd])->sum('amount');
            $trend = $prevTotal > 0 ? (($totalAmount - $prevTotal) / $prevTotal) * 100 : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'total_amount' => round($totalAmount, 2),
                    'average_amount' => round($avgAmount, 2),
                    'count' => $count,
                    'trend_percentage' => round($trend, 1),
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
     * GET /api/uscite-cocchi/analytics/charts
     * Dati per grafici
     */
    public function getCharts(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->subMonths(3));
            $endDate = $request->get('end_date', Carbon::now());
            $groupBy = $request->get('group_by', 'month'); // day, week, month

            // Line chart: expenses over time
            $timeSeriesQuery = UsciteCocchi::select(
                    DB::raw($this->getDateGrouping($groupBy) . ' as period'),
                    DB::raw('SUM(amount) as total'),
                    DB::raw('COUNT(*) as count')
                )
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->groupBy('period')
                ->orderBy('period')
                ->get();

            // Pie chart: by type
            $byType = UsciteCocchi::select('type', DB::raw('SUM(amount) as total'))
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->groupBy('type')
                ->get();

            // Bar chart: by CRM
            $byCrm = UsciteCocchi::select('crm_code', DB::raw('SUM(amount) as total'))
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->whereNotNull('crm_code')
                ->groupBy('crm_code')
                ->orderBy('total', 'desc')
                ->limit(10)
                ->get();

            // Bar chart: by User
            $byUser = UsciteCocchi::select('user_id', DB::raw('SUM(amount) as total'))
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->whereNotNull('user_id')
                ->groupBy('user_id')
                ->orderBy('total', 'desc')
                ->limit(10)
                ->with('user:id,name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'line_chart' => $timeSeriesQuery,
                    'pie_chart' => $byType,
                    'bar_chart_crm' => $byCrm,
                    'bar_chart_user' => $byUser,
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
     * GET /api/uscite-cocchi/analytics/trends
     * Trend analysis
     */
    public function getTrends(Request $request)
    {
        try {
            $weeks = $request->get('weeks', 4);
            $trends = [];

            for ($i = 0; $i < $weeks; $i++) {
                $weekStart = Carbon::now()->subWeeks($i)->startOfWeek();
                $weekEnd = Carbon::now()->subWeeks($i)->endOfWeek();

                $total = UsciteCocchi::whereBetween('payment_date', [$weekStart, $weekEnd])->sum('amount');
                $count = UsciteCocchi::whereBetween('payment_date', [$weekStart, $weekEnd])->count();

                $trends[] = [
                    'week' => "W" . $weekStart->weekOfYear,
                    'start_date' => $weekStart->format('Y-m-d'),
                    'total' => round($total, 2),
                    'count' => $count,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => array_reverse($trends),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/analytics/breakdown
     * Breakdown tables
     */
    public function getBreakdown(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
            $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

            // Top CRMs
            $topCrms = UsciteCocchi::select('crm_code', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->whereNotNull('crm_code')
                ->groupBy('crm_code')
                ->orderBy('total', 'desc')
                ->limit(10)
                ->get();

            // Top Users
            $topUsers = UsciteCocchi::select('user_id', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->whereNotNull('user_id')
                ->groupBy('user_id')
                ->orderBy('total', 'desc')
                ->limit(10)
                ->with('user:id,name')
                ->get();

            // Top Types
            $topTypes = UsciteCocchi::select('type', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->groupBy('type')
                ->orderBy('total', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'top_crms' => $topCrms,
                    'top_users' => $topUsers,
                    'top_types' => $topTypes,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Helper: get date grouping SQL
    private function getDateGrouping($type)
    {
        return match($type) {
            'day' => "DATE(payment_date)",
            'week' => "YEARWEEK(payment_date)",
            'month' => "DATE_FORMAT(payment_date, '%Y-%m')",
            'year' => "YEAR(payment_date)",
            default => "DATE_FORMAT(payment_date, '%Y-%m')",
        };
    }
}
