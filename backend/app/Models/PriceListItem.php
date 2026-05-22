<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PriceListItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_department_id',
        'name',
        'description',
        'operational_notes',
        'landing_page_url',
        'technical_sheet_url',
        'informative_document_path',
        'base_price',
        'price_type',
        'payment_options',
        'min_installment_amount',
        'max_installments',
        'margin_percentage',
        'features',
        'renewal_options',
        'renewal_type',
        'is_active',
        'is_visible_to_clients',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'min_installment_amount' => 'decimal:2',
        'margin_percentage' => 'decimal:2',
        'max_installments' => 'integer',
        'payment_options' => 'array',
        'features' => 'array',
        'renewal_options' => 'array',
        'is_active' => 'boolean',
        'is_visible_to_clients' => 'boolean',
    ];

    /**
     * Relazione con CrmDepartment
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(CrmDepartment::class, 'crm_department_id');
    }

    /**
     * Relazione con QuoteItems
     */
    public function quoteItems(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }

    /**
     * Scope per prodotti attivi
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', 1);
    }

    /**
     * Scope per settore
     */
    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('crm_department_id', $departmentId);
    }

    /**
     * Calcola prezzo con margine
     */
    public function getPriceWithMargin(): float
    {
        if ($this->margin_percentage) {
            return $this->base_price * (1 + ($this->margin_percentage / 100));
        }
        return $this->base_price;
    }

    /**
     * Verifica se supporta rate
     */
    public function supportsInstallments(): bool
    {
        return $this->max_installments && $this->max_installments > 1;
    }

    /**
     * Verifica se ha rinnovi configurati
     */
    public function hasRenewals(): bool
    {
        return !empty($this->renewal_options) && is_array($this->renewal_options) && count($this->renewal_options) > 0;
    }

    /**
     * Verifica se ha rinnovo obbligatorio
     */
    public function hasObligatoryRenewal(): bool
    {
        return $this->renewal_type === 'obbligatorio' && $this->hasRenewals();
    }

    /**
     * Verifica se ha multi-rinnovo
     */
    public function hasMultiRenewal(): bool
    {
        return $this->renewal_type === 'multi' && $this->hasRenewals();
    }

    /**
     * Ottiene le opzioni di rinnovo attive
     */
    public function getActiveRenewalOptions(): array
    {
        if (!$this->hasRenewals()) {
            return [];
        }

        return array_filter($this->renewal_options, function ($option) {
            return isset($option['is_active']) && $option['is_active'] === true;
        });
    }

    /**
     * Relazione con PriceListItemQuestions
     */
    public function questions(): HasMany
    {
        return $this->hasMany(PriceListItemQuestion::class)->orderBy('order');
    }
}

