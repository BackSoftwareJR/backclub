<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SecurityEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'email',
        'event_type',
        'severity',
        'description',
        'metadata',
        'ip_address',
        'user_agent',
        'location',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    // Disabilita updated_at (non serve per log)
    const UPDATED_AT = null;

    /**
     * Relazione: Utente (se autenticato)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope: Eventi critici
     */
    public function scopeCritical($query)
    {
        return $query->where('severity', 'critical');
    }

    /**
     * Scope: Eventi high priority
     */
    public function scopeHigh($query)
    {
        return $query->where('severity', 'high');
    }

    /**
     * Scope: Per tipo evento
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('event_type', $type);
    }

    /**
     * Scope: Eventi recenti
     */
    public function scopeRecent($query, int $hours = 24)
    {
        return $query->where('created_at', '>=', now()->subHours($hours));
    }

    /**
     * Log evento di sicurezza
     */
    public static function log(
        string $eventType,
        string $severity = 'low',
        ?User $user = null,
        ?string $email = null,
        ?string $description = null,
        array $metadata = []
    ): self {
        return self::create([
            'user_id' => $user?->id,
            'email' => $email ?? $user?->email,
            'event_type' => $eventType,
            'severity' => $severity,
            'description' => $description,
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log login fallito
     */
    public static function logLoginFailed(?string $email, string $reason = null): self
    {
        return self::log(
            'login_failed',
            'medium',
            null,
            $email,
            $reason ?? 'Invalid credentials',
            ['reason' => $reason]
        );
    }

    /**
     * Log login riuscito
     */
    public static function logLoginSuccess(User $user): self
    {
        return self::log(
            'login_success',
            'low',
            $user,
            null,
            'User logged in successfully'
        );
    }

    /**
     * Log 2FA fallito
     */
    public static function log2FAFailed(User $user, string $reason = null): self
    {
        return self::log(
            '2fa_failed',
            'high',
            $user,
            null,
            $reason ?? 'Invalid 2FA code',
            ['reason' => $reason]
        );
    }

    /**
     * Log attività sospetta
     */
    public static function logSuspiciousActivity(
        ?User $user,
        string $description,
        array $metadata = []
    ): self {
        return self::log(
            'suspicious_activity',
            'critical',
            $user,
            null,
            $description,
            $metadata
        );
    }

    /**
     * Log nuovo device
     */
    public static function logNewDeviceLogin(User $user, array $deviceInfo = []): self
    {
        return self::log(
            'new_device_login',
            'medium',
            $user,
            null,
            'Login from new device',
            $deviceInfo
        );
    }

    /**
     * Conta tentativi falliti recenti per email
     */
    public static function countRecentFailedAttempts(string $email, int $minutes = 10): int
    {
        return self::where('email', $email)
            ->where('event_type', 'login_failed')
            ->where('created_at', '>=', now()->subMinutes($minutes))
            ->count();
    }

    /**
     * Conta tentativi falliti 2FA recenti per utente
     */
    public static function countRecent2FAFailures(User $user, int $minutes = 10): int
    {
        return self::where('user_id', $user->id)
            ->where('event_type', '2fa_failed')
            ->where('created_at', '>=', now()->subMinutes($minutes))
            ->count();
    }
}

