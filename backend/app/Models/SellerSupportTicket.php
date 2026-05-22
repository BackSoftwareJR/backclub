<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerSupportTicket extends Model
{
    use HasFactory;

    protected $table = 'seller_support_tickets';

    protected $fillable = [
        'seller_id',
        'recipient_type',
        'subject',
        'message',
        'category',
        'status',
        'priority',
        'assigned_to',
        'response',
        'response_at',
    ];

    protected $casts = [
        'response_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
