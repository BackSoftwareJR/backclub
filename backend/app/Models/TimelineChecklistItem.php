<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimelineChecklistItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'step_id',
        'text',
        'is_completed',
        'sort_order',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'sort_order'   => 'integer',
    ];

    public function step(): BelongsTo
    {
        return $this->belongsTo(TimelineStep::class, 'step_id');
    }
}
