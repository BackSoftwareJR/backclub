<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserWorkPattern extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'peak_hours',
        'avg_estimation_accuracy',
        'preferred_cognitive_loads',
        'total_tasks_completed',
        'avg_deep_work_minutes',
        'fatigue_threshold_hour',
        'last_recalculated_at',
    ];

    protected $casts = [
        'peak_hours'               => 'array',
        'preferred_cognitive_loads' => 'array',
        'avg_estimation_accuracy'  => 'decimal:2',
        'total_tasks_completed'    => 'integer',
        'avg_deep_work_minutes'    => 'integer',
        'fatigue_threshold_hour'   => 'integer',
        'last_recalculated_at'     => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
