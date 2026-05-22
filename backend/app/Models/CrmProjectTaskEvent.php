<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTaskEvent extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'crm_project_task_id',
        'user_id',
        'event_type',
        'event_data',
        'description',
    ];

    protected $casts = [
        'event_data' => 'array',
        'created_at' => 'datetime',
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

    /**
     * Scope per tipo di evento
     */
    public function scopeByType($query, $type)
    {
        return $query->where('event_type', $type);
    }
}

