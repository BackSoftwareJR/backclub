<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFocusPreference extends Model
{
    protected $fillable = [
        'user_id',
        'preferred_start_time',
        'preferred_end_time',
        'max_daily_hours',
        'lunch_break_enabled',
        'lunch_start_time',
        'lunch_duration_minutes',
        'preferred_focus_block_duration',
        'break_between_focus_blocks',
        'working_days',
        'preferred_cognitive_morning',
        'preferred_cognitive_afternoon',
        'rest_reminder_enabled',
        'notes',
    ];

    protected $casts = [
        'working_days'          => 'array',
        'lunch_break_enabled'   => 'boolean',
        'rest_reminder_enabled' => 'boolean',
        'max_daily_hours'       => 'integer',
        'lunch_duration_minutes' => 'integer',
        'preferred_focus_block_duration' => 'integer',
        'break_between_focus_blocks'     => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
