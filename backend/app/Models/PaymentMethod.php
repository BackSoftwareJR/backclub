<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentMethod extends Model
{
    use SoftDeletes;

    protected $table = 'payment_methods';

    protected $fillable = [
        'type',
        'name',
        'description',
        'card_holder',
        'card_last_4',
        'card_brand',
        'card_expiry_month',
        'card_expiry_year',
        'card_type',
        'bank_name',
        'iban',
        'swift',
        'account_holder',
        'wallet_email',
        'wallet_account_id',
        'serbatoio_id',
        'is_active',
        'is_default',
        'is_company_owned',
        'assigned_to_user_id',
        'monthly_limit',
        'transaction_limit',
        'current_month_spent',
        'alert_on_expiry',
        'alert_days_before',
        'expiry_alert_sent',
        'notes',
    ];

    protected $casts = [
        'monthly_limit' => 'decimal:2',
        'transaction_limit' => 'decimal:2',
        'current_month_spent' => 'decimal:2',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'is_company_owned' => 'boolean',
        'alert_on_expiry' => 'boolean',
        'expiry_alert_sent' => 'boolean',
    ];

    protected $appends = [
        'type_label',
        'masked_number',
        'is_expiring_soon',
        'remaining_limit',
    ];

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    public function serbatoio(): BelongsTo
    {
        return $this->belongsTo(Serbatoio::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    // ============================================================
    // ACCESSORS
    // ============================================================

    public function getTypeLabelAttribute(): string
    {
        return match($this->type) {
            'contanti' => 'Contanti',
            'bonifico' => 'Bonifico Bancario',
            'carta_credito' => 'Carta di Credito',
            'carta_debito' => 'Carta di Debito',
            'paypal' => 'PayPal',
            'stripe' => 'Stripe',
            'revolut' => 'Revolut',
            'altro' => 'Altro',
            default => ucfirst($this->type),
        };
    }

    public function getMaskedNumberAttribute(): ?string
    {
        if ($this->card_last_4) {
            return "**** **** **** {$this->card_last_4}";
        }
        if ($this->iban) {
            return substr($this->iban, 0, 4) . ' **** **** ' . substr($this->iban, -4);
        }
        return null;
    }

    public function getIsExpiringSoonAttribute(): bool
    {
        if (!$this->card_expiry_month || !$this->card_expiry_year) {
            return false;
        }

        $expiryDate = "{$this->card_expiry_year}-{$this->card_expiry_month}-01";
        $daysUntilExpiry = now()->diffInDays($expiryDate, false);

        return $daysUntilExpiry <= $this->alert_days_before;
    }

    public function getRemainingLimitAttribute(): ?float
    {
        if (!$this->monthly_limit) {
            return null;
        }
        return max(0, $this->monthly_limit - $this->current_month_spent);
    }

    // ============================================================
    // SCOPES
    // ============================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public function scopeCards($query)
    {
        return $query->whereIn('type', ['carta_credito', 'carta_debito']);
    }

    public function scopeExpiringSoon($query, int $days = 90)
    {
        return $query->whereNotNull('card_expiry_month')
                     ->whereNotNull('card_expiry_year')
                     ->whereRaw("DATEDIFF(
                         CONCAT(card_expiry_year, '-', LPAD(card_expiry_month, 2, '0'), '-01'),
                         CURDATE()
                     ) <= ?", [$days]);
    }

    // ============================================================
    // METHODS
    // ============================================================

    public function addExpense(float $amount): self
    {
        $this->current_month_spent += $amount;
        $this->save();
        return $this;
    }

    public function resetMonthlySpent(): self
    {
        $this->current_month_spent = 0;
        $this->save();
        return $this;
    }

    public function setAsDefault(): self
    {
        // Remove default from all other payment methods
        self::where('is_default', true)->update(['is_default' => false]);
        
        $this->is_default = true;
        $this->save();
        
        return $this;
    }
}

