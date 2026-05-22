<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;

class UserSecuritySettings extends Model
{
    protected $fillable = [
        'user_id',
        'two_factor_enabled',
        'two_factor_type',
        'passphrase_hash',
        'backup_codes',
        'backup_codes_generated_at',
        'trusted_ips',
        'trusted_devices',
        'last_password_change',
        'password_expires_at',
        'require_password_change',
        'password_history',
        'login_notifications',
        'session_timeout_minutes',
        'max_concurrent_sessions',
    ];

    protected $casts = [
        'two_factor_enabled' => 'boolean',
        'backup_codes' => 'array',
        'backup_codes_generated_at' => 'datetime',
        'trusted_ips' => 'array',
        'trusted_devices' => 'array',
        'last_password_change' => 'datetime',
        'password_expires_at' => 'datetime',
        'require_password_change' => 'boolean',
        'password_history' => 'array',
        'login_notifications' => 'boolean',
        'session_timeout_minutes' => 'integer',
        'max_concurrent_sessions' => 'integer',
    ];

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if passphrase is set
     */
    public function hasPassphrase(): bool
    {
        return !empty($this->passphrase_hash);
    }

    /**
     * Verify passphrase
     */
    public function verifyPassphrase(string $passphrase): bool
    {
        if (!$this->hasPassphrase()) {
            return false;
        }

        return Hash::check($passphrase, $this->passphrase_hash);
    }

    /**
     * Set passphrase
     */
    public function setPassphrase(string $passphrase): void
    {
        $this->update([
            'passphrase_hash' => Hash::make($passphrase)
        ]);
    }

    /**
     * Check if device is trusted
     */
    public function isDeviceTrusted(string $fingerprint): bool
    {
        if (empty($this->trusted_devices)) {
            return false;
        }

        foreach ($this->trusted_devices as $device) {
            if ($device['fingerprint'] === $fingerprint) {
                // Check if not expired (90 days)
                $trustedAt = \Carbon\Carbon::parse($device['trusted_at']);
                return $trustedAt->addDays(90)->isFuture();
            }
        }

        return false;
    }

    /**
     * Add trusted device
     */
    public function addTrustedDevice(string $fingerprint, array $deviceInfo = []): void
    {
        $devices = $this->trusted_devices ?? [];
        
        $devices[] = [
            'fingerprint' => $fingerprint,
            'trusted_at' => now()->toIso8601String(),
            'device_info' => $deviceInfo,
        ];

        $this->update(['trusted_devices' => $devices]);
    }

    /**
     * Remove trusted device
     */
    public function removeTrustedDevice(string $fingerprint): void
    {
        $devices = $this->trusted_devices ?? [];
        
        $devices = array_filter($devices, function($device) use ($fingerprint) {
            return $device['fingerprint'] !== $fingerprint;
        });

        $this->update(['trusted_devices' => array_values($devices)]);
    }

    /**
     * Check if IP is trusted
     */
    public function isIpTrusted(string $ip): bool
    {
        return in_array($ip, $this->trusted_ips ?? []);
    }

    /**
     * Check if backup code is valid
     */
    public function verifyBackupCode(string $code): bool
    {
        if (empty($this->backup_codes)) {
            return false;
        }

        foreach ($this->backup_codes as $index => $backupCode) {
            if (!$backupCode['used'] && Hash::check($code, $backupCode['code'])) {
                // Mark as used
                $codes = $this->backup_codes;
                $codes[$index]['used'] = true;
                $codes[$index]['used_at'] = now()->toIso8601String();
                $this->update(['backup_codes' => $codes]);
                
                return true;
            }
        }

        return false;
    }

    /**
     * Check if 2FA is required
     */
    public function requires2FA(): bool
    {
        return $this->two_factor_enabled;
    }

    /**
     * Get 2FA method
     */
    public function get2FAMethod(): ?string
    {
        return $this->two_factor_enabled ? $this->two_factor_type : null;
    }
}
