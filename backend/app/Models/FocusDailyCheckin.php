<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FocusDailyCheckin extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'energy_level',
        'available_hours',
        'selected_project_ids',
        'fixed_events',
        'special_priority',
        'free_note',
    ];

    protected $casts = [
        'date'                 => 'date',
        'selected_project_ids' => 'array',
        'fixed_events'         => 'array',
        'energy_level'         => 'integer',
        'available_hours'      => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
