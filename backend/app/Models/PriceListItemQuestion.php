<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PriceListItemQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'price_list_item_id',
        'question_text',
        'question_type',
        'is_required',
        'order',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'order' => 'integer',
    ];

    /**
     * Relazione con PriceListItem
     */
    public function priceListItem(): BelongsTo
    {
        return $this->belongsTo(PriceListItem::class);
    }

    /**
     * Relazione con QuestionAnswers (per multiple choice)
     */
    public function answers(): HasMany
    {
        return $this->hasMany(QuestionAnswer::class, 'question_id')->orderBy('order');
    }

    /**
     * Relazione con QuoteItemAnswers
     */
    public function quoteItemAnswers(): HasMany
    {
        return $this->hasMany(QuoteItemAnswer::class, 'question_id');
    }

    /**
     * Scope per domande obbligatorie
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    /**
     * Scope per tipo domanda
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('question_type', $type);
    }
}

