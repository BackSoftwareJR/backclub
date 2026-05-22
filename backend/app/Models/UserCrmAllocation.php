<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserCrmAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'crm_department_id',
        'project_id',
        'cocchi_allocated',
        'cocchi_used',
        'allocation_date',
        'notes',
    ];

    protected $casts = [
        'cocchi_allocated' => 'decimal:2',
        'cocchi_used' => 'decimal:2',
        'allocation_date' => 'date',
    ];

    protected $appends = ['cocchi_remaining', 'usage_percentage'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function crmDepartment()
    {
        return $this->belongsTo(CrmDepartment::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    // Accessors
    public function getCocchiRemainingAttribute()
    {
        return $this->cocchi_allocated - $this->cocchi_used;
    }

    public function getUsagePercentageAttribute()
    {
        if ($this->cocchi_allocated <= 0) {
            return 0;
        }
        return round(($this->cocchi_used / $this->cocchi_allocated) * 100, 2);
    }

    public function getFormattedAllocatedAttribute()
    {
        return '€ ' . number_format($this->cocchi_allocated, 2, ',', '.');
    }

    public function getFormattedUsedAttribute()
    {
        return '€ ' . number_format($this->cocchi_used, 2, ',', '.');
    }

    public function getFormattedRemainingAttribute()
    {
        return '€ ' . number_format($this->cocchi_remaining, 2, ',', '.');
    }

    // Scopes
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('crm_department_id', $departmentId);
    }

    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('allocation_date', '>=', now()->subDays($days));
    }
}
