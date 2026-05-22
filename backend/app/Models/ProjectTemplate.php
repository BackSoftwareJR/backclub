<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectTemplate extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'project_type_id',
        'icon',
        'color',
        'default_duration_days',
        'has_tasks',
        'is_active',
    ];

    protected $casts = [
        'has_tasks' => 'boolean',
        'is_active' => 'boolean',
        'default_duration_days' => 'integer',
    ];

    /**
     * Relationships
     */
    public function projectType()
    {
        return $this->belongsTo(ProjectType::class);
    }

    public function roles()
    {
        return $this->hasMany(ProjectTemplateRole::class, 'template_id');
    }

    public function tasks()
    {
        return $this->hasMany(ProjectTemplateTask::class, 'template_id');
    }

    public function projects()
    {
        return $this->hasMany(Project::class, 'template_id');
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeWithTasks($query)
    {
        return $query->where('has_tasks', true);
    }

    /**
     * Get template with all related data
     */
    public function getFullTemplate()
    {
        return [
            'template' => $this,
            'roles' => $this->roles,
            'tasks' => $this->tasks()->orderBy('order_index')->get(),
        ];
    }
}

