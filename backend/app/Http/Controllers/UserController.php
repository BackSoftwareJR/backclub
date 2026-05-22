<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('userRoles');
        if ($request->has('role')) {
            $query->whereHas('userRoles', function($q) use ($request) {
                $q->where('role', $request->role);
            });
        }
        $users = $query->get();
        
        // Add roles and CRM departments arrays to each user
        $users->each(function($user) {
            $user->roles = $user->userRoles()->pluck('role')->toArray();
            $user->crm_departments = $user->crmDepartments()->get()->map(function($crm) {
                return [
                    'id' => $crm->id,
                    'code' => $crm->code,
                    'name' => $crm->name,
                    'color' => $crm->color,
                    'icon' => $crm->icon,
                ];
            })->toArray();
        });
        
        return $users;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,freelance,client,venditori',
            'phone' => 'nullable|string',
            'is_active' => 'boolean',
            'crm_department_ids' => 'nullable|array',
            'crm_department_ids.*' => 'exists:crm_departments,id',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        
        // Set default is_active if not provided
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = 1;
        }
        
        $user = User::create($validated);

        // Handle roles - can be single role or array of roles
        $roles = $request->input('roles', [$validated['role']]);
        if (!is_array($roles)) {
            $roles = [$roles];
        }
        
        $isPrimary = true;
        foreach ($roles as $role) {
            UserRole::create([
                'user_id' => $user->id,
                'role' => $role,
                'is_primary' => $isPrimary,
            ]);
            $isPrimary = false; // Only first role is primary
        }
        
        // Set current_role to primary role
        $user->current_role = $roles[0];
        
        // Handle CRM departments
        if ($request->has('crm_department_ids') && is_array($request->crm_department_ids)) {
            $user->crmDepartments()->sync($request->crm_department_ids);
            // Set first CRM as current if provided
            if (count($request->crm_department_ids) > 0) {
                $user->current_crm_department_id = $request->crm_department_ids[0];
            }
        }
        
        $user->save();

        // Send Welcome Email
        // Pass the raw password so the user knows it (optional, but requested implicitly by "welcome email")
        // The Mailable handles if password is null, but here we have it from request.
        try {
        \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\WelcomeEmail($user, $request->password));
        } catch (\Exception $e) {
            // Log error but don't fail user creation
            \Log::error('Failed to send welcome email: ' . $e->getMessage());
        }

        $user->load('userRoles');
        $user->roles = $user->userRoles()->pluck('role')->toArray();
        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        $user->load(['userRoles', 'crmDepartments', 'currentCrmDepartment']);
        $user->roles = $user->userRoles()->pluck('role')->toArray();
        $user->crm_departments = $user->crmDepartments()->get()->map(function($crm) {
            return [
                'id' => $crm->id,
                'code' => $crm->code,
                'name' => $crm->name,
                'color' => $crm->color,
                'icon' => $crm->icon,
            ];
        })->toArray();
        return $user;
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'string',
            'email' => 'email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string',
            'is_active' => 'boolean',
            'roles' => 'nullable|array',
            'roles.*' => 'in:admin,freelance,client,venditori',
            'crm_department_ids' => 'nullable|array',
            'crm_department_ids.*' => 'exists:crm_departments,id',
        ]);

        if ($request->has('password')) {
            $validated['password'] = Hash::make($request->password);
        }

        $user->update($validated);
        
        // Update roles if provided
        if ($request->has('roles')) {
            DB::transaction(function() use ($user, $request) {
                // Delete existing roles
                $user->userRoles()->delete();
                
                // Add new roles
                $roles = $request->input('roles', []);
                $isPrimary = true;
                foreach ($roles as $role) {
                    UserRole::create([
                        'user_id' => $user->id,
                        'role' => $role,
                        'is_primary' => $isPrimary,
                    ]);
                    $isPrimary = false;
                }
                
                // Update current_role if it's not in the new roles
                if (!in_array($user->current_role, $roles) && count($roles) > 0) {
                    $user->current_role = $roles[0];
                    $user->save();
                }
            });
        }
        
        // Update CRM departments if provided
        if ($request->has('crm_department_ids')) {
            $crmIds = $request->input('crm_department_ids', []);
            $user->crmDepartments()->sync($crmIds);
            
            // Update current_crm_department_id if current is not in the new list
            if (!in_array($user->current_crm_department_id, $crmIds) && count($crmIds) > 0) {
                $user->current_crm_department_id = $crmIds[0];
                $user->save();
            } elseif (count($crmIds) === 0) {
                $user->current_crm_department_id = null;
                $user->save();
            }
        }
        
        $user->load(['userRoles', 'crmDepartments', 'currentCrmDepartment']);
        $user->roles = $user->userRoles()->pluck('role')->toArray();
        $user->crm_departments = $user->crmDepartments()->get()->map(function($crm) {
            return [
                'id' => $crm->id,
                'code' => $crm->code,
                'name' => $crm->name,
                'color' => $crm->color,
                'icon' => $crm->icon,
            ];
        })->toArray();
        return response()->json($user);
    }

    /**
     * Toggle user access (suspend/activate)
     */
    public function toggleAccess(User $user)
    {
        $user->is_active = !$user->is_active;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Accesso utente ' . ($user->is_active ? 'abilitato' : 'sospeso'),
            'data' => $user
        ]);
    }

    /**
     * Reset user password
     */
    public function resetPassword(Request $request, User $user)
    {
        $validated = $request->validate([
            'password' => 'required|string|min:8'
        ]);

        $user->password = Hash::make($validated['password']);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password aggiornata con successo'
        ]);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(null, 204);
    }
}
