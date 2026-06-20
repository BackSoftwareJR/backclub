<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceUserTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'branch_id',
        'user_id',
        'title',
        'description',
        'status',
        'priority',
        'due_date',
        'completed_at',
        'sort_order',
        'completion_group_id',
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_at' => 'datetime',
        'completion_group_id' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(WorkspaceBranch::class, 'branch_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}