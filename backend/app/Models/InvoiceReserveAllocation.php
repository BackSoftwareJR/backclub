<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceReserveAllocation extends Model
{
    protected $fillable = [
        'invoice_id',
        'serbatoio_id',
        'amount',
        'percentage',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'percentage' => 'decimal:2',
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
