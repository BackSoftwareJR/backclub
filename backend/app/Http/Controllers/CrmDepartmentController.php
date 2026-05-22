<?php

namespace App\Http\Controllers;

use App\Models\CrmDepartment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CrmDepartmentController extends Controller
{
    /**
     * GET /api/budget/crm
     * Lista tutti i CRM departments
     */
    public function index(Request $request)
    {
        $query = CrmDepartment::with(['manager', 'activeTeamMembers', 'activeExpenses']);

        if ($request->has('active_only') && $request->active_only) {
            $query->active();
        }

        $departments = $query->withStats()->orderBy('code')->get();

        return response()->json([
            'success' => true,
            'data' => $departments,
        ]);
    }

    /**
     * GET /api/budget/crm/{code}
     * Dettaglio singolo CRM
     */
    public function show($code)
    {
        $department = CrmDepartment::where('code', $code)
            ->with(['manager', 'teamMembers.user', 'expenses', 'economicAnalysis'])
            ->withStats()
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $department,
        ]);
    }

    /**
     * PUT /api/budget/crm/{code}/budget
     * Aggiorna budget allocato
     */
    public function updateBudget(Request $request, $code)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'budget_allocated' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $department->update([
            'budget_allocated' => $request->budget_allocated,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Budget aggiornato con successo',
            'data' => $department->fresh(),
        ]);
    }

    /**
     * GET /api/budget/crm/{code}/analytics
     * Analytics economiche CRM
     */
    public function getAnalytics($code, Request $request)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $period = $request->input('period', 'monthly');
        $year = $request->input('year', now()->year);

        $analytics = $department->economicAnalysis()
            ->where('period_type', $period)
            ->where('period_year', $year)
            ->latest()
            ->get();

        // Calculate totals
        $totalRevenue = $analytics->sum('revenue_generated');
        $totalBudget = $analytics->sum('budget_used');
        $totalProjects = $analytics->sum('projects_completed');
        $avgSatisfaction = $analytics->avg('client_satisfaction');

        return response()->json([
            'success' => true,
            'data' => [
                'analytics' => $analytics,
                'totals' => [
                    'revenue' => $totalRevenue,
                    'budget_used' => $totalBudget,
                    'profit_loss' => $totalRevenue - $totalBudget,
                    'projects' => $totalProjects,
                    'avg_satisfaction' => round($avgSatisfaction, 2),
                ],
            ],
        ]);
    }

    /**
     * POST /api/budget/crm
     * Crea nuovo CRM department
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:crm_departments,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'icon' => 'nullable|string|max:50',
            'budget_allocated' => 'nullable|numeric|min:0',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        
        // Set default values if not provided
        if (!isset($data['color']) || empty($data['color'])) {
            $data['color'] = '#0A84FF';
        }
        if (!isset($data['budget_allocated'])) {
            $data['budget_allocated'] = 0;
        }
        if (!isset($data['is_active'])) {
            $data['is_active'] = true;
        }

        $department = CrmDepartment::create($data);

        return response()->json([
            'success' => true,
            'message' => 'CRM department creato con successo',
            'data' => $department->fresh(['manager'])->loadCount(['teamMembers', 'activeExpenses', 'projects']),
        ], 201);
    }

    /**
     * PUT /api/budget/crm/{code}
     * Aggiorna info CRM
     */
    public function update(Request $request, $code)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'color' => 'sometimes|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'icon' => 'nullable|string|max:50',
            'budget_allocated' => 'nullable|numeric|min:0',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $department->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'CRM aggiornato con successo',
            'data' => $department->fresh(['manager'])->loadCount(['teamMembers', 'activeExpenses', 'projects']),
        ]);
    }
}
