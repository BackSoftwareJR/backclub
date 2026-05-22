<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Client;
use App\Models\User;
use App\Models\Task;
use App\Models\CrmDepartment;
use App\Models\ProjectType;

class Project extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'budget_cocchi' => 'decimal:2',
        'spent_cocchi' => 'decimal:2',
        'budget_allocated' => 'decimal:2',
        'budget_spent' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'due_date' => 'date',
    ];

    protected $appends = ['progress_percentage', 'budget_remaining', 'is_overdue'];

    /**
     * Relations
     */
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function projectType()
    {
        return $this->belongsTo(ProjectType::class, 'project_type_id');
    }

    public function template()
    {
        return $this->belongsTo(ProjectTemplate::class, 'template_id');
    }

    public function crmDepartment()
    {
        return $this->belongsTo(CrmDepartment::class, 'crm_department_id');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'project_team_members', 'project_id', 'user_id')
                    ->withPivot('role', 'payment_type', 'payment_amount', 'start_date', 'end_date', 'is_active')
                    ->withTimestamps();
    }

    public function teamMembers()
    {
        return $this->hasMany(\App\Models\ProjectTeamMember::class);
    }

    public function purchases()
    {
        return $this->hasMany(\App\Models\ProjectPurchase::class);
    }

    public function resources()
    {
        return $this->hasMany(\App\Models\ProjectResource::class);
    }

    public function chatMessages()
    {
        return $this->hasMany(\App\Models\ProjectChatMessage::class);
    }

    public function calendarEvents()
    {
        return $this->hasMany(\App\Models\ProjectCalendarEvent::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Accessors
     */
    public function getProgressPercentageAttribute()
    {
        $totalTasks = $this->tasks()->count();
        if ($totalTasks === 0) return 0;
        
        $completedTasks = $this->tasks()->where('status', 'completed')->count();
        return round(($completedTasks / $totalTasks) * 100);
    }

    public function getBudgetRemainingAttribute()
    {
        if ($this->budget_allocated) {
            return $this->budget_allocated - $this->budget_spent;
        }
        if ($this->budget_cocchi) {
            return $this->budget_cocchi - $this->spent_cocchi;
        }
        return 0;
    }

    public function getIsOverdueAttribute()
    {
        if (!$this->due_date && !$this->end_date) return false;
        
        $deadline = $this->due_date ?? $this->end_date;
        return now()->greaterThan($deadline) && $this->status !== 'completed';
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('manager_id', $userId)
            ->orWhereHas('members', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            });
    }
}
