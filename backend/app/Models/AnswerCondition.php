<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnswerCondition extends Model
{
    use HasFactory;

    protected $fillable = [
        'answer_id',
        'price_adjustment',
        'cost_description',
        'cost_amount',
        'work_description',
    ];

    protected $casts = [
        'price_adjustment' => 'decimal:2',
        'cost_amount' => 'decimal:2',
    ];

    /**
     * Relazione con QuestionAnswer
     */
    public function answer(): BelongsTo
    {
        return $this->belongsTo(QuestionAnswer::class, 'answer_id');
    }
}

