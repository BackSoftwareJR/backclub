<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrmEconomicAnalysis extends Model
{
    use HasFactory;

    protected $table = 'crm_economic_analysis';

    protected $fillable = [
        'crm_department_id',
        'period_type',
        'period_year',
        'period_month',
        'period_quarter',
        'revenue_generated',
        'budget_used',
        'projects_completed',
        'team_size',
        'client_satisfaction',
        'notes',
    ];

    protected $casts = [
        'revenue_generated' => 'decimal:2',
        'budget_used' => 'decimal:2',
        'client_satisfaction' => 'decimal:2',
        'projects_completed' => 'integer',
        'team_size' => 'integer',
    ];

    protected $appends = ['profit_loss', 'roi_percentage', 'period_label'];

    // Relationships
    public function crmDepartment()
    {
        return $this->belongsTo(CrmDepartment::class);
    }

    // Accessors
    public function getProfitLossAttribute()
    {
        return $this->revenue_generated - $this->budget_used;
    }

    public function getRoiPercentageAttribute()
    {
        if ($this->budget_used <= 0) {
            return 0;
        }
        return round((($this->profit_loss) / $this->budget_used) * 100, 2);
    }

    public function getFormattedRevenueAttribute()
    {
        return '€ ' . number_format($this->revenue_generated, 2, ',', '.');
    }

    public function getFormattedBudgetUsedAttribute()
    {
        return '€ ' . number_format($this->budget_used, 2, ',', '.');
    }

    public function getFormattedProfitLossAttribute()
    {
        $value = $this->profit_loss;
        $formatted = '€ ' . number_format(abs($value), 2, ',', '.');
        return $value >= 0 ? '+' . $formatted : '-' . $formatted;
    }

    public function getPeriodLabelAttribute()
    {
        return match ($this->period_type) {
            'monthly' => $this->period_month . '/' . $this->period_year,
            'quarterly' => 'Q' . $this->period_quarter . ' ' . $this->period_year,
            'yearly' => (string) $this->period_year,
            default => '',
        };
    }

    // Scopes
    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('crm_department_id', $departmentId);
    }

    public function scopeForPeriod($query, $type, $year, $month = null, $quarter = null)
    {
        $query->where('period_type', $type)
              ->where('period_year', $year);

        if ($month !== null) {
            $query->where('period_month', $month);
        }

        if ($quarter !== null) {
            $query->where('period_quarter', $quarter);
        }

        return $query;
    }

    public function scopeLatest($query)
    {
        return $query->orderBy('period_year', 'desc')
                     ->orderBy('period_month', 'desc');
    }
}
