<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TimelinePhase extends Model
{
    use HasFactory;

    protected $fillable = [
        'timeline_id',
        'title',
        'description',
        'start_date',
        'end_date',
        'color',
        'sort_order',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
        'sort_order' => 'integer',
    ];

    public function timeline(): BelongsTo
    {
        return $this->belongsTo(Timeline::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(TimelineStep::class, 'phase_id')->orderBy('sort_order')->orderBy('date_order');
    }

    /**
     * Progress percentage based on completed steps
     */
    public function getProgressAttribute(): int
    {
        $total = $this->steps->count();
        if ($total === 0) return 0;
        return (int) round(($this->steps->where('is_completed', true)->count() / $total) * 100);
    }
}
