<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Project;
use App\Models\CrmProject;
use App\Models\FinancialTransaction;
use App\Models\MasterAnalytic;
use App\Models\Task;
use App\Models\Client;
use App\Models\User;
use Carbon\Carbon;

class MasterController extends Controller
{
    /**
     * Middleware: solo admin e project_master possono accedere
     */
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $user = Auth::user();
            if (!$user || !$user->canAccessMaster()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            return $next($request);
        });
    }

    /**
     * Dashboard principale Master
     */
    public function dashboard(Request $request)
    {
        $period = $request->get('period', 'month'); // day, week, month, year
        
        $data = [
            'overview' => $this->getOverview($period),
            'financial' => $this->getFinancialSummary($period),
            'projects' => $this->getProjectsSummary(),
            'crm_status' => $this->getCrmStatus(),
            'recent_activity' => $this->getRecentActivity(),
            'analytics' => $this->getAnalytics($period),
        ];

        return response()->json($data);
    }

    /**
     * Overview generale
     */
    private function getOverview(string $period): array
    {
        $dateRange = $this->getDateRange($period);
        
        return [
            'total_projects' => Project::count(),
            'active_projects' => Project::where('status', 'active')->count(),
            'total_tasks' => Task::count(),
            'completed_tasks' => Task::where('status', 'completed')->count(),
            'total_clients' => Client::count(),
            'active_clients' => Client::where('is_active', true)->count(),
            'total_users' => User::where('is_active', true)->count(),
            'new_this_period' => [
                'projects' => Project::whereBetween('created_at', $dateRange)->count(),
                'tasks' => Task::whereBetween('created_at', $dateRange)->count(),
                'clients' => Client::whereBetween('created_at', $dateRange)->count(),
            ],
        ];
    }

    /**
     * Riepilogo finanziario in cocchi
     */
    private function getFinancialSummary(string $period): array
    {
        $dateRange = $this->getDateRange($period);
        
        $entrate = FinancialTransaction::where('type', 'entrata')
            ->whereBetween('transaction_date', $dateRange)
            ->sum('amount_cocchi');
        
        $uscite = FinancialTransaction::where('type', 'uscita')
            ->whereBetween('transaction_date', $dateRange)
            ->sum('amount_cocchi');
        
        $budget_totale = Project::sum('budget_cocchi') ?? 0;
        $speso_totale = Project::sum('spent_cocchi') ?? 0;
        
        return [
            'entrate_periodo' => (float) $entrate,
            'uscite_periodo' => (float) $uscite,
            'saldo_periodo' => (float) ($entrate - $uscite),
            'budget_totale' => (float) $budget_totale,
            'speso_totale' => (float) $speso_totale,
            'disponibile' => (float) ($budget_totale - $speso_totale),
        ];
    }

    /**
     * Riepilogo progetti
     */
    private function getProjectsSummary(): array
    {
        return [
            'by_status' => Project::select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status'),
            'by_priority' => Project::select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')
                ->get()
                ->pluck('count', 'priority'),
            'overdue' => Project::where('end_date', '<', now())
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->count(),
        ];
    }

    /**
     * Stato CRM (sotto-CRM)
     */
    private function getCrmStatus(): array
    {
        $crms = CrmProject::with(['client', 'manager', 'projects'])
            ->get()
            ->map(function ($crm) {
                return [
                    'id' => $crm->id,
                    'name' => $crm->name,
                    'status' => $crm->status,
                    'client' => $crm->client?->company_name,
                    'manager' => $crm->manager?->name,
                    'projects_count' => $crm->projects->count(),
                    'budget_cocchi' => (float) $crm->budget_cocchi,
                    'spent_cocchi' => (float) $crm->spent_cocchi,
                    'progress' => $crm->budget_cocchi > 0 
                        ? (float) (($crm->spent_cocchi / $crm->budget_cocchi) * 100)
                        : 0,
                ];
            });

        return [
            'total' => CrmProject::count(),
            'active' => CrmProject::where('status', 'active')->count(),
            'list' => $crms,
        ];
    }

    /**
     * Attività recenti
     */
    private function getRecentActivity(): array
    {
        $activities = [];
        
        // Ultimi progetti creati
        $recentProjects = Project::with('client', 'manager')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();
        
        foreach ($recentProjects as $project) {
            $activities[] = [
                'type' => 'project_created',
                'title' => "Nuovo progetto: {$project->name}",
                'description' => "Cliente: {$project->client?->company_name}",
                'user' => $project->manager?->name,
                'time' => $project->created_at->diffForHumans(),
                'created_at' => $project->created_at,
            ];
        }
        
        // Ultime transazioni finanziarie
        $recentTransactions = FinancialTransaction::with('user', 'project', 'client')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();
        
        foreach ($recentTransactions as $transaction) {
            $activities[] = [
                'type' => 'financial_transaction',
                'title' => ucfirst($transaction->type) . " di " . number_format($transaction->amount_cocchi, 2) . " cocchi",
                'description' => $transaction->description,
                'user' => $transaction->user?->name,
                'time' => $transaction->created_at->diffForHumans(),
                'created_at' => $transaction->created_at,
            ];
        }
        
        // Ordina per data e prendi le ultime 10
        usort($activities, function($a, $b) {
            return $b['created_at'] <=> $a['created_at'];
        });
        
        return array_slice($activities, 0, 10);
    }

    /**
     * Analytics aggregati
     */
    private function getAnalytics(string $period): array
    {
        $dateRange = $this->getDateRange($period);
        
        // Analytics esistenti
        $analytics = MasterAnalytic::whereBetween('period_date', $dateRange)
            ->get()
            ->groupBy('metric_name')
            ->map(function ($group) {
                return [
                    'total' => $group->sum('metric_value'),
                    'average' => $group->avg('metric_value'),
                    'count' => $group->count(),
                ];
            });
        
        return [
            'stored' => $analytics,
            'calculated' => [
                'tasks_completion_rate' => $this->calculateTasksCompletionRate(),
                'projects_on_time' => $this->calculateProjectsOnTime(),
                'average_project_duration' => $this->calculateAverageProjectDuration(),
            ],
        ];
    }

    /**
     * Calcola tasso di completamento task
     */
    private function calculateTasksCompletionRate(): float
    {
        $total = Task::count();
        if ($total === 0) return 0;
        
        $completed = Task::where('status', 'completed')->count();
        return round(($completed / $total) * 100, 2);
    }

    /**
     * Calcola progetti in tempo
     */
    private function calculateProjectsOnTime(): float
    {
        $total = Project::whereNotNull('end_date')->count();
        if ($total === 0) return 0;
        
        $onTime = Project::whereNotNull('end_date')
            ->where('end_date', '>=', DB::raw('DATE(updated_at)'))
            ->where('status', 'completed')
            ->count();
        
        return round(($onTime / $total) * 100, 2);
    }

    /**
     * Calcola durata media progetti
     */
    private function calculateAverageProjectDuration(): int
    {
        $projects = Project::whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->where('status', 'completed')
            ->get();
        
        if ($projects->isEmpty()) return 0;
        
        $totalDays = $projects->sum(function ($project) {
            return Carbon::parse($project->start_date)
                ->diffInDays(Carbon::parse($project->end_date));
        });
        
        return round($totalDays / $projects->count());
    }

    /**
     * Ottieni range date in base al periodo
     */
    private function getDateRange(string $period): array
    {
        return match($period) {
            'day' => [now()->startOfDay(), now()->endOfDay()],
            'week' => [now()->startOfWeek(), now()->endOfWeek()],
            'month' => [now()->startOfMonth(), now()->endOfMonth()],
            'year' => [now()->startOfYear(), now()->endOfYear()],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };
    }

    /**
     * Lista tutti i sotto-CRM
     */
    public function crms()
    {
        $crms = CrmProject::with(['client', 'manager', 'projects'])
            ->get();
        
        return response()->json($crms);
    }

    /**
     * Crea nuovo sotto-CRM
     */
    public function createCrm(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'client_id' => 'nullable|exists:clients,id',
            'manager_id' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'budget_cocchi' => 'nullable|numeric|min:0',
        ]);

        $crm = CrmProject::create($validated);
        
        return response()->json($crm->load(['client', 'manager']), 201);
    }
}

