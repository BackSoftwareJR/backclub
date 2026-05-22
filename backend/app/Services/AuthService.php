<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserRole;
use App\Models\UserSecuritySettings;
use App\Models\LoginLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AuthService
{
    protected TwoFactorService $twoFactorService;

    public function __construct(TwoFactorService $twoFactorService)
    {
        $this->twoFactorService = $twoFactorService;
    }

    /**
     * Attempt login with credentials
     * Returns array with status and data/error
     */
    public function attemptLogin(string $email, string $password, Request $request): array
    {
        try {
            // Find user
            $user = User::where('email', $email)->first();

            if (!$user) {
                $this->logFailedLogin($request, null, 'user_not_found');
                return [
                    'success' => false,
                    'error' => 'invalid_credentials',
                    'message' => 'Credenziali non valide'
                ];
            }

            // Check password
            if (!Hash::check($password, $user->password)) {
                $this->logFailedLogin($request, $user->id, 'wrong_password');
                return [
                    'success' => false,
                    'error' => 'invalid_credentials',
                    'message' => 'Credenziali non valide'
                ];
            }

            // Check if user is active
            if (!$user->is_active) {
                $this->logFailedLogin($request, $user->id, 'account_disabled');
                return [
                    'success' => false,
                    'error' => 'account_disabled',
                    'message' => 'Account disattivato. Contatta l\'amministratore.'
                ];
            }

            // Check if user requires password change
            $securitySettings = $user->securitySettings;
            if ($securitySettings && $securitySettings->require_password_change) {
                return [
                    'success' => false,
                    'error' => 'password_change_required',
                    'message' => 'Cambio password obbligatorio',
                    'user_id' => $user->id
                ];
            }

            // Check if password is expired
            if ($securitySettings && $securitySettings->password_expires_at) {
                if (Carbon::parse($securitySettings->password_expires_at)->isPast()) {
                    return [
                        'success' => false,
                        'error' => 'password_expired',
                        'message' => 'Password scaduta. È necessario cambiarla.',
                        'user_id' => $user->id
                    ];
                }
            }

            // Check if 2FA is required
            $deviceFingerprint = $request->header('X-Device-Fingerprint');
            
            if ($this->twoFactorService->requires2FA($user, $deviceFingerprint)) {
                $method = $this->twoFactorService->get2FAMethod($user);
                
                // Generate and send code if email-based
                if (in_array($method, ['email', 'both'])) {
                    $this->twoFactorService->generateAndSendCode($user);
                }
                
                return [
                    'success' => false,
                    'requires_2fa' => true,
                    'method' => $method,
                    'user_id' => $user->id,
                    'message' => '2FA richiesta'
                ];
            }

            // Complete login
            return $this->completeLogin($user, $request);

        } catch (\Exception $e) {
            \Log::error('Login error in AuthService', [
                'error' => $e->getMessage(),
                'email' => $email,
                'ip' => $request->ip()
            ]);

            return [
                'success' => false,
                'error' => 'server_error',
                'message' => 'Errore del server. Riprova più tardi.'
            ];
        }
    }

    /**
     * Complete login (after credentials + optional 2FA)
     */
    public function completeLogin(User $user, Request $request, bool $trustDevice = false): array
    {
        try {
            // Create token
            $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

            // Update last login
            $user->update(['last_login_at' => now()]);

            // Log successful login
            $this->logSuccessfulLogin($request, $user->id);

            // Trust device if requested
            if ($trustDevice) {
                $fingerprint = $request->header('X-Device-Fingerprint');
                if ($fingerprint && $user->securitySettings) {
                    $user->securitySettings->addTrustedDevice($fingerprint, [
                        'user_agent' => $request->userAgent(),
                        'ip' => $request->ip(),
                    ]);
                }
            }

            // Send login notification if enabled
            if ($user->securitySettings && $user->securitySettings->login_notifications) {
                try {
                    // Queue email notification
                    // Mail::to($user->email)->queue(new LoginNotificationMail($user, $request->ip()));
                } catch (\Exception $e) {
                    // Don't fail login if notification fails
                    \Log::warning('Failed to send login notification', ['user_id' => $user->id]);
                }
            }

            // Get user data for response
            $userData = $this->getUserData($user);

            // Get redirect route
            $redirectRoute = $this->getRedirectRoute($user);

            return [
                'success' => true,
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $userData,
                'redirect_route' => $redirectRoute,
            ];

        } catch (\Exception $e) {
            \Log::error('Error completing login', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return [
                'success' => false,
                'error' => 'server_error',
                'message' => 'Errore durante il completamento del login'
            ];
        }
    }

    /**
     * Get user data for API response
     */
    public function getUserData(User $user): array
    {
        // Load relationships
        $user->load(['roles', 'securitySettings']);

        // Get all roles
        $allRoles = $user->roles->pluck('role')->toArray();
        if (!in_array($user->role, $allRoles)) {
            array_unshift($allRoles, $user->role);
        }

        // Check if passepartout (admin can access all roles)
        $isPassepartout = in_array($user->role, ['admin', 'project_master']);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role, // Primary role
            'all_roles' => $allRoles,
            'is_passepartout' => $isPassepartout,
            'avatar' => $user->avatar,
            'phone' => $user->phone,
            'department' => $user->department,
            'has_2fa' => $user->securitySettings?->two_factor_enabled ?? false,
            'two_factor_type' => $user->securitySettings?->two_factor_type,
        ];
    }

    /**
     * Get redirect route based on user role
     */
    public function getRedirectRoute(User $user): string
    {
        $role = session('assumed_role', $user->role);

        return match($role) {
            'admin', 'project_master' => '/master',
            'project_manager', 'freelance', 'dipendente' => '/projects',
            'segreteria' => '/segreteria',
            'risorse_umane' => '/hr',
            'venditori', 'commercialista' => '/commerciale',
            'clienti' => '/client',
            default => '/dashboard',
        };
    }

    /**
     * Switch role (for passepartout users)
     */
    public function switchRole(User $user, string $targetRole): array
    {
        // Check if user can switch to this role
        if (!$this->canSwitchToRole($user, $targetRole)) {
            return [
                'success' => false,
                'error' => 'unauthorized',
                'message' => 'Non hai i permessi per assumere questo ruolo'
            ];
        }

        // Save original role if not already in session
        if (!session()->has('original_role')) {
            session(['original_role' => $user->role]);
        }

        // Set assumed role
        session(['assumed_role' => $targetRole]);

        // Log role switch
        \Log::info('Role switched', [
            'user_id' => $user->id,
            'from' => $user->role,
            'to' => $targetRole
        ]);

        return [
            'success' => true,
            'current_role' => $targetRole,
            'original_role' => session('original_role'),
            'redirect_route' => $this->getRedirectRoute($user)
        ];
    }

    /**
     * Revert to original role
     */
    public function revertRole(): array
    {
        $originalRole = session('original_role');
        
        if (!$originalRole) {
            return [
                'success' => false,
                'error' => 'no_role_switch',
                'message' => 'Nessun cambio ruolo attivo'
            ];
        }

        session()->forget(['assumed_role', 'original_role']);

        return [
            'success' => true,
            'current_role' => $originalRole,
        ];
    }

    /**
     * Check if user can switch to target role
     */
    private function canSwitchToRole(User $user, string $targetRole): bool
    {
        // Passepartout users (admin, project_master) can switch to any role
        if (in_array($user->role, ['admin', 'project_master'])) {
            return in_array($targetRole, UserRole::availableRoles());
        }

        // Regular users can only switch to their assigned roles
        return $user->roles->contains('role', $targetRole);
    }

    /**
     * Log successful login
     */
    private function logSuccessfulLogin(Request $request, int $userId): void
    {
        try {
            LoginLog::create([
                'user_id' => $userId,
                'ip_address' => $request->ip() ?? '0.0.0.0',
                'status' => 'success',
                'user_agent' => substr($request->userAgent() ?? 'Unknown', 0, 255),
            ]);
        } catch (\Exception $e) {
            \Log::warning('Failed to log successful login', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Log failed login
     */
    private function logFailedLogin(Request $request, ?int $userId, string $reason): void
    {
        try {
            LoginLog::create([
                'user_id' => $userId,
                'ip_address' => $request->ip() ?? '0.0.0.0',
                'status' => 'failed',
                'user_agent' => substr($request->userAgent() ?? 'Unknown', 0, 255),
            ]);
        } catch (\Exception $e) {
            \Log::warning('Failed to log failed login', ['error' => $e->getMessage()]);
        }
    }
}
