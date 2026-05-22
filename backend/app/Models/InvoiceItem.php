<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    protected $table = 'invoice_items';

    protected $fillable = [
        'invoice_id',
        'description',
        'quantity',
        'unit_price_cocchi',
        'total_cocchi',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price_cocchi' => 'decimal:2',
        'total_cocchi' => 'decimal:2',
    ];

    // Relationships
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
