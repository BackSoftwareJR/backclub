<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserWorkspacePreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'workspace_type_code',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workspaceType(): BelongsTo
    {
        return $this->belongsTo(WorkspaceType::class, 'workspace_type_code', 'code');
    }
}