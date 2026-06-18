<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class UserGoogleIntegration extends Model
{
    protected $fillable = [
        'user_id',
        'google_email',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'scopes',
        'calendar_id',
        'auto_sync_calls',
        'connected_at',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'token_expires_at' => 'datetime',
            'connected_at' => 'datetime',
            'scopes' => 'array',
            'auto_sync_calls' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function setAccessTokenAttribute(?string $value): void
    {
        $this->attributes['access_token'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getAccessTokenAttribute(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return null;
        }
    }

    public function setRefreshTokenAttribute(?string $value): void
    {
        $this->attributes['refresh_token'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getRefreshTokenAttribute(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
