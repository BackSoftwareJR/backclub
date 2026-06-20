<?php

namespace App\Models;

use App\Enums\FocusSessionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FocusSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'session_date',
        'status',
        'llm_prompt_used',
        'llm_response_raw',
        'generated_at',
        'total_estimated_minutes',
        'completed_tasks_count',
    ];

    protected $casts = [
        'status'                  => FocusSessionStatus::class,
        'llm_response_raw'        => 'array',
        'session_date'            => 'date',
        'generated_at'            => 'datetime',
        'total_estimated_minutes' => 'integer',
        'completed_tasks_count'   => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function slots(): HasMany
    {
        return $this->hasMany(FocusSessionSlot::class)->orderBy('sort_order');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(AssistantConversation::class);
    }
}
