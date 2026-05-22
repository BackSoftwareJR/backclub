<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectTemplateTask extends Model
{
    protected $fillable = [
        'template_id',
        'role_code',
        'title',
        'description',
        'priority',
        'start_offset_days',
        'due_offset_days',
        'estimated_hours',
        'order_index',
        'dependencies',
    ];

    protected $casts = [
        'start_offset_days' => 'integer',
        'due_offset_days' => 'integer',
        'estimated_hours' => 'decimal:2',
        'order_index' => 'integer',
        'dependencies' => 'array',
    ];

    /**
     * Relationships
     */
    public function template()
    {
        return $this->belongsTo(ProjectTemplate::class, 'template_id');
    }

    /**
     * Calculate actual dates based on project start date
     */
    public function calculateDates($projectStartDate)
    {
        $startDate = new \DateTime($projectStartDate);
        $dueDate = clone $startDate;

        if ($this->start_offset_days > 0) {
            $startDate->modify("+{$this->start_offset_days} days");
        }

        if ($this->due_offset_days > 0) {
            $dueDate->modify("+{$this->due_offset_days} days");
        }

        return [
            'start_date' => $startDate->format('Y-m-d'),
            'due_date' => $dueDate->format('Y-m-d'),
        ];
    }
}

