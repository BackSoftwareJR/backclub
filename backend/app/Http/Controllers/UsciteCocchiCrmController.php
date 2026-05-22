<?php

namespace App\Http\Controllers;

use App\Models\UscitaCocchi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UsciteCocchiCrmController extends Controller
{
    /**
     * GET /api/uscite-cocchi/crm
     * Lista tutti i CRM con totali spese (TUTTI I CRM dalla tabella crm_departments)
     */
    public function index()
    {
        try {
            // Get ALL CRM departments from crm_departments table
            $crmDepartments = DB::table('crm_departments')
                ->where('is_active', 1)
                ->orderBy('code')
                ->get();

            $crmData = $crmDepartments->map(function ($crm) {
                $code = $crm->code;
                
                // Aggregate data from uscite_cocchi
                $total = UscitaCocchi::where('crm_code', $code)->sum('amount');
                $pending = UscitaCocchi::where('crm_code', $code)
                    ->where('status', 'pending')
                    ->sum('amount');
                $paid = UscitaCocchi::where('crm_code', $code)
                    ->where('status', 'paid')
                    ->sum('amount');
                $count = UscitaCocchi::where('crm_code', $code)->count();
                
                // Next payment date
                $nextPayment = UscitaCocchi::where('crm_code', $code)
                    ->where('status', 'pending')
                    ->whereNotNull('payment_date')
                    ->orderBy('payment_date', 'asc')
                    ->first();

                return [
                    'code' => $code,
                    'name' => $crm->name,
                    'description' => $crm->description ?? null,
                    'color' => $crm->color ?? '#0A84FF',
                    'icon' => $crm->icon ?? 'Briefcase',
                    'total_amount' => (float)$total,
                    'pending_amount' => (float)$pending,
                    'paid_amount' => (float)$paid,
                    'count' => $count,
                    'next_payment_date' => $nextPayment ? $nextPayment->payment_date : null,
                    'next_payment_amount' => $nextPayment ? (float)$nextPayment->amount : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $crmData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nel recupero dati CRM: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/crm/{code}
     * Dettaglio CRM con statistiche
     */
    public function show($code)
    {
        try {
            // Get CRM from crm_departments first
            $crm = DB::table('crm_departments')->where('code', $code)->first();
            if (!$crm) {
                return response()->json(['success' => false, 'message' => 'CRM non trovato'], 404);
            }

            $total = UscitaCocchi::where('crm_code', $code)->sum('amount');
            $pending = UscitaCocchi::where('crm_code', $code)->where('status', 'pending')->sum('amount');
            $paid = UscitaCocchi::where('crm_code', $code)->where('status', 'paid')->sum('amount');
            $count = UscitaCocchi::where('crm_code', $code)->count();
            
            $recurring = UscitaCocchi::where('crm_code', $code)
                ->where('is_recurring', true)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'code' => $code,
                    'name' => $crm->name,
                    'description' => $crm->description,
                    'color' => $crm->color,
                    'icon' => $crm->icon,
                    'total_amount' => (float)$total,
                    'pending_amount' => (float)$pending,
                    'paid_amount' => (float)$paid,
                    'count' => $count,
                    'recurring_count' => $recurring,
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
     * GET /api/uscite-cocchi/crm/{code}/payments
     * Lista pagamenti con filtri
     */
    public function getPayments($code, Request $request)
    {
        try {
            $query = UscitaCocchi::where('crm_code', $code)
                ->with(['user', 'serbatoio']);

            // Filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('date_from')) {
                $query->where('payment_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('payment_date', '<=', $request->date_to);
            }

            if ($request->has('is_recurring')) {
                $query->where('is_recurring', $request->is_recurring);
            }

            $uscite = $query->orderBy('payment_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $uscite,
                'total' => $uscite->sum('amount'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/crm/{code}/calendar
     * Eventi per calendario
     */
    public function getCalendarEvents($code, Request $request)
    {
        try {
            $query = UscitaCocchi::where('crm_code', $code);

            if ($request->has('start')) {
                $query->where('payment_date', '>=', $request->start);
            }

            if ($request->has('end')) {
                $query->where('payment_date', '<=', $request->end);
            }

            $uscite = $query->get();

            $events = $uscite->map(function ($uscita) {
                return [
                    'id' => $uscita->id,
                    'title' => $uscita->description . ' - €' . number_format($uscita->amount, 2),
                    'start' => $uscita->payment_date,
                    'end' => $uscita->payment_date,
                    'amount' => $uscita->amount,
                    'status' => $uscita->status,
                    'type' => $uscita->type,
                    'backgroundColor' => $this->getEventColor($uscita->status),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $events,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/crm/{code}/upcoming
     * Prossime scadenze
     */
    public function getUpcoming($code)
    {
        try {
            $upcoming = UscitaCocchi::where('crm_code', $code)
                ->where('status', 'pending')
                ->where('payment_date', '>=', now())
                ->orderBy('payment_date', 'asc')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $upcoming,
                'total' => $upcoming->sum('amount'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/crm/{code}/projects
     * Lista progetti CRM con budget e team
     */
    public function getProjects($code)
    {
        try {
            // Get CRM department
            $crm = DB::table('crm_departments')->where('code', $code)->first();
            if (!$crm) {
                return response()->json(['success' => false, 'message' => 'CRM non trovato'], 404);
            }

            $projects = DB::table('projects')
                ->where('crm_department_id', $crm->id)
                ->leftJoin('project_types', 'projects.project_type_id', '=', 'project_types.id')
                ->leftJoin('clients', 'projects.client_id', '=', 'clients.id')
                ->select(
                    'projects.id',
                    'projects.name',
                    'projects.description',
                    'projects.status',
                    'projects.budget_allocated',
                    'projects.budget_spent',
                    'projects.start_date',
                    'projects.end_date',
                    'project_types.name as project_type',
                    'project_types.icon',
                    'project_types.color',
                    'clients.name as client_name'
                )
                ->get()
                ->map(function($project) {
                    // Get team size
                    $teamCount = DB::table('project_team_members')
                        ->where('project_id', $project->id)
                        ->where('is_active', 1)
                        ->count();

                    // Get expenses total
                    $expensesTotal = DB::table('project_purchases')
                        ->where('project_id', $project->id)
                        ->sum('amount');

                    return [
                        'id' => $project->id,
                        'name' => $project->name,
                        'description' => $project->description,
                        'status' => $project->status,
                        'budget_allocated' => (float)$project->budget_allocated,
                        'budget_spent' => (float)$project->budget_spent,
                        'expenses_total' => (float)$expensesTotal,
                        'start_date' => $project->start_date,
                        'end_date' => $project->end_date,
                        'project_type' => $project->project_type,
                        'icon' => $project->icon,
                        'color' => $project->color,
                        'client_name' => $project->client_name,
                        'team_count' => $teamCount,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $projects,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/crm/{code}/team
     * Team members con ruoli per progetto
     */
    public function getTeam($code)
    {
        try {
            $crm = DB::table('crm_departments')->where('code', $code)->first();
            if (!$crm) {
                return response()->json(['success' => false, 'message' => 'CRM non trovato'], 404);
            }

            // Get all users in CRM projects
            $teamMembers = DB::table('project_team_members')
                ->join('users', 'project_team_members.user_id', '=', 'users.id')
                ->join('projects', 'project_team_members.project_id', '=', 'projects.id')
                ->where('projects.crm_department_id', $crm->id)
                ->where('project_team_members.is_active', 1)
                ->select(
                    'users.id as user_id',
                    'users.name',
                    'users.email',
                    'users.role as user_role',
                    'project_team_members.role as project_role',
                    'project_team_members.payment_type',
                    'project_team_members.payment_amount',
                    'projects.id as project_id',
                    'projects.name as project_name'
                )
                ->get()
                ->groupBy('user_id')
                ->map(function($userProjects) {
                    $user = $userProjects->first();
                    return [
                        'user_id' => $user->user_id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->user_role,
                        'projects' => $userProjects->map(function($p) {
                            return [
                                'project_id' => $p->project_id,
                                'project_name' => $p->project_name,
                                'role' => $p->project_role,
                                'payment_type' => $p->payment_type,
                                'payment_amount' => (float)$p->payment_amount,
                            ];
                        })->values(),
                        'projects_count' => $userProjects->count(),
                    ];
                })->values();

            return response()->json([
                'success' => true,
                'data' => $teamMembers,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/crm/{code}/expenses/aggregated
     * Spese aggregate per il CRM
     */
    public function getExpensesAggregated($code)
    {
        try {
            $crm = DB::table('crm_departments')->where('code', $code)->first();
            if (!$crm) {
                return response()->json(['success' => false, 'message' => 'CRM non trovato'], 404);
            }

            // Total expenses
            $total = DB::table('project_purchases')
                ->join('projects', 'project_purchases.project_id', '=', 'projects.id')
                ->where('projects.crm_department_id', $crm->id)
                ->sum('project_purchases.amount');

            // By category
            $byCategory = DB::table('project_purchases')
                ->join('projects', 'project_purchases.project_id', '=', 'projects.id')
                ->where('projects.crm_department_id', $crm->id)
                ->select(
                    'project_purchases.category',
                    DB::raw('SUM(project_purchases.amount) as total'),
                    DB::raw('COUNT(*) as count')
                )
                ->groupBy('project_purchases.category')
                ->get();

            // By month (last 6 months)
            $byMonth = DB::table('project_purchases')
                ->join('projects', 'project_purchases.project_id', '=', 'projects.id')
                ->where('projects.crm_department_id', $crm->id)
                ->where('project_purchases.purchase_date', '>=', now()->subMonths(6))
                ->select(
                    DB::raw('DATE_FORMAT(project_purchases.purchase_date, "%Y-%m") as month'),
                    DB::raw('SUM(project_purchases.amount) as total')
                )
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'total' => (float)$total,
                    'by_category' => $byCategory,
                    'by_month' => $byMonth,
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
     * GET /api/uscite-cocchi/crm/{code}/expenses/by-project
     * Spese divise per progetto
     */
    public function getExpensesByProject($code)
    {
        try {
            $crm = DB::table('crm_departments')->where('code', $code)->first();
            if (!$crm) {
                return response()->json(['success' => false, 'message' => 'CRM non trovato'], 404);
            }

            $projectExpenses = DB::table('projects')
                ->where('crm_department_id', $crm->id)
                ->select('projects.id', 'projects.name')
                ->get()
                ->map(function($project) {
                    $expenses = DB::table('project_purchases')
                        ->where('project_id', $project->id)
                        ->leftJoin('users', 'project_purchases.created_by', '=', 'users.id')
                        ->select(
                            'project_purchases.*',
                            'users.name as created_by_name'
                        )
                        ->orderBy('project_purchases.purchase_date', 'desc')
                        ->get();

                    return [
                        'project_id' => $project->id,
                        'project_name' => $project->name,
                        'total' => $expenses->sum('amount'),
                        'count' => $expenses->count(),
                        'expenses' => $expenses,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $projectExpenses,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Helper methods - NON PIÙ NECESSARIO con crm_departments
    private function getEventColor($status)
    {
        return match($status) {
            'paid' => '#34C759',
            'pending' => '#0A84FF',
            'cancelled' => '#FF453A',
            default => '#8E8E93',
        };
    }
}

