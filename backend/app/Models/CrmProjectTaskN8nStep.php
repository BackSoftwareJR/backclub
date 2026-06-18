<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTaskN8nStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_task_id',
        'step_key',
        'title',
        'message',
        'status',
        'payload',
        'sort_order',
    ];

    protected $casts = [
        'payload' => 'array',
        'sort_order' => 'integer',
    ];

    /**
     * Relazione con CrmProjectTask
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_project_task_id');
    }

    /**
     * Scope per ordinare per sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('created_at');
    }

    /**
     * Scope per stato
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }
}