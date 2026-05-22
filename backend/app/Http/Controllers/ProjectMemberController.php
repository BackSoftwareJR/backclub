<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\ProjectTeamMember;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ProjectMemberController extends Controller
{
    /**
     * Get all team members for a project
     */
    public function index(Project $project)
    {
        $user = Auth::user();
        
        // Check permission
        if ($user->role !== 'admin' && 
            $project->manager_id !== $user->id && 
            !$project->members->contains('id', $user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per visualizzare i membri del team'
            ], 403);
        }

        $members = $project->teamMembers()
            ->with('user:id,name,email,avatar,role')
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $members,
        ]);
    }

    /**
     * Add a team member to the project
     */
    public function store(Request $request, Project $project)
    {
        $user = Auth::user();
        
        // Check permission: Admin or Manager only
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Solo admin e project manager possono aggiungere membri'
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|string|max:100',
            'payment_type' => 'required|in:fisso,orario,percentuale,cocchi',
            'payment_amount' => 'required|numeric|min:0',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        // Check if already a member
        $existing = ProjectTeamMember::where('project_id', $project->id)
            ->where('user_id', $validated['user_id'])
            ->where('is_active', true)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Utente già membro del team'
            ], 422);
        }

        $validated['project_id'] = $project->id;
        $validated['is_active'] = true;

        $member = ProjectTeamMember::create($validated);
        $member->load('user');

        // Send email notification
        try {
            $newUser = User::find($validated['user_id']);
            \Illuminate\Support\Facades\Mail::to($newUser->email)
                ->send(new \App\Mail\ProjectMemberAdded($project, $newUser));
        } catch (\Exception $e) {
            // Log error but don't fail the request
            \Illuminate\Support\Facades\Log::error('Failed to send project member email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Membro aggiunto con successo',
            'data' => $member,
        ], 201);
    }

    /**
     * Update a team member
     */
    public function update(Request $request, Project $project, $memberId)
    {
        $user = Auth::user();
        
        // Check permission
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per modificare i membri'
            ], 403);
        }

        $member = ProjectTeamMember::where('project_id', $project->id)
            ->where('id', $memberId)
            ->firstOrFail();

        $validated = $request->validate([
            'role' => 'string|max:100',
            'payment_type' => 'in:fisso,orario,percentuale,cocchi',
            'payment_amount' => 'numeric|min:0',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'is_active' => 'boolean',
        ]);

        $member->update($validated);
        $member->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Membro aggiornato con successo',
            'data' => $member,
        ]);
    }

    /**
     * Remove a team member
     */
    public function destroy(Project $project, $memberId)
    {
        $user = Auth::user();
        
        // Check permission: Admin or Manager only
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per rimuovere membri'
            ], 403);
        }

        $member = ProjectTeamMember::where('project_id', $project->id)
            ->where('id', $memberId)
            ->firstOrFail();

        // Soft delete by setting is_active to false
        $member->update(['is_active' => false, 'end_date' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Membro rimosso con successo',
        ]);
    }

    /**
     * Get available users to add to project
     */
    public function getAvailableUsers()
    {
        $users = User::select('id', 'name', 'email', 'role', 'avatar')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }
}
