<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicProjectGoogleIntegration extends Model
{
    protected $connection = 'mysql_marketing';

    protected $fillable = [
        'organic_web_project_id',
        'user_id',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'connected_at',
        'gsc_property_url',
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
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
