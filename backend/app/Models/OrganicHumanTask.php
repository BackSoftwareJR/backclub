<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicHumanTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'skill_step_id',
        'organic_project_id',
        'assignee_id',
        'title',
        'description',
        'instructions',
        'upload_instructions',
        'upload_data',
        'upload_filename',
        'status',
        'priority',
        'due_at',
        'reminded_at',
        'completed_at',
        'notes',
    ];

    protected $casts = [
        'upload_data' => 'array',
        'due_at' => 'datetime',
        'reminded_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function skillStep(): BelongsTo
    {
        return $this->belongsTo(OrganicSkillStep::class, 'skill_step_id');
    }

    public function organicProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class, 'organic_project_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }
}
