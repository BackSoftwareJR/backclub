<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSecuritySetting extends Model
{
    use HasFactory;

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
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $hidden = [
        'passphrase_hash',
        'backup_codes',
        'password_history',
    ];

    /**
     * Relazione: Utente proprietario
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Abilita 2FA
     */
    public function enable2FA(string $type = 'email'): void
    {
        $this->two_factor_enabled = true;
        $this->two_factor_type = $type;
        $this->save();
    }

    /**
     * Disabilita 2FA
     */
    public function disable2FA(): void
    {
        $this->two_factor_enabled = false;
        $this->two_factor_type = null;
        $this->passphrase_hash = null;
        $this->backup_codes = null;
        $this->backup_codes_generated_at = null;
        $this->save();
    }

    /**
     * Imposta passphrase (hashed)
     */
    public function setPassphrase(string $passphrase): void
    {
        $this->passphrase_hash = Hash::make($passphrase);
        $this->save();
    }

    /**
     * Verifica passphrase
     */
    public function verifyPassphrase(string $passphrase): bool
    {
        if (!$this->passphrase_hash) {
            return false;
        }

        return Hash::check($passphrase, $this->passphrase_hash);
    }

    /**
     * Genera codici backup (10 codici alfanumerici di 8 caratteri)
     */
    public function generateBackupCodes(int $count = 10): array
    {
        $codes = [];
        
        for ($i = 0; $i < $count; $i++) {
            $code = strtoupper(Str::random(8));
            $codes[] = [
                'code' => $code,
                'hash' => Hash::make($code),
                'used' => false,
                'used_at' => null,
            ];
        }

        $this->backup_codes = $codes;
        $this->backup_codes_generated_at = now();
        $this->save();

        // Ritorna i codici in chiaro (una tantum)
        return array_column($codes, 'code');
    }

    /**
     * Verifica backup code
     */
    public function verifyBackupCode(string $code): bool
    {
        if (!$this->backup_codes) {
            return false;
        }

        $codes = $this->backup_codes;

        foreach ($codes as $index => $backupCode) {
            if ($backupCode['used']) {
                continue;
            }

            if (Hash::check($code, $backupCode['hash'])) {
                // Marca come usato
                $codes[$index]['used'] = true;
                $codes[$index]['used_at'] = now()->toDateTimeString();
                $this->backup_codes = $codes;
                $this->save();
                
                return true;
            }
        }

        return false;
    }

    /**
     * Conta backup codes rimanenti
     */
    public function remainingBackupCodes(): int
    {
        if (!$this->backup_codes) {
            return 0;
        }

        return count(array_filter($this->backup_codes, fn($code) => !$code['used']));
    }

    /**
     * Verifica se IP è fidato
     */
    public function isTrustedIp(?string $ip = null): bool
    {
        $ip = $ip ?? request()->ip();
        
        if (!$this->trusted_ips) {
            return false;
        }

        return in_array($ip, $this->trusted_ips);
    }

    /**
     * Aggiungi IP fidato
     */
    public function trustIp(?string $ip = null): void
    {
        $ip = $ip ?? request()->ip();
        $trustedIps = $this->trusted_ips ?? [];
        
        if (!in_array($ip, $trustedIps)) {
            $trustedIps[] = $ip;
            $this->trusted_ips = $trustedIps;
            $this->save();
        }
    }

    /**
     * Rimuovi IP fidato
     */
    public function untrustIp(string $ip): void
    {
        $trustedIps = $this->trusted_ips ?? [];
        $this->trusted_ips = array_values(array_diff($trustedIps, [$ip]));
        $this->save();
    }

    /**
     * Verifica se device è fidato
     */
    public function isTrustedDevice(string $deviceId): bool
    {
        if (!$this->trusted_devices) {
            return false;
        }

        return in_array($deviceId, array_column($this->trusted_devices, 'id'));
    }

    /**
     * Aggiungi device fidato
     */
    public function trustDevice(string $deviceId, array $deviceInfo = []): void
    {
        $trustedDevices = $this->trusted_devices ?? [];
        
        // Verifica se già esiste
        foreach ($trustedDevices as $device) {
            if ($device['id'] === $deviceId) {
                return;
            }
        }

        $trustedDevices[] = array_merge([
            'id' => $deviceId,
            'added_at' => now()->toDateTimeString(),
        ], $deviceInfo);

        $this->trusted_devices = $trustedDevices;
        $this->save();
    }

    /**
     * Rimuovi device fidato
     */
    public function untrustDevice(string $deviceId): void
    {
        $trustedDevices = $this->trusted_devices ?? [];
        $this->trusted_devices = array_values(
            array_filter($trustedDevices, fn($device) => $device['id'] !== $deviceId)
        );
        $this->save();
    }

    /**
     * Aggiungi password allo storico
     */
    public function addPasswordToHistory(string $passwordHash): void
    {
        $history = $this->password_history ?? [];
        
        // Mantieni solo ultime 5 password
        array_unshift($history, [
            'hash' => $passwordHash,
            'changed_at' => now()->toDateTimeString(),
        ]);
        
        $this->password_history = array_slice($history, 0, 5);
        $this->last_password_change = now();
        $this->save();
    }

    /**
     * Verifica se password è stata usata recentemente
     */
    public function isPasswordInHistory(string $password): bool
    {
        if (!$this->password_history) {
            return false;
        }

        foreach ($this->password_history as $old) {
            if (Hash::check($password, $old['hash'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Verifica se password è scaduta
     */
    public function isPasswordExpired(): bool
    {
        if (!$this->password_expires_at) {
            return false;
        }

        return $this->password_expires_at->isPast();
    }

    /**
     * Imposta scadenza password (es: 90 giorni)
     */
    public function setPasswordExpiration(int $days = 90): void
    {
        $this->password_expires_at = now()->addDays($days);
        $this->save();
    }
}

