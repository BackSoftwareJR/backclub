<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    protected $table = 'expense_categories';

    protected $fillable = [
        'parent_id',
        'code',
        'name',
        'description',
        'icon',
        'color',
        'budget_monthly',
        'budget_yearly',
        'requires_approval',
        'approval_threshold',
        'auto_approve_under',
        'accounting_code',
        'tax_deductible',
        'vat_rate',
        'is_active',
        'is_system',
        'sort_order',
    ];

    protected $casts = [
        'budget_monthly' => 'decimal:2',
        'budget_yearly' => 'decimal:2',
        'approval_threshold' => 'decimal:2',
        'auto_approve_under' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'requires_approval' => 'boolean',
        'tax_deductible' => 'boolean',
        'is_active' => 'boolean',
        'is_system' => 'boolean',
    ];

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    // ============================================================
    // SCOPES
    // ============================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRootCategories($query)
    {
        return $query->whereNull('parent_id')->orderBy('sort_order');
    }

    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    // ============================================================
    // METHODS
    // ============================================================

    public function needsApproval(float $amount): bool
    {
        if (!$this->requires_approval) {
            return false;
        }

        if ($this->auto_approve_under && $amount < $this->auto_approve_under) {
            return false;
        }

        if ($this->approval_threshold && $amount >= $this->approval_threshold) {
            return true;
        }

        return $this->requires_approval;
    }
}

