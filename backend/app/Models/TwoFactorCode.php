<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class TwoFactorCode extends Model
{
    protected $fillable = [
        'user_id',
        'code',
        'type',
        'verified',
        'attempts',
        'max_attempts',
        'expires_at',
    ];

    protected $casts = [
        'verified' => 'boolean',
        'expires_at' => 'datetime',
        'attempts' => 'integer',
        'max_attempts' => 'integer',
    ];

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if code is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if code has reached max attempts
     */
    public function hasReachedMaxAttempts(): bool
    {
        return $this->attempts >= $this->max_attempts;
    }

    /**
     * Increment attempts counter
     */
    public function incrementAttempts(): void
    {
        $this->increment('attempts');
    }

    /**
     * Mark code as verified
     */
    public function markAsVerified(): void
    {
        $this->update(['verified' => true]);
    }

    /**
     * Scope: Only valid codes
     */
    public function scopeValid($query)
    {
        return $query->where('verified', false)
                     ->where('expires_at', '>', now())
                     ->where('attempts', '<', 5);
    }

    /**
     * Scope: Cleanup expired codes
     */
    public function scopeCleanupExpired($query)
    {
        return $query->where('expires_at', '<', now()->subHours(24))
                     ->orWhere('verified', true);
    }
}
