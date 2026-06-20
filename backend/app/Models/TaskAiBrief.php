<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskAiBrief extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_task_id',
        'brief_json',
        'context_hash',
        'expires_at',
    ];

    protected $casts = [
        'brief_json' => 'array',
        'expires_at' => 'datetime',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_project_task_id');
    }
}
