<?php

/*
|--------------------------------------------------------------------------
| API Routes V2 - Sistema Autenticazione Enterprise
|--------------------------------------------------------------------------
|
| Nuove routes per il sistema di autenticazione completamente rifatto
| 
*/

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\V2\AuthController;

// Prefix: /api/v2

Route::prefix('v2')->group(function () {
    
    // ===================================
    // AUTH ROUTES - Public (no auth required)
    // ===================================
    
    Route::prefix('auth')->group(function () {
        
        // Login Step 1: Credentials
        Route::post('/login', [AuthController::class, 'login'])
            ->middleware('throttle:5,1'); // 5 attempts per minute
        
        // Login Step 2: 2FA Verification
        Route::post('/2fa/verify-email', [AuthController::class, 'verify2FAEmail'])
            ->middleware('throttle:5,1');
        
        Route::post('/2fa/verify-passphrase', [AuthController::class, 'verify2FAPassphrase'])
            ->middleware('throttle:5,1');
        
        Route::post('/2fa/verify-backup', [AuthController::class, 'verifyBackupCode'])
            ->middleware('throttle:5,1');
        
        // Resend 2FA code
        Route::post('/2fa/resend', [AuthController::class, 'resend2FACode'])
            ->middleware('throttle:3,1'); // 3 resends per minute max
        
        // ===================================
        // AUTH ROUTES - Protected (requires token)
        // ===================================
        
        Route::middleware('auth:sanctum')->group(function () {
            
            // Current user info
            Route::get('/me', [AuthController::class, 'me']);
            
            // Logout
            Route::post('/logout', [AuthController::class, 'logout']);
            
            // Refresh token
            Route::post('/refresh', [AuthController::class, 'refresh']);
            
            // Role Switching (Passepartout)
            Route::post('/switch-role', [AuthController::class, 'switchRole']);
            Route::post('/revert-role', [AuthController::class, 'revertRole']);
            Route::get('/available-roles', [AuthController::class, 'availableRoles']);
        });
    });
    
    // ===================================
    // SECURITY SETTINGS - Protected
    // ===================================
    
    Route::middleware('auth:sanctum')->prefix('security')->group(function () {
        
        // TODO: Implement SecurityController for:
        // - GET /settings - Get security settings
        // - PUT /settings - Update security settings
        // - POST /2fa/enable - Enable 2FA
        // - POST /2fa/disable - Disable 2FA
        // - POST /2fa/setup-passphrase - Setup passphrase
        // - POST /2fa/generate-backup-codes - Generate backup codes
        // - GET /trusted-devices - List trusted devices
        // - DELETE /trusted-devices/{fingerprint} - Remove trusted device
        // - GET /sessions - List active sessions
        // - DELETE /sessions/{id} - Revoke session
        // - POST /change-password - Change password
        
    });
});
