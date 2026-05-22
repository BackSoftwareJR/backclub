<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PasswordResetToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'token',
        'expires_at',
        'used_at',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    // Disabilita updated_at (non serve)
    const UPDATED_AT = null;

    /**
     * Scope: Token non scaduti
     */
    public function scopeNotExpired($query)
    {
        return $query->where('expires_at', '>', now());
    }

    /**
     * Scope: Token non usati
     */
    public function scopeNotUsed($query)
    {
        return $query->whereNull('used_at');
    }

    /**
     * Scope: Token validi
     */
    public function scopeValid($query)
    {
        return $query->notExpired()->notUsed();
    }

    /**
     * Genera token reset password
     */
    public static function generate(string $email, int $validMinutes = 60): self
    {
        // Genera token sicuro
        $token = Str::random(64);

        // Elimina vecchi token per questa email
        self::where('email', $email)->delete();

        return self::create([
            'email' => $email,
            'token' => $token,
            'expires_at' => now()->addMinutes($validMinutes),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Verifica token
     */
    public static function verify(string $email, string $token): ?self
    {
        return self::where('email', $email)
            ->where('token', $token)
            ->valid()
            ->first();
    }

    /**
     * Marca come usato
     */
    public function markAsUsed(): bool
    {
        $this->used_at = now();
        return $this->save();
    }

    /**
     * Verifica se token è valido
     */
    public function isValid(): bool
    {
        return $this->expires_at->isFuture() && $this->used_at === null;
    }

    /**
     * Verifica se token è scaduto
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Verifica se token è stato usato
     */
    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    /**
     * Pulisci token scaduti o usati
     */
    public static function cleanExpired(): int
    {
        return self::where(function ($query) {
            $query->where('expires_at', '<', now())
                  ->orWhereNotNull('used_at');
        })->delete();
    }
}

