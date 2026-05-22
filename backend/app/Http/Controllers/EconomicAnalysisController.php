<?php

namespace App\Http\Controllers;

use App\Models\CrmEconomicAnalysis;
use App\Models\CrmDepartment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EconomicAnalysisController extends Controller
{
    /**
     * GET /api/budget/analytics/crm/{code}
     * Analytics CRM per periodo
     */
    public function getCrmAnalytics($code, Request $request)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $periodType = $request->input('period_type', 'monthly');
        $year = $request->input('year', now()->year);
        $month = $request->input('month');
        $quarter = $request->input('quarter');

        $query = CrmEconomicAnalysis::where('crm_department_id', $department->id)
            ->where('period_type', $periodType)
            ->where('period_year', $year);

        if ($month) {
            $query->where('period_month', $month);
        }

        if ($quarter) {
            $query->where('period_quarter', $quarter);
        }

        $analytics = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * POST /api/budget/analytics
     * Crea nuovo record analytics
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'crm_department_id' => 'required|exists:crm_departments,id',
            'period_type' => 'required|in:monthly,quarterly,yearly',
            'period_year' => 'required|integer|min:2020|max:2100',
            'period_month' => 'required_if:period_type,monthly|nullable|integer|min:1|max:12',
            'period_quarter' => 'required_if:period_type,quarterly|nullable|integer|min:1|max:4',
            'revenue_generated' => 'required|numeric|min:0',
            'budget_used' => 'required|numeric|min:0',
            'projects_completed' => 'nullable|integer|min:0',
            'team_size' => 'nullable|integer|min:0',
            'client_satisfaction' => 'nullable|numeric|min:0|max:5',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $analysis = CrmEconomicAnalysis::create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Analisi economica creata',
            'data' => $analysis->load('crmDepartment'),
        ], 201);
    }

    /**
     * PUT /api/budget/analytics/{id}
     * Aggiorna analisi
     */
    public function update(Request $request, $id)
    {
        $analysis = CrmEconomicAnalysis::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'revenue_generated' => 'sometimes|numeric|min:0',
            'budget_used' => 'sometimes|numeric|min:0',
            'projects_completed' => 'sometimes|integer|min:0',
            'team_size' => 'sometimes|integer|min:0',
            'client_satisfaction' => 'sometimes|numeric|min:0|max:5',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $analysis->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Analisi aggiornata',
            'data' => $analysis->fresh('crmDepartment'),
        ]);
    }

    /**
     * DELETE /api/budget/analytics/{id}
     * Elimina analisi
     */
    public function delete($id)
    {
        $analysis = CrmEconomicAnalysis::findOrFail($id);
        $analysis->delete();

        return response()->json([
            'success' => true,
            'message' => 'Analisi eliminata',
        ]);
    }

    /**
     * GET /api/budget/analytics/summary
     * Summary globale tutti i CRM
     */
    public function globalSummary(Request $request)
    {
        $year = $request->input('year', now()->year);

        $allAnalytics = CrmEconomicAnalysis::where('period_year', $year)
            ->with('crmDepartment')
            ->get();

        $summary = [
            'total_revenue' => $allAnalytics->sum('revenue_generated'),
            'total_budget_used' => $allAnalytics->sum('budget_used'),
            'total_profit_loss' => $allAnalytics->sum('profit_loss'),
            'total_projects' => $allAnalytics->sum('projects_completed'),
            'avg_satisfaction' => round($allAnalytics->avg('client_satisfaction'), 2),
            'by_crm' => $allAnalytics->groupBy('crm_department_id')->map(function ($group) {
                return [
                    'crm' => $group->first()->crmDepartment,
                    'revenue' => $group->sum('revenue_generated'),
                    'budget_used' => $group->sum('budget_used'),
                    'profit_loss' => $group->sum('profit_loss'),
                    'projects' => $group->sum('projects_completed'),
                ];
            })->values(),
        ];

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }
}
