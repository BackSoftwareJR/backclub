<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadActivity extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'lead_id',
        'user_id',
        'activity_type',
        'description',
        'outcome',
        'email_details',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'email_details' => 'array',
    ];

    /**
     * Boot del model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($activity) {
            $activity->created_at = now();
        });
    }

    /**
     * Relazione con Lead
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Relazione con User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope per tipo attività
     */
    public function scopeByType($query, $type)
    {
        return $query->where('activity_type', $type);
    }
}

