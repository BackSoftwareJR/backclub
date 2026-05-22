<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceBolloTransaction extends Model
{
    protected $fillable = [
        'invoice_id',
        'serbatoio_id',
        'amount',
        'transaction_date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    // Relationships
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function serbatoio(): BelongsTo
    {
        return $this->belongsTo(Serbatoio::class, 'serbatoio_id');
    }
}
