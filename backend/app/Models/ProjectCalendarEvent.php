<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectCalendarEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'crm_department_id',
        'user_id',
        'type',
        'title',
        'description',
        'start_datetime',
        'end_datetime',
        'all_day',
        'location',
        'participants',
        'attachments',
        'status',
        'reminder_minutes',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'all_day' => 'boolean',
        'participants' => 'array',
        'attachments' => 'array',
        'reminder_minutes' => 'integer',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function crmDepartment()
    {
        return $this->belongsTo(CrmDepartment::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('start_datetime', '>=', now())
                     ->orderBy('start_datetime', 'asc');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeInDateRange($query, $start, $end)
    {
        return $query->whereBetween('start_datetime', [$start, $end]);
    }
}
