<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Timeline extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'color',
        'share_token',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function phases(): HasMany
    {
        return $this->hasMany(TimelinePhase::class)->orderBy('sort_order')->orderBy('start_date');
    }

    /**
     * Computed: total steps count across all phases
     */
    public function getTotalStepsAttribute(): int
    {
        return $this->phases->sum(fn($phase) => $phase->steps->count());
    }

    /**
     * Computed: completed steps count across all phases
     */
    public function getCompletedStepsAttribute(): int
    {
        return $this->phases->sum(fn($phase) => $phase->steps->where('is_completed', true)->count());
    }
}
