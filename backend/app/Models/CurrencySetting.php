<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CurrencySetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'currency_name',
        'currency_symbol',
        'exchange_rate',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'exchange_rate' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get active currency setting
     */
    public static function getActive(): ?self
    {
        return static::where('is_active', true)->first();
    }

    /**
     * Convert amount from cocchi to base currency (EUR)
     */
    public function convertToBase(float $amount): float
    {
        return $amount * $this->exchange_rate;
    }

    /**
     * Convert amount from base currency (EUR) to cocchi
     */
    public function convertFromBase(float $amount): float
    {
        return $amount / $this->exchange_rate;
    }
}

