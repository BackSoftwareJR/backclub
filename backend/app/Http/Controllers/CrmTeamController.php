<?php

namespace App\Http\Controllers;

use App\Models\CrmTeamMember;
use App\Models\CrmDepartment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CrmTeamController extends Controller
{
    /**
     * GET /api/budget/crm/{code}/team
     * Membri team CRM
     */
    public function getTeam($code)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $team = CrmTeamMember::where('crm_department_id', $department->id)
            ->with(['user', 'crmDepartment'])
            ->orderBy('is_active', 'desc')
            ->orderBy('cocchi_budget', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $team,
        ]);
    }

    /**
     * POST /api/budget/crm/{code}/team
     * Aggiungi membro al team
     */
    public function addMember(Request $request, $code)
    {
        $department = CrmDepartment::where('code', $code)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id|unique:crm_team_members,user_id,NULL,id,crm_department_id,' . $department->id,
            'role' => 'nullable|string|max:100',
            'allocation_percentage' => 'required|numeric|min:0|max:100',
            'cocchi_budget' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $member = CrmTeamMember::create([
            'crm_department_id' => $department->id,
            'user_id' => $request->user_id,
            'role' => $request->role,
            'allocation_percentage' => $request->allocation_percentage,
            'cocchi_budget' => $request->cocchi_budget,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Membro aggiunto al team',
            'data' => $member->load(['user', 'crmDepartment']),
        ], 201);
    }

    /**
     * PUT /api/budget/crm/team/{id}
     * Aggiorna allocazione membro
     */
    public function updateAllocation(Request $request, $id)
    {
        $member = CrmTeamMember::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'role' => 'nullable|string|max:100',
            'allocation_percentage' => 'sometimes|numeric|min:0|max:100',
            'cocchi_budget' => 'sometimes|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $member->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Allocazione aggiornata',
            'data' => $member->fresh(['user', 'crmDepartment']),
        ]);
    }

    /**
     * DELETE /api/budget/crm/team/{id}
     * Rimuovi membro
     */
    public function removeMember($id)
    {
        $member = CrmTeamMember::findOrFail($id);

        // Soft delete: set is_active to false instead of deleting
        $member->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Membro rimosso dal team',
        ]);
    }
}
