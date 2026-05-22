<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_department_id',
        'amount',
        'allocated_at',
        'allocated_by',
        'reason',
        'status',
    ];

    protected $casts = [
        'allocated_at' => 'datetime',
    ];

    public function crmDepartment()
    {
        return $this->belongsTo(CrmDepartment::class);
    }

    public function allocatedBy()
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }

    /**
     * Scope: only active allocations
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
