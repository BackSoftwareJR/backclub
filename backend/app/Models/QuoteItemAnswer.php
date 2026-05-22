<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteItemAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_item_id',
        'question_id',
        'answer_id',
        'text_answer',
        'number_answer',
    ];

    protected $casts = [
        'number_answer' => 'decimal:2',
    ];

    /**
     * Relazione con QuoteItem
     */
    public function quoteItem(): BelongsTo
    {
        return $this->belongsTo(QuoteItem::class);
    }

    /**
     * Relazione con PriceListItemQuestion
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(PriceListItemQuestion::class, 'question_id');
    }

    /**
     * Relazione con QuestionAnswer (per multiple choice)
     */
    public function answer(): BelongsTo
    {
        return $this->belongsTo(QuestionAnswer::class, 'answer_id');
    }
}

