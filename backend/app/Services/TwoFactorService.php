<?php

namespace App\Services;

use App\Models\User;
use App\Models\TwoFactorCode;
use App\Mail\TwoFactorCodeMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;

class TwoFactorService
{
    /**
     * Generate and send 2FA code via email
     */
    public function generateAndSendCode(User $user, string $type = 'login'): TwoFactorCode
    {
        // Invalidate previous codes
        TwoFactorCode::where('user_id', $user->id)
            ->where('type', $type)
            ->where('verified', false)
            ->delete();

        // Generate 6-digit code
        $code = $this->generateCode();

        // Create code record
        $twoFactorCode = TwoFactorCode::create([
            'user_id' => $user->id,
            'code' => $code,
            'type' => $type,
            'expires_at' => now()->addMinutes(10),
            'max_attempts' => 5,
        ]);

        // Send email
        try {
            Mail::to($user->email)->send(new TwoFactorCodeMail($user, $code));
        } catch (\Exception $e) {
            \Log::error('Failed to send 2FA code email', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            throw new \Exception('Failed to send verification code. Please try again.');
        }

        return $twoFactorCode;
    }

    /**
     * Verify 2FA code
     */
    public function verifyCode(User $user, string $code, string $type = 'login'): bool
    {
        $twoFactorCode = TwoFactorCode::where('user_id', $user->id)
            ->where('type', $type)
            ->where('verified', false)
            ->where('expires_at', '>', now())
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$twoFactorCode) {
            return false;
        }

        // Check max attempts
        if ($twoFactorCode->hasReachedMaxAttempts()) {
            return false;
        }

        // Check code match
        if ($twoFactorCode->code !== $code) {
            $twoFactorCode->incrementAttempts();
            return false;
        }

        // Mark as verified
        $twoFactorCode->markAsVerified();

        return true;
    }

    /**
     * Generate backup codes
     */
    public function generateBackupCodes(User $user, int $count = 10): array
    {
        $codes = [];
        
        for ($i = 0; $i < $count; $i++) {
            $codes[] = strtoupper(Str::random(8));
        }

        // Hash and store
        $hashedCodes = array_map(function($code) {
            return [
                'code' => \Hash::make($code),
                'used' => false,
                'generated_at' => now()->toIso8601String(),
            ];
        }, $codes);

        $user->securitySettings->update([
            'backup_codes' => $hashedCodes,
            'backup_codes_generated_at' => now(),
        ]);

        return $codes; // Return plain codes to show to user ONE TIME
    }

    /**
     * Verify backup code
     */
    public function verifyBackupCode(User $user, string $code): bool
    {
        return $user->securitySettings->verifyBackupCode($code);
    }

    /**
     * Enable 2FA for user
     */
    public function enable2FA(User $user, string $type = 'email'): void
    {
        $user->securitySettings->update([
            'two_factor_enabled' => true,
            'two_factor_type' => $type,
        ]);
    }

    /**
     * Disable 2FA for user
     */
    public function disable2FA(User $user): void
    {
        $user->securitySettings->update([
            'two_factor_enabled' => false,
            'two_factor_type' => null,
            'passphrase_hash' => null,
        ]);
    }

    /**
     * Check if user needs 2FA
     */
    public function requires2FA(User $user, ?string $deviceFingerprint = null): bool
    {
        $settings = $user->securitySettings;

        if (!$settings || !$settings->two_factor_enabled) {
            return false;
        }

        // Check if device is trusted
        if ($deviceFingerprint && $settings->isDeviceTrusted($deviceFingerprint)) {
            return false;
        }

        // Check if IP is trusted
        if ($settings->isIpTrusted(request()->ip())) {
            return false;
        }

        return true;
    }

    /**
     * Get 2FA method
     */
    public function get2FAMethod(User $user): ?string
    {
        return $user->securitySettings?->get2FAMethod();
    }

    /**
     * Cleanup expired codes (call from scheduler)
     */
    public function cleanupExpiredCodes(): int
    {
        return TwoFactorCode::cleanupExpired()->delete();
    }

    /**
     * Generate random 6-digit code
     */
    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
