<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkspaceBranch extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'workspace_type_code',
        'name',
        'description',
        'git_branch',
        'color',
        'sort_order',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(WorkspaceBranchRole::class, 'branch_id');
    }

    public function agents(): HasMany
    {
        return $this->hasMany(WorkspaceAgent::class, 'branch_id');
    }

    public function userTasks(): HasMany
    {
        return $this->hasMany(WorkspaceUserTask::class, 'branch_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}