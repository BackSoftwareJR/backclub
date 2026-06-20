<?php

namespace App\Models;

use App\Enums\CognitiveLoad;
use App\Enums\DeadlineType;
use App\Enums\FocusTaskStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FocusTask extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'crm_task_id',
        'title',
        'description',
        'cognitive_load',
        'deadline_type',
        'due_date',
        'due_time',
        'estimated_minutes',
        'priority_score',
        'status',
        'tags',
        'completed_at',
        'week_plan_date',
    ];

    protected $casts = [
        'cognitive_load'   => CognitiveLoad::class,
        'deadline_type'    => DeadlineType::class,
        'status'           => FocusTaskStatus::class,
        'tags'             => 'array',
        'due_date'         => 'date',
        'week_plan_date'   => 'date',
        'completed_at'     => 'datetime',
        'estimated_minutes' => 'integer',
        'priority_score'   => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function crmTask(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_task_id');
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(TaskMetric::class);
    }

    public function slots(): HasMany
    {
        return $this->hasMany(FocusSessionSlot::class);
    }
}
