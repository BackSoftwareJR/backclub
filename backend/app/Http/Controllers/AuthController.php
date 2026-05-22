<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            
            // Load user roles, CRM departments, and seller relationship (single eager load)
            $user->load(['userRoles', 'crmDepartments', 'currentCrmDepartment', 'seller']);
            
            // Get roles from already-loaded relationship (no extra query)
            $roles = $user->userRoles->pluck('role')->toArray();
            if (empty($roles) && $user->role) {
                $roles = [$user->role];
            }
            
            // Use already-loaded crmDepartments (no extra query)
            $crmDepartments = $user->crmDepartments->map(function($crm) {
                return [
                    'id' => $crm->id,
                    'code' => $crm->code,
                    'name' => $crm->name,
                    'color' => $crm->color,
                    'icon' => $crm->icon,
                ];
            })->toArray();
            
            // Handle role assignment logic
            // If user has multiple roles, always require role selection (even if current_role is set)
            // Only auto-set if user has single role or if selected_role is provided in request
            if ($request->has('selected_role')) {
                // User has selected a role, verify and set it
                $selectedRole = $request->input('selected_role');
                if (in_array($selectedRole, $roles)) {
                    $user->current_role = $selectedRole;
                    $user->save();
                }
            } elseif (count($roles) === 1) {
                // Single role, set it as current automatically
                $user->current_role = $roles[0];
                $user->save();
            } elseif (count($roles) > 1) {
                // Multiple roles - always require role selection, even if current_role is already set
                // Verify the current_role is still valid, but don't auto-set it
                if ($user->current_role && !in_array($user->current_role, $roles)) {
                    // Current role is no longer valid, reset it
                    $user->current_role = null;
                    $user->save();
                }
                // Don't set current_role automatically - user must select on frontend
            }
            
            // Get seller_id if user is a seller
            $sellerId = null;
            if ($user->seller) {
                $sellerId = $user->seller->id;
            } elseif (($user->role === 'venditori' || $user->role === 'seller') && !$user->seller) {
                // Try to find seller by user_id
                $seller = \App\Models\Seller::where('user_id', $user->id)->first();
                if ($seller) {
                    $sellerId = $seller->id;
                }
            }
            
            // Add seller_id to user object for frontend
            $user->seller_id = $sellerId;
            
            $token = $user->createToken('auth_token')->plainTextToken;

            // Log successful login
            \App\Models\LoginLog::create([
                'user_id' => $user->id,
                'ip_address' => $request->ip(),
                'status' => 'success',
                'user_agent' => $request->userAgent(),
            ]);

            // Send Admin Login Alert in background (queued - does not block login)
            if ($user->role === 'admin' || in_array('admin', $roles)) {
                try {
                    $adminEmail = config('mail.admin_email') ?? 'bsnoreplyslm@gmail.com';
                    \Illuminate\Support\Facades\Mail::to($adminEmail)->send(new \App\Mail\AdminLoginAlert($user, $request->ip()));
                } catch (\Exception $e) {
                    \Log::error('Failed to queue admin login alert email', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Use already-loaded user (no fresh() - avoids 4+ extra queries)
            if ($user->seller) {
                $user->seller_id = $user->seller->id;
            }

            // Ensure onboarding fields are explicitly set and cast to proper types
            $user->onboarding_completed = (bool) ($user->onboarding_completed ?? false);
            $user->preferred_language = $user->preferred_language ?? 'it';
            $user->preferred_theme = $user->preferred_theme ?? 'system';

            // Use roles already computed (no extra DB query)
            $finalRoles = $roles;

            // Determine if role selection is required
            $requiresRoleSelection = count($finalRoles) > 1;
            
            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
                'roles' => $finalRoles,
                'crm_departments' => $crmDepartments,
                'requires_role_selection' => $requiresRoleSelection, // true if multiple roles, false if single or no roles
            ]);
        }

        // Log failed login
        // Try to find user ID if email exists, otherwise null
        $user = User::where('email', $request->email)->first();
        \App\Models\LoginLog::create([
            'user_id' => $user ? $user->id : null,
            'ip_address' => $request->ip(),
            'status' => 'failed',
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'client', // Default role for public registration
            'is_active' => true,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load(['userRoles', 'crmDepartments', 'currentCrmDepartment', 'seller']);
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
        
        // Add seller_id if user is a seller
        // Usa current_role se disponibile, altrimenti fallback a role
        $activeRole = $user->current_role ?? $user->role;
        
        // Reset seller_id se il ruolo non è più venditore
        if ($activeRole === 'venditori' || $activeRole === 'seller') {
            if ($user->seller) {
                $user->seller_id = $user->seller->id;
            } else {
                // Try to find seller record
                $seller = \App\Models\Seller::where('user_id', $user->id)->first();
                if ($seller) {
                    $user->seller_id = $seller->id;
                } else {
                    $user->seller_id = null;
                }
            }
        } else {
            // Se il ruolo non è più venditore, rimuovi seller_id
            $user->seller_id = null;
        }
        
        // Ensure onboarding fields are explicitly returned
        // Cast to boolean to ensure proper type (null becomes false)
        $user->onboarding_completed = (bool) ($user->onboarding_completed ?? false);
        $user->preferred_language = $user->preferred_language ?? 'it';
        $user->preferred_theme = $user->preferred_theme ?? 'system';
        
        return $user;
    }

    /**
     * Change user's current role
     */
    public function changeRole(Request $request)
    {
        $validated = $request->validate([
            'role' => 'required|string',
        ]);

        $user = $request->user();
        
        // Verify user has this role
        $hasRole = $user->userRoles()->where('role', $validated['role'])->exists();
        if (!$hasRole) {
            return response()->json([
                'message' => 'Non hai questo ruolo assegnato'
            ], 403);
        }

        $user->current_role = $validated['role'];
        $user->save();

        // Load seller relationship if role is seller
        $user = $user->fresh(['userRoles', 'crmDepartments', 'currentCrmDepartment', 'seller']);
        
        // Reset seller_id se il ruolo non è più venditore
        if ($validated['role'] === 'venditori' || $validated['role'] === 'seller') {
            if ($user->seller) {
                $user->seller_id = $user->seller->id;
            } else {
                // Try to find seller record
                $seller = \App\Models\Seller::where('user_id', $user->id)->first();
                if ($seller) {
                    $user->seller_id = $seller->id;
                } else {
                    $user->seller_id = null;
                }
            }
        } else {
            // Se il ruolo non è più venditore, rimuovi seller_id
            $user->seller_id = null;
        }

        return response()->json([
            'message' => 'Ruolo cambiato con successo',
            'user' => $user,
        ]);
    }

    /**
     * Change user's current CRM department
     */
    public function changeCrmDepartment(Request $request)
    {
        $validated = $request->validate([
            'crm_department_id' => 'required|integer|exists:crm_departments,id',
        ]);

        $user = $request->user();
        
        // Verify user has access to this CRM department
        $hasAccess = $user->crmDepartments()->where('crm_departments.id', $validated['crm_department_id'])->exists();
        if (!$hasAccess) {
            return response()->json([
                'message' => 'Non hai accesso a questo CRM'
            ], 403);
        }

        $user->current_crm_department_id = $validated['crm_department_id'];
        $user->save();

        return response()->json([
            'message' => 'CRM cambiato con successo',
            'user' => $user->fresh(['userRoles', 'crmDepartments', 'currentCrmDepartment']),
        ]);
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'La password attuale non è corretta.'], 422);
        }

        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        return response()->json(['message' => 'Password aggiornata con successo.']);
    }

    /**
     * Update user onboarding preferences
     */
    public function updateOnboardingPreferences(Request $request)
    {
        $validated = $request->validate([
            'onboarding_completed' => 'sometimes|boolean',
            'preferred_language' => 'sometimes|string|in:it,en,es,fr',
            'preferred_theme' => 'sometimes|string|in:light,dark,system',
        ]);

        $user = $request->user();
        
        $user->update($validated);
        
        // Reload user with relationships
        $user = $user->fresh(['userRoles', 'crmDepartments', 'currentCrmDepartment', 'seller']);
        
        // Add seller_id if needed
        if ($user->seller) {
            $user->seller_id = $user->seller->id;
        }

        return response()->json([
            'message' => 'Preferenze aggiornate con successo',
            'user' => $user,
        ]);
    }
}
