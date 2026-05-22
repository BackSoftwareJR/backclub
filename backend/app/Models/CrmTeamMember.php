<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrmTeamMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_department_id',
        'user_id',
        'role',
        'allocation_percentage',
        'cocchi_budget',
        'cocchi_spent',
        'is_active',
        'joined_at',
    ];

    protected $casts = [
        'allocation_percentage' => 'decimal:2',
        'cocchi_budget' => 'decimal:2',
        'cocchi_spent' => 'decimal:2',
        'is_active' => 'boolean',
        'joined_at' => 'datetime',
    ];

    protected $appends = ['cocchi_remaining', 'usage_percentage'];

    // Relationships
    public function crmDepartment()
    {
        return $this->belongsTo(CrmDepartment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Accessors
    public function getCocchiRemainingAttribute()
    {
        return $this->cocchi_budget - $this->cocchi_spent;
    }

    public function getUsagePercentageAttribute()
    {
        if ($this->cocchi_budget <= 0) {
            return 0;
        }
        return round(($this->cocchi_spent / $this->cocchi_budget) * 100, 2);
    }

    public function getFormattedCocchiAttribute()
    {
        return number_format($this->cocchi_budget, 2, ',', '.') . ' €';
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('crm_department_id', $departmentId);
    }
}
