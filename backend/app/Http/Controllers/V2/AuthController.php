<?php

namespace App\Http\Controllers\V2;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Services\TwoFactorService;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    protected AuthService $authService;
    protected TwoFactorService $twoFactorService;

    public function __construct(AuthService $authService, TwoFactorService $twoFactorService)
    {
        $this->authService = $authService;
        $this->twoFactorService = $twoFactorService;
    }

    /**
     * Login Step 1: Credentials
     * POST /api/v2/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $result = $this->authService->attemptLogin(
            $validated['email'],
            $validated['password'],
            $request
        );

        if ($result['success']) {
            return response()->json($result, 200);
        }

        // Check if 2FA required
        if (isset($result['requires_2fa']) && $result['requires_2fa']) {
            return response()->json($result, 202); // Accepted, needs 2FA
        }

        // Error
        $statusCode = match($result['error'] ?? 'unknown') {
            'invalid_credentials' => 401,
            'account_disabled' => 403,
            'password_expired', 'password_change_required' => 403,
            default => 500
        };

        return response()->json($result, $statusCode);
    }

    /**
     * Login Step 2: Verify 2FA Email Code
     * POST /api/v2/auth/2fa/verify-email
     */
    public function verify2FAEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'code'=> 'required|string|size:6',
            'trust_device' => 'boolean',
        ]);

        $user = User::findOrFail($validated['user_id']);

        // Verify code
        if (!$this->twoFactorService->verifyCode($user, $validated['code'])) {
            return response()->json([
                'success' => false,
                'error' => 'invalid_code',
                'message' => 'Codice non valido o scaduto',
            ], 401);
        }

        // Complete login
        $result = $this->authService->completeLogin(
            $user,
            $request,
            $validated['trust_device'] ?? false
        );

        return response()->json($result, $result['success'] ? 200 : 500);
    }

    /**
     * Login Step 2 Alternative: Verify Passphrase
     * POST /api/v2/auth/2fa/verify-passphrase
     */
    public function verify2FAPassphrase(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'passphrase' => 'required|string|min:4',
            'trust_device' => 'boolean',
        ]);

        $user = User::findOrFail($validated['user_id']);

        // Verify passphrase
        if (!$user->securitySettings || !$user->securitySettings->verifyPassphrase($validated['passphrase'])) {
            return response()->json([
                'success' => false,
                'error' => 'invalid_passphrase',
                'message' => 'Passphrase non valida',
            ], 401);
        }

        // Complete login
        $result = $this->authService->completeLogin(
            $user,
            $request,
            $validated['trust_device'] ?? false
        );

        return response()->json($result, $result['success'] ? 200 : 500);
    }

    /**
     * Verify Backup Code
     * POST /api/v2/auth/2fa/verify-backup
     */
    public function verifyBackupCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'code' => 'required|string',
        ]);

        $user = User::findOrFail($validated['user_id']);

        // Verify backup code
        if (!$this->twoFactorService->verifyBackupCode($user, $validated['code'])) {
            return response()->json([
                'success' => false,
                'error' => 'invalid_backup_code',
                'message' => 'Codice di backup non valido o già utilizzato',
            ], 401);
        }

        // Complete login
        $result = $this->authService->completeLogin($user, $request);

        return response()->json($result, $result['success'] ? 200 : 500);
    }

    /**
     * Resend 2FA Code
     * POST /api/v2/auth/2fa/resend
     */
    public function resend2FACode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        try {
            $user = User::findOrFail($validated['user_id']);
            $this->twoFactorService->generateAndSendCode($user);

            return response()->json([
                'success' => true,
                'message' => 'Codice inviato nuovamente',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'send_failed',
                'message' => 'Impossibile inviare il codice. Riprova più tardi.',
            ], 500);
        }
    }

    /**
     * Get current user
     * GET /api/v2/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'unauthenticated',
                'message' => 'Non autenticato',
            ], 401);
        }

        $userData = $this->authService->getUserData($user);
        $userData['redirect_route'] = $this->authService->getRedirectRoute($user);
        $userData['current_role'] = session('assumed_role', $user->role);
        $userData['is_role_switched'] = session()->has('assumed_role');

        return response()->json([
            'success' => true,
            'user' => $userData,
        ], 200);
    }

    /**
     * Logout
     * POST /api/v2/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            // Revoke current token
            $request->user()->currentAccessToken()->delete();

            // Clear role switch session
            session()->forget(['assumed_role', 'original_role']);

            return response()->json([
                'success' => true,
                'message' => 'Logout effettuato',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'logout_failed',
                'message' => 'Errore durante il logout',
            ], 500);
        }
    }

    /**
     * Refresh token
     * POST /api/v2/auth/refresh
     */
    public function refresh(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            // Revoke old token
            $request->user()->currentAccessToken()->delete();
            
            // Create new token
            $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

            return response()->json([
                'success' => true,
                'access_token' => $token,
                'token_type' => 'Bearer',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'refresh_failed',
                'message' => 'Impossibile rinnovare il token',
            ], 500);
        }
    }

    /**
     * Switch Role (Passepartout only)
     * POST /api/v2/auth/switch-role
     */
    public function switchRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => 'required|string|in:dipendente,freelance,project_manager,project_master,admin,segreteria,risorse_umane,clienti,venditori,commercialista',
        ]);

        $result = $this->authService->switchRole($request->user(), $validated['role']);

        return response()->json($result, $result['success'] ? 200 : 403);
    }

    /**
     * Revert to Original Role
     * POST /api/v2/auth/revert-role
     */
    public function revertRole(Request $request): JsonResponse
    {
        $result = $this->authService->revertRole();

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Get Available Roles (Passepartout only)
     * GET /api/v2/auth/available-roles
     */
    public function availableRoles(Request $request): JsonResponse
    {
        $user = $request->user();

        // Check if passepartout
        if (!in_array($user->role, ['admin', 'project_master'])) {
            // Regular user: return their assigned roles
            $roles = $user->roles->pluck('role')->toArray();
            if (!in_array($user->role, $roles)) {
                array_unshift($roles, $user->role);
            }
        } else {
            // Passepartout: all roles
            $roles = \App\Models\UserRole::availableRoles();
        }

        return response()->json([
            'success' => true,
            'roles' => $roles,
            'is_passepartout' => in_array($user->role, ['admin', 'project_master']),
        ], 200);
    }
}
