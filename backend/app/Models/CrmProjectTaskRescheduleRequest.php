<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTaskRescheduleRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_task_id',
        'user_id',
        'current_due_date',
        'requested_due_date',
        'reason',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected $casts = [
        'current_due_date' => 'date',
        'requested_due_date' => 'date',
        'reviewed_at' => 'datetime',
    ];

    /**
     * Relazione con Task
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_project_task_id');
    }

    /**
     * Relazione con User (richiedente)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relazione con User (revisore)
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Scope per richieste pending
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope per richieste approvate
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }
}

