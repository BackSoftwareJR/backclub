<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientSpecialPrice extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'service_id',
        'price',
        'original_price',
        'discount_percentage',
        'is_active',
        'valid_from',
        'valid_until',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'is_active' => 'boolean',
        'valid_from' => 'date',
        'valid_until' => 'date',
    ];

    // Relationships
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function service()
    {
        return $this->belongsTo(PriceListItem::class, 'service_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

