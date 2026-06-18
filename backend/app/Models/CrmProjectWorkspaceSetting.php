<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectWorkspaceSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'workspace_type_code',
        'is_enabled',
        'staging_url',
        'preview_url',
        'settings',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'settings' => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class);
    }
}