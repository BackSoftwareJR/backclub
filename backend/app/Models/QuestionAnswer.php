<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuestionAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'question_id',
        'answer_text',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    /**
     * Relazione con PriceListItemQuestion
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(PriceListItemQuestion::class, 'question_id');
    }

    /**
     * Relazione con AnswerConditions
     */
    public function conditions(): HasMany
    {
        return $this->hasMany(AnswerCondition::class, 'answer_id');
    }

    /**
     * Relazione con QuoteItemAnswers
     */
    public function quoteItemAnswers(): HasMany
    {
        return $this->hasMany(QuoteItemAnswer::class, 'answer_id');
    }
}

