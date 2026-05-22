<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerDepartment extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'crm_department_id',
        'is_active',
        'currently_working',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'currently_working' => 'boolean',
    ];

    /**
     * Relazione con Seller
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    /**
     * Relazione con CrmDepartment
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(CrmDepartment::class, 'crm_department_id');
    }

    /**
     * Scope per settori attivi
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', 1);
    }

    /**
     * Scope per settore corrente
     */
    public function scopeCurrentlyWorking($query)
    {
        return $query->where('currently_working', 1);
    }
}

