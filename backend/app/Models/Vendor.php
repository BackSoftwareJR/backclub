<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vendor extends Model
{
    use SoftDeletes;

    protected $table = 'vendors';

    protected $fillable = [
        'name',
        'business_name',
        'vat_number',
        'tax_code',
        'sdi_code',
        'pec',
        'email',
        'phone',
        'mobile',
        'website',
        'address',
        'city',
        'province',
        'postal_code',
        'country',
        'iban',
        'swift',
        'bank_name',
        'contact_person',
        'contact_role',
        'contact_email',
        'contact_phone',
        'contract_url',
        'contract_number',
        'contract_start',
        'contract_end',
        'contract_auto_renew',
        'payment_terms_days',
        'payment_method_preferred',
        'discount_percentage',
        'total_spent',
        'total_invoices',
        'last_payment_date',
        'average_invoice_amount',
        'rating',
        'reliability_score',
        'is_active',
        'is_favorite',
        'requires_invoice',
        'is_intra_eu',
        'contract_expiry_alert',
        'contract_alert_sent',
        'notes',
        'tags',
    ];

    protected $casts = [
        'contract_start' => 'date',
        'contract_end' => 'date',
        'last_payment_date' => 'date',
        'total_spent' => 'decimal:2',
        'average_invoice_amount' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'rating' => 'decimal:2',
        'contract_auto_renew' => 'boolean',
        'is_active' => 'boolean',
        'is_favorite' => 'boolean',
        'requires_invoice' => 'boolean',
        'is_intra_eu' => 'boolean',
        'contract_expiry_alert' => 'boolean',
        'contract_alert_sent' => 'boolean',
        'tags' => 'array',
    ];

    protected $appends = [
        'display_name',
        'contract_expires_soon',
    ];

    // ============================================================
    // ACCESSORS
    // ============================================================

    public function getDisplayNameAttribute(): string
    {
        return $this->business_name ?? $this->name;
    }

    public function getContractExpiresSoonAttribute(): bool
    {
        if (!$this->contract_end) {
            return false;
        }
        return now()->diffInDays($this->contract_end, false) <= 30;
    }

    // ============================================================
    // SCOPES
    // ============================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFavorites($query)
    {
        return $query->where('is_favorite', true);
    }

    public function scopeSearch($query, string $term)
    {
        return $query->where(function($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('business_name', 'like', "%{$term}%")
              ->orWhere('vat_number', 'like', "%{$term}%")
              ->orWhere('email', 'like', "%{$term}%");
        });
    }
}

