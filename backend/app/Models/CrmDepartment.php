<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrmDepartment extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'color',
        'icon',
        'budget_allocated',
        'budget_spent',
        'is_active',
        'manager_id',
    ];

    protected $casts = [
        'budget_allocated' => 'decimal:2',
        'budget_spent' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $appends = ['budget_remaining', 'formatted_budget'];

    // Relationships
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function teamMembers()
    {
        return $this->hasMany(CrmTeamMember::class);
    }

    public function activeTeamMembers()
    {
        return $this->hasMany(CrmTeamMember::class)->where('is_active', true);
    }

    public function expenses()
    {
        return $this->hasMany(CrmExpense::class);
    }

    public function activeExpenses()
    {
        return $this->hasMany(CrmExpense::class)->where('status', 'active');
    }

    public function economicAnalysis()
    {
        return $this->hasMany(CrmEconomicAnalysis::class);
    }

    public function projects()
    {
        return $this->hasMany(Project::class, 'crm_department_id');
    }

    public function sellers()
    {
        return $this->belongsToMany(
            Seller::class,
            'seller_departments',
            'crm_department_id',
            'seller_id'
        )->withPivot('is_active', 'currently_working')
          ->withTimestamps();
    }

    public function activeSellers()
    {
        return $this->sellers()->wherePivot('is_active', 1);
    }

    public function priceListItems()
    {
        return $this->hasMany(PriceListItem::class);
    }

    public function activePriceListItems()
    {
        return $this->hasMany(PriceListItem::class)->where('is_active', 1);
    }

    public function quotes()
    {
        return $this->hasMany(Quote::class);
    }

    public function leads()
    {
        return $this->hasMany(Lead::class);
    }

    // Accessors
    public function getBudgetRemainingAttribute()
    {
        return $this->budget_allocated - $this->budget_spent;
    }

    public function getFormattedBudgetAttribute()
    {
        return '€ ' . number_format($this->budget_allocated, 2, ',', '.');
    }

    public function getFormattedBudgetSpentAttribute()
    {
        return '€ ' . number_format($this->budget_spent, 2, ',', '.');
    }

    public function getFormattedBudgetRemainingAttribute()
    {
        return '€ ' . number_format($this->budget_remaining, 2, ',', '.');
    }

    public function getBudgetUsagePercentageAttribute()
    {
        if ($this->budget_allocated <= 0) {
            return 0;
        }
        return round(($this->budget_spent / $this->budget_allocated) * 100, 2);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeWithStats($query)
    {
        return $query->withCount(['teamMembers', 'activeExpenses', 'projects']);
    }

    // Users with access to this CRM Department
    public function users()
    {
        return $this->belongsToMany(
            User::class,
            'user_crm_departments',
            'crm_department_id',
            'user_id'
        )->withTimestamps();
    }
}
