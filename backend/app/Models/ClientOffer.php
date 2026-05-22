<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientOffer extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'discount_percentage',
        'service_ids',
        'client_ids',
        'valid_from',
        'valid_until',
        'is_active',
        'image_url',
        'terms_conditions',
        'created_by',
    ];

    protected $casts = [
        'discount_percentage' => 'decimal:2',
        'service_ids' => 'array',
        'client_ids' => 'array',
        'valid_from' => 'date',
        'valid_until' => 'date',
        'is_active' => 'boolean',
    ];

    // Relationships
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
}

