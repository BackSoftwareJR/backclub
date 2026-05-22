<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TimelineStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'phase_id',
        'title',
        'description',
        'date_order',
        'is_completed',
        'completed_at',
        'sort_order',
    ];

    protected $casts = [
        'date_order'   => 'date',
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
        'sort_order'   => 'integer',
    ];

    public function phase(): BelongsTo
    {
        return $this->belongsTo(TimelinePhase::class, 'phase_id');
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(TimelineChecklistItem::class, 'step_id')->orderBy('sort_order');
    }

    /**
     * Checklist progress 0-100
     */
    public function getChecklistProgressAttribute(): int
    {
        $total = $this->checklistItems->count();
        if ($total === 0) return 0;
        return (int) round(($this->checklistItems->where('is_completed', true)->count() / $total) * 100);
    }
}
