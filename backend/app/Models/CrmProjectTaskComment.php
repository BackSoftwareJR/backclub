<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTaskComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_task_id',
        'user_id',
        'comment',
        'is_note',
    ];

    protected $casts = [
        'is_note' => 'boolean',
    ];

    /**
     * Relazione con Task
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_project_task_id');
    }

    /**
     * Relazione con User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

