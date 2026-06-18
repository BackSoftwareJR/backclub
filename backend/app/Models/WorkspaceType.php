<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkspaceType extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'color',
        'icon',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function userPreferences(): HasMany
    {
        return $this->hasMany(UserWorkspacePreference::class, 'workspace_type_code', 'code');
    }
}