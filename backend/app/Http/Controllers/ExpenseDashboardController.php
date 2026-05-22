<?php

namespace App\Http\Controllers;

use App\Models\UscitaCocchi;
use App\Models\ExpenseReimbursementRequest;
use App\Models\SubscriptionPlan;
use App\Models\PaymentMethod;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExpenseDashboardController extends Controller
{
    /**
     * GET /api/expense-dashboard/overview
     * Dashboard overview completo
     */
    public function overview(Request $request)
    {
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        $data = [
            'kpis' => $this->getKPIs($startDate, $endDate),
            'expenses_by_crm' => $this->getExpensesByCRM(),
            'administrative_expenses' => $this->getAdministrativeExpenses(),
            'upcoming_payments' => $this->getUpcomingPayments(30),
            'pending_reimbursements' => $this->getPendingReimbursements(),
            'subscriptions_expiring' => $this->getSubscriptionsExpiring(30),
            'recent_expenses' => $this->getRecentExpenses(10),
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * GET /api/expense-dashboard/kpis
     * KPI cards principali
     */
    public function kpis(Request $request)
    {
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        $kpis = $this->getKPIs($startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $kpis,
        ]);
    }

    /**
     * GET /api/expense-dashboard/crm-boxes
     * Box CRM per dashboard
     */
    public function crmBoxes()
    {
        $data = $this->getExpensesByCRM();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * GET /api/expense-dashboard/upcoming-payments
     * Pagamenti imminenti timeline
     */
    public function upcomingPayments(Request $request)
    {
        $days = $request->get('days', 30);
        $payments = $this->getUpcomingPayments($days);

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }

    /**
     * GET /api/expense-dashboard/trends
     * Trend spese per grafici
     */
    public function trends(Request $request)
    {
        $months = $request->get('months', 12);
        
        $trends = UscitaCocchi::selectRaw('
                DATE_FORMAT(payment_date, "%Y-%m") as month,
                SUM(amount) as total,
                COUNT(*) as count,
                AVG(amount) as avg_amount
            ')
            ->where('payment_date', '>=', now()->subMonths($months))
            ->where('deleted_at', null)
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $trends,
        ]);
    }

    /**
     * GET /api/expense-dashboard/by-category
     * Distribuzione per categoria
     */
    public function byCategory(Request $request)
    {
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        $byCategory = UscitaCocchi::selectRaw('
                category,
                SUM(amount) as total,
                COUNT(*) as count,
                AVG(amount) as avg_amount
            ')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->whereNotNull('category')
            ->where('deleted_at', null)
            ->groupBy('category')
            ->orderBy('total', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $byCategory,
        ]);
    }

    /**
     * GET /api/expense-dashboard/by-payment-method
     * Distribuzione per metodo pagamento
     */
    public function byPaymentMethod(Request $request)
    {
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        $byMethod = UscitaCocchi::selectRaw('
                type as payment_method,
                SUM(amount) as total,
                COUNT(*) as count
            ')
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->where('deleted_at', null)
            ->groupBy('type')
            ->orderBy('total', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $byMethod,
        ]);
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    private function getKPIs(string $startDate, string $endDate): array
    {
        $currentPeriod = UscitaCocchi::whereBetween('payment_date', [$startDate, $endDate])
            ->where('deleted_at', null);

        // Previous period per calcolare trend
        $periodDays = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate));
        $prevStart = Carbon::parse($startDate)->subDays($periodDays)->toDateString();
        $prevEnd = Carbon::parse($startDate)->subDay()->toDateString();
        
        $previousPeriod = UscitaCocchi::whereBetween('payment_date', [$prevStart, $prevEnd])
            ->where('deleted_at', null);

        $currentTotal = $currentPeriod->sum('amount');
        $previousTotal = $previousPeriod->sum('amount');
        $trend = $previousTotal > 0 ? (($currentTotal - $previousTotal) / $previousTotal) * 100 : 0;

        return [
            'total_expenses' => (float)$currentTotal,
            'total_count' => $currentPeriod->count(),
            'average_expense' => $currentPeriod->count() > 0 ? $currentTotal / $currentPeriod->count() : 0,
            'trend_percentage' => round($trend, 1),
            'pending_amount' => (float)UscitaCocchi::where('status', 'pending')->sum('amount'),
            'pending_count' => UscitaCocchi::where('status', 'pending')->count(),
            'overdue_count' => UscitaCocchi::overdue()->count(),
            'overdue_amount' => (float)UscitaCocchi::overdue()->sum('amount'),
            'reimbursements_pending' => ExpenseReimbursementRequest::pending()->count(),
            'reimbursements_amount' => (float)ExpenseReimbursementRequest::pending()->sum('amount'),
            'subscriptions_active' => SubscriptionPlan::active()->count(),
            'subscriptions_monthly_cost' => (float)SubscriptionPlan::active()->sum('monthly_amount'),
        ];
    }

    private function getExpensesByCRM(): array
    {
        $crmExpenses = UscitaCocchi::selectRaw('
                crm_code,
                COUNT(*) as total_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN status = "paid" THEN amount ELSE 0 END) as paid_amount,
                SUM(CASE WHEN status = "pending" THEN amount ELSE 0 END) as pending_amount,
                COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_count,
                MIN(CASE WHEN status = "pending" THEN payment_date END) as next_payment_date,
                MIN(CASE WHEN status = "pending" THEN amount END) as next_payment_amount
            ')
            ->whereNotNull('crm_code')
            ->where('deleted_at', null)
            ->groupBy('crm_code')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($crm) {
                return [
                    'code' => $crm->crm_code,
                    'name' => $this->getCrmName($crm->crm_code),
                    'total_amount' => (float)$crm->total_amount,
                    'paid_amount' => (float)$crm->paid_amount,
                    'pending_amount' => (float)$crm->pending_amount,
                    'total_count' => $crm->total_count,
                    'pending_count' => $crm->pending_count,
                    'next_payment_date' => $crm->next_payment_date,
                    'next_payment_amount' => $crm->next_payment_amount ? (float)$crm->next_payment_amount : null,
                    'color' => $this->getCrmColor($crm->crm_code),
                ];
            });

        return $crmExpenses->toArray();
    }

    private function getAdministrativeExpenses(): array
    {
        $adminExpenses = UscitaCocchi::whereNull('crm_code')
            ->where('deleted_at', null)
            ->selectRaw('
                COUNT(*) as total_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN status = "paid" THEN amount ELSE 0 END) as paid_amount,
                SUM(CASE WHEN status = "pending" THEN amount ELSE 0 END) as pending_amount,
                COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_count
            ')
            ->first();

        return [
            'total_amount' => (float)($adminExpenses->total_amount ?? 0),
            'paid_amount' => (float)($adminExpenses->paid_amount ?? 0),
            'pending_amount' => (float)($adminExpenses->pending_amount ?? 0),
            'total_count' => $adminExpenses->total_count ?? 0,
            'pending_count' => $adminExpenses->pending_count ?? 0,
        ];
    }

    private function getUpcomingPayments(int $days): array
    {
        $payments = UscitaCocchi::with(['teamMember', 'project', 'serbatoio'])
            ->where('status', 'pending')
            ->where('payment_date', '>=', now())
            ->where('payment_date', '<=', now()->addDays($days))
            ->orderBy('payment_date', 'asc')
            ->limit(50)
            ->get();

        return $payments->toArray();
    }

    private function getPendingReimbursements(): array
    {
        $reimbursements = ExpenseReimbursementRequest::with(['user'])
            ->pending()
            ->orderBy('requested_at', 'asc')
            ->limit(20)
            ->get();

        return $reimbursements->toArray();
    }

    private function getSubscriptionsExpiring(int $days): array
    {
        $subscriptions = SubscriptionPlan::with(['uscita'])
            ->active()
            ->expiringSoon($days)
            ->orderBy('renewal_date', 'asc')
            ->get();

        return $subscriptions->toArray();
    }

    private function getRecentExpenses(int $limit): array
    {
        $expenses = UscitaCocchi::with(['teamMember', 'creator'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return $expenses->toArray();
    }

    private function getCrmName(string $code): string
    {
        $names = [
            'CASA_FAMIGLIA' => 'Casa Famiglia',
            'SITI_WEB' => 'Siti Web',
            'CRM_PM' => 'CRM Project Management',
            'GESTIONE_CLIENTI' => 'Gestione Clienti',
            'CRM_GESTIONALI' => 'CRM Gestionali',
            'DIGITALIZZAZIONE' => 'Digitalizzazione',
            'RISORSE_UMANE' => 'Risorse Umane',
            'VIDEO_GRAFICA' => 'Video e Grafica',
            'SMART_WORKING' => 'Smart Working',
            'ADS_CENTER' => 'Ads Center',
            'SEGRETERIA' => 'Segreteria',
        ];

        return $names[$code] ?? $code;
    }

    private function getCrmColor(string $code): string
    {
        $colors = [
            'CASA_FAMIGLIA' => '#FF6B6B',
            'SITI_WEB' => '#4ECDC4',
            'CRM_PM' => '#45B7D1',
            'GESTIONE_CLIENTI' => '#96CEB4',
            'CRM_GESTIONALI' => '#FFEAA7',
            'DIGITALIZZAZIONE' => '#DFE6E9',
            'RISORSE_UMANE' => '#74B9FF',
            'VIDEO_GRAFICA' => '#A29BFE',
            'SMART_WORKING' => '#FD79A8',
            'ADS_CENTER' => '#FDCB6E',
            'SEGRETERIA' => '#55EFC4',
        ];

        return $colors[$code] ?? '#0A84FF';
    }
}

