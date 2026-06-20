<?php

namespace App\Models;

use App\Enums\FocusSlotType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FocusSessionSlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'focus_session_id',
        'focus_task_id',
        'slot_type',
        'title',
        'start_time',
        'end_time',
        'duration_minutes',
        'is_completed',
        'sort_order',
        'notes',
    ];

    protected $casts = [
        'slot_type'        => FocusSlotType::class,
        'is_completed'     => 'boolean',
        'duration_minutes' => 'integer',
        'sort_order'       => 'integer',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(FocusSession::class, 'focus_session_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(FocusTask::class, 'focus_task_id');
    }
}
