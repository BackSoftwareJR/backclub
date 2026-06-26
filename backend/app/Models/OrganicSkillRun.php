<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class OrganicSkillRun extends Model
{
    use HasFactory;

    protected $connection = 'mysql_marketing';

    protected $fillable = [
        'organic_project_id',
        'skill_id',
        'status',
        'current_step_index',
        'trigger_type',
        'trigger_data',
        'context',
        'started_at',
        'completed_at',
        'failed_at',
        'error_message',
        'created_by',
    ];

    protected $casts = [
        'trigger_data' => 'array',
        'context' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    public function organicProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class, 'organic_project_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(OrganicSkillStep::class, 'skill_run_id')->orderBy('step_index');
    }

    public function blogPosts(): HasMany
    {
        return $this->hasMany(OrganicBlogPost::class, 'skill_run_id');
    }

    public function seoAudits(): HasMany
    {
        return $this->hasMany(OrganicSeoAudit::class, 'skill_run_id');
    }

    public function humanTasks(): HasManyThrough
    {
        return $this->hasManyThrough(
            OrganicHumanTask::class,
            OrganicSkillStep::class,
            'skill_run_id',
            'skill_step_id'
        );
    }
}
