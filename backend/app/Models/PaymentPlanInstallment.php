<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentPlanInstallment extends Model
{
    protected $fillable = [
        'payment_plan_id',
        'installment_number',
        'due_date',
        'amount',
        'original_amount',
        'discount_amount',
        'discount_reason',
        'description',
        'invoice_id',
        'status',
        'payment_type',
        'payment_schedule_type',
        'color_code',
    ];

    protected $casts = [
        'due_date' => 'date',
        'amount' => 'decimal:2',
        'original_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
    ];

    // Relationships
    public function paymentPlan(): BelongsTo
    {
        return $this->belongsTo(PaymentPlan::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeInvoiced($query)
    {
        return $query->where('status', 'invoiced');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
            ->orWhere(function($q) {
                $q->where('status', 'pending')
                  ->where('due_date', '<', now()->toDateString());
            });
    }

    public function scopeDueBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('due_date', [$startDate, $endDate]);
    }
}
