<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTaskN8nStep extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_RUNNING = 'running';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    public const ACTOR_AGENT = 'agent';
    public const ACTOR_SYSTEM = 'system';

    protected $fillable = [
        'crm_project_task_id',
        'step_key',
        'step_index',
        'status',
        'title',
        'message',
        'actor_type',
        'actor_name',
        'payload',
        'progress',
        'is_final',
    ];

    protected $casts = [
        'payload' => 'array',
        'is_final' => 'boolean',
        'progress' => 'integer',
        'step_index' => 'integer',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_project_task_id');
    }
}
