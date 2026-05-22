<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoginSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'token_id',
        'ip_address',
        'user_agent',
        'device_type',
        'device_name',
        'browser',
        'os',
        'location_city',
        'location_country',
        'is_current',
        'is_trusted',
        'last_activity',
        'expires_at',
        'revoked_at',
        'revoke_reason',
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'is_trusted' => 'boolean',
        'last_activity' => 'datetime',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relazione: Utente
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relazione: Token Sanctum
     */
    public function token()
    {
        return $this->belongsTo(\Laravel\Sanctum\PersonalAccessToken::class, 'token_id');
    }

    /**
     * Scope: Sessioni attive (non revocate e non scadute)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('revoked_at')
                    ->where(function ($q) {
                        $q->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                    });
    }

    /**
     * Scope: Sessione corrente
     */
    public function scopeCurrent($query)
    {
        return $query->where('is_current', true);
    }

    /**
     * Scope: Sessioni fidate
     */
    public function scopeTrusted($query)
    {
        return $query->where('is_trusted', true);
    }

    /**
     * Crea nuova sessione
     */
    public static function createSession(User $user, $token = null, array $options = []): self
    {
        $userAgent = request()->userAgent() ?? 'Unknown';
        
        $session = self::create(array_merge([
            'user_id' => $user->id,
            'token_id' => $token?->id,
            'ip_address' => request()->ip(),
            'user_agent' => $userAgent,
            'device_type' => self::detectDeviceType($userAgent),
            'device_name' => self::getDeviceName($userAgent),
            'browser' => self::detectBrowser($userAgent),
            'os' => self::detectOS($userAgent),
            'is_current' => true,
            'last_activity' => now(),
            'expires_at' => $options['expires_at'] ?? now()->addDays(30),
        ], $options));

        // Marca altre sessioni come non correnti
        self::where('user_id', $user->id)
            ->where('id', '!=', $session->id)
            ->update(['is_current' => false]);

        return $session;
    }

    /**
     * Aggiorna attività sessione
     */
    public function updateActivity(): void
    {
        $this->last_activity = now();
        $this->save();
    }

    /**
     * Revoca sessione
     */
    public function revoke(string $reason = 'User logout'): void
    {
        $this->revoked_at = now();
        $this->revoke_reason = $reason;
        $this->save();

        // Revoca anche il token Sanctum se esiste
        if ($this->token) {
            $this->token->delete();
        }
    }

    /**
     * Verifica se sessione è attiva
     */
    public function isActive(): bool
    {
        return $this->revoked_at === null && 
               ($this->expires_at === null || $this->expires_at->isFuture());
    }

    /**
     * Verifica se sessione è scaduta
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Verifica se sessione è revocata
     */
    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    /**
     * Ottieni durata sessione in secondi
     */
    public function getDurationSeconds(): int
    {
        $end = $this->revoked_at ?? now();
        return $this->created_at->diffInSeconds($end);
    }

    /**
     * Ottieni tempo dall'ultima attività (human readable)
     */
    public function getLastActivityHuman(): string
    {
        return $this->last_activity->diffForHumans();
    }

    /**
     * Rileva tipo device dal user agent
     */
    private static function detectDeviceType(string $userAgent): string
    {
        $userAgent = strtolower($userAgent);
        
        if (preg_match('/(tablet|ipad|playbook)|(android(?!.*mobile))/i', $userAgent)) {
            return 'tablet';
        }
        if (preg_match('/(mobile|iphone|ipod|blackberry|android|windows phone)/i', $userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }

    /**
     * Rileva browser dal user agent
     */
    private static function detectBrowser(string $userAgent): string
    {
        if (preg_match('/MSIE/i', $userAgent)) return 'Internet Explorer';
        if (preg_match('/Firefox/i', $userAgent)) return 'Firefox';
        if (preg_match('/Chrome/i', $userAgent)) return 'Chrome';
        if (preg_match('/Safari/i', $userAgent)) return 'Safari';
        if (preg_match('/Opera/i', $userAgent)) return 'Opera';
        if (preg_match('/Edge/i', $userAgent)) return 'Edge';
        return 'Unknown';
    }

    /**
     * Rileva OS dal user agent
     */
    private static function detectOS(string $userAgent): string
    {
        if (preg_match('/windows/i', $userAgent)) return 'Windows';
        if (preg_match('/macintosh|mac os x/i', $userAgent)) return 'macOS';
        if (preg_match('/linux/i', $userAgent)) return 'Linux';
        if (preg_match('/ubuntu/i', $userAgent)) return 'Ubuntu';
        if (preg_match('/iphone/i', $userAgent)) return 'iOS';
        if (preg_match('/ipad/i', $userAgent)) return 'iPadOS';
        if (preg_match('/android/i', $userAgent)) return 'Android';
        return 'Unknown';
    }

    /**
     * Ottieni nome device friendly
     */
    private static function getDeviceName(string $userAgent): string
    {
        $browser = self::detectBrowser($userAgent);
        $os = self::detectOS($userAgent);
        $type = self::detectDeviceType($userAgent);
        
        return "$browser on $os ($type)";
    }

    /**
     * Pulisci sessioni scadute per utente
     */
    public static function cleanExpiredForUser(User $user): int
    {
        return self::where('user_id', $user->id)
            ->where('expires_at', '<', now())
            ->whereNull('revoked_at')
            ->update([
                'revoked_at' => now(),
                'revoke_reason' => 'Expired automatically'
            ]);
    }

    /**
     * Conta sessioni attive per utente
     */
    public static function countActiveForUser(User $user): int
    {
        return self::where('user_id', $user->id)
            ->active()
            ->count();
    }

    /**
     * Revoca tutte le sessioni tranne quella corrente
     */
    public static function revokeAllExceptCurrent(User $user, string $currentSessionId): int
    {
        return self::where('user_id', $user->id)
            ->where('id', '!=', $currentSessionId)
            ->active()
            ->update([
                'revoked_at' => now(),
                'revoke_reason' => 'Revoked by user'
            ]);
    }
}

