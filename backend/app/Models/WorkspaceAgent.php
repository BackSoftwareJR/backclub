<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkspaceAgent extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'branch_id',
        'user_id',
        'title',
        'prompt',
        'exact_prompt',
        'status',
        'n8n_workflow_id',
        'n8n_execution_id',
        'queue_position',
        'logs',
        'result',
        'review_message',
        'started_at',
        'completed_at',
        'deleted_at',
    ];

    protected $casts = [
        'exact_prompt' => 'boolean',
        'queue_position' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'deleted_at' => 'datetime',
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