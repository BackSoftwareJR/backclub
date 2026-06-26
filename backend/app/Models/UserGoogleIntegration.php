<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserGoogleIntegration extends Model
{
    protected $connection = 'mysql_marketing';

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
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
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
}
