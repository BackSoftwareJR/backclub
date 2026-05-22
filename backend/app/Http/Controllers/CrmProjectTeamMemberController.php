<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmProjectTeamMember;
use App\Models\User;
use App\Notifications\ProjectMemberAdded;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CrmProjectTeamMemberController extends Controller
{
    /**
     * GET /api/crm-projects/{id}/team-members
     * Lista tutti i membri del team del progetto
     */
    public function index($id)
    {
        $project = CrmProject::findOrFail($id);
        
        $members = CrmProjectTeamMember::where('crm_project_id', $project->id)
            ->with(['user' => function($query) {
                $query->select('id', 'name', 'email', 'avatar', 'role');
            }])
            ->where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->get();

        // Assicurati che tutti i membri abbiano almeno l'ID utente, anche se la relazione non è caricata
        // Questo può succedere se l'utente è stato eliminato o se c'è un problema con la foreign key
        foreach ($members as $member) {
            if (!$member->user && $member->user_id) {
                // Prova a caricare l'utente manualmente se non è stato caricato
                $user = User::find($member->user_id);
                if ($user) {
                    $member->setRelation('user', $user);
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $members,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/team-members
     * Aggiunge un membro al team del progetto
     */
    public function store(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        // Check permission: Admin o Manager del progetto
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Solo admin e project manager possono aggiungere membri'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role' => 'required|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'payment_methods' => 'required|array|min:1',
            'payment_methods.*' => 'required|in:hourly,per_task,per_project,fixed,no_payment',
            'project_rate_cocchi' => 'nullable|numeric|min:0|required_if:payment_methods.*,per_project',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Verifica se l'utente è già membro del team
        $existing = CrmProjectTeamMember::where('crm_project_id', $project->id)
            ->where('user_id', $validated['user_id'])
            ->where('is_active', true)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Utente già membro del team'
            ], 422);
        }

        // Verifica che se per_project è selezionato, project_rate_cocchi sia presente
        if (in_array('per_project', $validated['payment_methods']) && !isset($validated['project_rate_cocchi'])) {
            return response()->json([
                'success' => false,
                'message' => 'È richiesto il campo project_rate_cocchi quando si seleziona il metodo di pagamento "a progetto"'
            ], 422);
        }

        // Crea il membro del team
        $member = CrmProjectTeamMember::create([
            'crm_project_id' => $project->id,
            'user_id' => $validated['user_id'],
            'role' => $validated['role'],
            'start_date' => $validated['start_date'] ?? now(),
            'end_date' => $validated['end_date'] ?? null,
            'payment_methods' => $validated['payment_methods'],
            'project_rate_cocchi' => $validated['project_rate_cocchi'] ?? null,
            'is_active' => true,
        ]);

        $member->load('user');
        
        // Carica il progetto con le relazioni necessarie
        $project->load('client');

        // Invia notifica al freelance aggiunto
        $addedUser = User::find($validated['user_id']);
        if ($addedUser) {
            $addedUser->notify(new ProjectMemberAdded($project, $user));
        }

        return response()->json([
            'success' => true,
            'message' => 'Membro aggiunto con successo',
            'data' => $member,
        ], 201);
    }

    /**
     * PUT /api/crm-projects/{id}/team-members/{memberId}
     * Aggiorna un membro del team
     */
    public function update(Request $request, $id, $memberId)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        // Check permission
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per modificare i membri'
            ], 403);
        }

        $member = CrmProjectTeamMember::where('crm_project_id', $project->id)
            ->where('id', $memberId)
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'role' => 'sometimes|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'is_active' => 'sometimes|boolean',
            'payment_methods' => 'sometimes|array|min:1',
            'payment_methods.*' => 'required|in:hourly,per_task,per_project,fixed,no_payment',
            'project_rate_cocchi' => 'nullable|numeric|min:0|required_if:payment_methods.*,per_project',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        
        // Verifica che se per_project è selezionato, project_rate_cocchi sia presente
        if (isset($validated['payment_methods']) && in_array('per_project', $validated['payment_methods']) && !isset($validated['project_rate_cocchi'])) {
            return response()->json([
                'success' => false,
                'message' => 'È richiesto il campo project_rate_cocchi quando si seleziona il metodo di pagamento "a progetto"'
            ], 422);
        }

        $member->update($validated);
        $member->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Membro aggiornato con successo',
            'data' => $member,
        ]);
    }

    /**
     * DELETE /api/crm-projects/{id}/team-members/{memberId}
     * Rimuove un membro dal team
     */
    public function destroy($id, $memberId)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        // Check permission
        if ($user->role !== 'admin' && $project->manager_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai i permessi per rimuovere membri'
            ], 403);
        }

        $member = CrmProjectTeamMember::where('crm_project_id', $project->id)
            ->where('id', $memberId)
            ->firstOrFail();

        // Soft delete
        $member->update(['is_active' => false, 'end_date' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Membro rimosso con successo',
        ]);
    }

    /**
     * GET /api/crm-projects/available-users
     * Ottiene la lista degli utenti disponibili per aggiungere al progetto
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

