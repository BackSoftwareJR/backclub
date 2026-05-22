<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionPlan extends Model
{
    use SoftDeletes;

    protected $table = 'subscription_plans';

    protected $fillable = [
        'uscita_id',
        'service_name',
        'provider',
        'plan_type',
        'start_date',
        'end_date',
        'renewal_date',
        'billing_cycle',
        'auto_renew',
        'last_renewal_date',
        'card_last_4',
        'payment_method',
        'payment_method_id',
        'account_email',
        'account_url',
        'license_key',
        'seats',
        'crm_code',
        'assigned_to_user_id',
        'setup_fee',
        'monthly_amount',
        'yearly_amount',
        'is_active',
        'is_trial',
        'trial_ends_at',
        'reminder_sent',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'renewal_date' => 'date',
        'last_renewal_date' => 'date',
        'trial_ends_at' => 'date',
        'setup_fee' => 'decimal:2',
        'monthly_amount' => 'decimal:2',
        'yearly_amount' => 'decimal:2',
        'auto_renew' => 'boolean',
        'is_active' => 'boolean',
        'is_trial' => 'boolean',
        'reminder_sent' => 'boolean',
    ];

    protected $appends = [
        'days_until_renewal',
        'renewal_urgency',
        'annual_cost',
    ];

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    public function uscita(): BelongsTo
    {
        return $this->belongsTo(UscitaCocchi::class, 'uscita_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    public function paymentMethodModel(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    // ============================================================
    // ACCESSORS
    // ============================================================

    public function getDaysUntilRenewalAttribute(): int
    {
        return now()->diffInDays($this->renewal_date, false);
    }

    public function getRenewalUrgencyAttribute(): string
    {
        $days = $this->days_until_renewal;
        
        if ($days < 0) return 'expired';
        if ($days <= 7) return 'urgent';
        if ($days <= 30) return 'soon';
        return 'ok';
    }

    public function getAnnualCostAttribute(): float
    {
        return match($this->billing_cycle) {
            'weekly' => $this->monthly_amount * 52,
            'monthly' => $this->monthly_amount * 12,
            'quarterly' => $this->monthly_amount * 4,
            'yearly' => $this->yearly_amount ?? ($this->monthly_amount * 12),
            default => 0,
        };
    }

    // ============================================================
    // SCOPES
    // ============================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->where('renewal_date', '<=', now()->addDays($days))
                     ->where('renewal_date', '>=', now());
    }

    public function scopeForCrm($query, string $crmCode)
    {
        return $query->where('crm_code', $crmCode);
    }

    public function scopeByProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }

    // ============================================================
    // METHODS
    // ============================================================

    public function renew(): self
    {
        $this->last_renewal_date = $this->renewal_date;
        
        // Calculate next renewal date
        $this->renewal_date = match($this->billing_cycle) {
            'weekly' => $this->renewal_date->addWeek(),
            'monthly' => $this->renewal_date->addMonth(),
            'quarterly' => $this->renewal_date->addMonths(3),
            'yearly' => $this->renewal_date->addYear(),
            default => $this->renewal_date->addMonth(),
        };

        $this->reminder_sent = false;
        $this->save();

        return $this;
    }

    public function suspend(): self
    {
        $this->is_active = false;
        $this->save();
        return $this;
    }

    public function activate(): self
    {
        $this->is_active = true;
        $this->save();
        return $this;
    }
}

