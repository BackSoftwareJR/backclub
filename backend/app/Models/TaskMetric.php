<?php

namespace App\Models;

use App\Enums\CognitiveLoad;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'focus_task_id',
        'crm_task_id',
        'title_snapshot',
        'tags_snapshot',
        'cognitive_load',
        'estimated_minutes',
        'actual_minutes',
        'mental_fatigue_score',
        'time_of_day_hour',
        'day_of_week',
        'accuracy_ratio',
    ];

    protected $casts = [
        'cognitive_load'      => CognitiveLoad::class,
        'tags_snapshot'       => 'array',
        'estimated_minutes'   => 'integer',
        'actual_minutes'      => 'integer',
        'mental_fatigue_score' => 'integer',
        'time_of_day_hour'    => 'integer',
        'day_of_week'         => 'integer',
        'accuracy_ratio'      => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function focusTask(): BelongsTo
    {
        return $this->belongsTo(FocusTask::class);
    }

    public function crmTask(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_task_id');
    }
}
