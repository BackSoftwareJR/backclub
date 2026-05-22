<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'client_id',
        'order_source',
        'status',
        'total_amount',
        'discount_amount',
        'final_amount',
        'items',
        'project_info',
        'notes',
        'order_date',
        'delivery_date',
        'payment_method',
        'payment_status',
        'quote_id',
        'sent_to_sellers',
        'referral_user_id',
        'created_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'items' => 'array',
        'project_info' => 'array',
        'order_date' => 'date',
        'delivery_date' => 'date',
        'sent_to_sellers' => 'boolean',
    ];

    // Relationships
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

    public function referralUser()
    {
        return $this->belongsTo(User::class, 'referral_user_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'confirmed', 'processing']);
    }

    public function scopeByClient($query, $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    public function scopeBySource($query, $source)
    {
        return $query->where('order_source', $source);
    }

    public function scopeNotSentToSellers($query)
    {
        return $query->where('sent_to_sellers', false);
    }
}

