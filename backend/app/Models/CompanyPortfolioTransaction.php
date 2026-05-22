<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyPortfolioTransaction extends Model
{
    protected $fillable = [
        'type',
        'amount',
        'description',
        'reference_type',
        'reference_id',
        'transaction_date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'reference_id')->where('reference_type', 'invoice');
    }

    public static function getBalance(): float
    {
        return (float) self::sum('amount');
    }
}
