<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuoteItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_id',
        'price_list_item_id',
        'description',
        'quantity',
        'unit_price',
        'discount',
        'total',
        'payment_option',
        'renewal_option',
        'renewal_options',
        'selected_features',
        'notes',
        'question_answers',
        'price_adjustments',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'price_adjustments' => 'decimal:2',
        'payment_option' => 'array',
        'renewal_option' => 'array',
        'renewal_options' => 'array',
        'selected_features' => 'array',
        'question_answers' => 'array',
    ];

    /**
     * Boot del model
     */
    protected static function boot()
    {
        parent::boot();

        // Ricalcola totale prima di salvare
        static::saving(function ($item) {
            $item->calculateTotal();
        });

        // Ricalcola totali preventivo dopo save/delete
        static::saved(function ($item) {
            $item->quote->recalculateTotals();
        });

        static::deleted(function ($item) {
            $item->quote->recalculateTotals();
        });
    }

    /**
     * Relazione con Quote
     */
    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    /**
     * Relazione con PriceListItem
     */
    public function priceListItem(): BelongsTo
    {
        return $this->belongsTo(PriceListItem::class);
    }

    /**
     * Relazione con QuoteItemAnswers
     */
    public function answers(): HasMany
    {
        return $this->hasMany(QuoteItemAnswer::class);
    }

    /**
     * Relazione con QuoteCostAnalysis
     */
    public function costAnalysis(): HasMany
    {
        return $this->hasMany(QuoteCostAnalysis::class);
    }

    /**
     * Calcola il totale della voce
     */
    public function calculateTotal(): void
    {
        $subtotal = $this->quantity * $this->unit_price;
        $discountAmount = $subtotal * ($this->discount / 100);
        $baseTotal = $subtotal - $discountAmount;
        
        // Aggiungi aggiustamenti da domande
        $this->total = $baseTotal + ($this->price_adjustments ?? 0);
    }

    /**
     * Calcola aggiustamenti prezzo basati su risposte
     */
    public function calculatePriceAdjustments(): float
    {
        $totalAdjustment = 0;
        
        // Carica risposte con relazioni
        $this->load(['answers.answer.conditions']);
        
        foreach ($this->answers as $answer) {
            if ($answer->answer_id && $answer->answer) {
                // Risposta multiple choice
                $conditions = $answer->answer->conditions ?? collect();
                foreach ($conditions as $condition) {
                    $totalAdjustment += $condition->price_adjustment ?? 0;
                }
            }
        }
        
        $this->price_adjustments = $totalAdjustment;
        $this->save();
        
        return $totalAdjustment;
    }
}

