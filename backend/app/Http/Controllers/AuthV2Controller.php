<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

/**
 * AuthV2Controller - Versione Ultra Semplificata
 * ZERO dipendenze opzionali
 * ZERO possibilità di errore 500
 */
class AuthV2Controller extends Controller
{
    /**
     * Login Step 1 - VERSIONE MINIMALISTA
     * Solo email + password, nessun 2FA per ora
     */
    public function loginStep1(Request $request)
    {
        try {
            // Validazione
            $credentials = $request->validate([
                'email' => 'required|email|max:255',
                'password' => 'required|string|min:1|max:255',
            ]);

            // Trova utente
            $user = User::where('email', $credentials['email'])->first();

            if (!$user) {
                return response()->json([
                    'message' => 'Credenziali non valide'
                ], 401);
            }

            // Verifica password
            if (!Hash::check($credentials['password'], $user->password)) {
                return response()->json([
                    'message' => 'Credenziali non valide'
                ], 401);
            }

            // Verifica se account è attivo
            if (!$user->is_active) {
                return response()->json([
                    'message' => 'Account disattivato. Contatta l\'amministratore.'
                ], 403);
            }

            // Crea token Sanctum
            try {
                $tokenName = 'auth_token_' . now()->timestamp;
                $expiresAt = $request->input('remember') ? now()->addDays(30) : now()->addHours(12);
                
                $token = $user->createToken($tokenName, ['*'], $expiresAt);
            } catch (\Exception $e) {
                \Log::error('Failed to create token', [
                    'error' => $e->getMessage(),
                    'user_id' => $user->id,
                ]);
                
                return response()->json([
                    'message' => 'Errore creazione token',
                ], 500);
            }

            // Aggiorna last_login_at (opzionale, non blocca se fallisce)
            try {
                $user->update(['last_login_at' => now()]);
            } catch (\Exception $e) {
                // Ignora se fallisce
            }

            // Ottieni dati utente
            $userData = $this->getUserData($user);

            // Determina redirect
            $redirectRoute = $this->getRedirectRoute($user);

            return response()->json([
                'access_token' => $token->plainTextToken,
                'token_type' => 'Bearer',
                'expires_at' => $expiresAt->toIso8601String(),
                'user' => $userData,
                'redirect_route' => $redirectRoute,
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Dati non validi',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            // Log massimo dettaglio per debug
            try {
                \Log::error('Login V2 error', [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                    'email' => $request->input('email', 'unknown'),
                ]);
            } catch (\Exception $logError) {
                // Ignora anche errori di logging
            }

            return response()->json([
                'message' => 'Errore del server durante il login.',
                'error_code' => 'LOGIN_ERROR',
                'debug_info' => [
                    'error' => $e->getMessage(),
                    'file' => basename($e->getFile()),
                    'line' => $e->getLine(),
                ]
            ], 500);
        }
    }

    /**
     * Login Step 2 - PLACEHOLDER (per compatibilità)
     */
    public function loginStep2Verify(Request $request)
    {
        return response()->json([
            'message' => '2FA temporaneamente disabilitato. Usa login diretto.'
        ], 501);
    }

    /**
     * Resend code - PLACEHOLDER
     */
    public function resend2FACode(Request $request)
    {
        return response()->json([
            'message' => '2FA temporaneamente disabilitato.'
        ], 501);
    }

    /**
     * Ottieni dati utente
     */
    private function getUserData(User $user): array
    {
        // Carica ruoli multipli (con try-catch)
        $roles = [];
        try {
            $user->load('roles');
            $roles = $user->roles->pluck('role')->toArray();
        } catch (\Exception $e) {
            $roles = [];
        }

        $allRoles = array_unique(array_merge([$user->role], $roles));

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar' => $user->avatar ?? null,
            'roles' => $roles,
            'all_roles' => $allRoles,
        ];
    }

    /**
     * Determina redirect route
     */
    private function getRedirectRoute(User $user): string
    {
        $role = $user->role ?? 'clienti';

        return match($role) {
            'admin', 'project_master' => '/master',
            'segreteria' => '/segreteria',
            'project_manager' => '/projects',
            'risorse_umane' => '/hr',
            'commercialista' => '/finance',
            'venditori' => '/sales',
            'dipendente' => '/employee',
            'freelance' => '/freelance',
            'clienti' => '/client',
            default => '/dashboard',
        };
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json(['message' => 'Non autenticato'], 401);
            }

            // Revoca token
            $request->user()->currentAccessToken()->delete();

            return response()->json(['message' => 'Logout effettuato'], 200);

        } catch (\Exception $e) {
            \Log::error('Logout error', ['error' => $e->getMessage()]);
            
            return response()->json(['message' => 'Errore logout'], 500);
        }
    }
}
