<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientGift extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'gift_type',
        'discount_percentage',
        'credit_amount',
        'service_id',
        'client_ids',
        'valid_from',
        'valid_until',
        'email_subject',
        'email_body',
        'email_status',
        'email_sent_at',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'discount_percentage' => 'decimal:2',
        'credit_amount' => 'decimal:2',
        'client_ids' => 'array',
        'valid_from' => 'date',
        'valid_until' => 'date',
        'is_active' => 'boolean',
        'email_sent_at' => 'datetime',
    ];

    // Relationships
    public function service()
    {
        return $this->belongsTo(PriceListItem::class, 'service_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('valid_from', '<=', now())
            ->where('valid_until', '>=', now());
    }

    public function scopeByEmailStatus($query, $status)
    {
        return $query->where('email_status', $status);
    }
}

