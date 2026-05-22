<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerCommission extends Model
{
    protected $fillable = [
        'seller_id',
        'contract_id',
        'payment_plan_id',
        'invoice_id',
        'installment_id',
        'amount',
        'commission_rate',
        'status',
        'invoice_issued_at',
        'invoice_paid_at',
        'collected_at',
        'receipt_link',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'invoice_issued_at' => 'datetime',
        'invoice_paid_at' => 'datetime',
        'collected_at' => 'datetime',
    ];

    // Relationships
    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function paymentPlan(): BelongsTo
    {
        return $this->belongsTo(PaymentPlan::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function installment(): BelongsTo
    {
        return $this->belongsTo(PaymentPlanInstallment::class, 'installment_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePendingCollection($query)
    {
        return $query->where('status', 'pending_collection');
    }

    public function scopeCollected($query)
    {
        return $query->where('status', 'collected');
    }

    public function scopeForSeller($query, $sellerId)
    {
        return $query->where('seller_id', $sellerId);
    }

    public function scopeForContract($query, $contractId)
    {
        return $query->where('contract_id', $contractId);
    }

    // Accessors
    public function getStatusLabelAttribute()
    {
        return match($this->status) {
            'pending' => 'In Attesa',
            'pending_collection' => 'In Attesa di Riscossione',
            'collected' => 'Riscossa',
            default => ucfirst($this->status),
        };
    }
}
