<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentPlanRenewal extends Model
{
    protected $fillable = [
        'payment_plan_id',
        'renewal_type',
        'frequency',
        'start_date',
        'end_date',
        'months_count',
        'fixed_amount',
        'variable_amounts',
        'current_month_formula',
        'is_active',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'fixed_amount' => 'decimal:2',
        'variable_amounts' => 'array',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function paymentPlan(): BelongsTo
    {
        return $this->belongsTo(PaymentPlan::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFixed($query)
    {
        return $query->where('renewal_type', 'fixed');
    }

    public function scopeVariable($query)
    {
        return $query->where('renewal_type', 'variable');
    }
}
