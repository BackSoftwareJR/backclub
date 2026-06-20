<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FocusAnalysisReport extends Model
{
    protected $fillable = [
        'user_id',
        'report_type',
        'subject_id',
        'subject_name',
        'status',
        'content',
        'error_message',
        'analyzed_at',
        'expires_at',
        'sort_order',
    ];

    protected $casts = [
        'content'     => 'array',
        'analyzed_at' => 'datetime',
        'expires_at'  => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isFresh(): bool
    {
        return $this->status === 'ready'
            && $this->expires_at !== null
            && $this->expires_at->isFuture();
    }
}
