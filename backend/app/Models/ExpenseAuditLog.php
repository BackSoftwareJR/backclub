<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ExpenseAuditLog extends Model
{
    protected $table = 'expense_audit_log';

    public $timestamps = false;

    protected $fillable = [
        'auditable_type',
        'auditable_id',
        'action',
        'user_id',
        'ip_address',
        'user_agent',
        'old_values',
        'new_values',
        'metadata',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ============================================================
    // SCOPES
    // ============================================================

    public function scopeForModel($query, string $type, int $id)
    {
        return $query->where('auditable_type', $type)
                     ->where('auditable_id', $id);
    }

    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }
}

