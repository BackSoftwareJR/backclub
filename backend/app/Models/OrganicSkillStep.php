<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OrganicSkillStep extends Model
{
    use HasFactory;

    protected $connection = 'mysql_marketing';

    protected $fillable = [
        'skill_run_id',
        'step_index',
        'step_key',
        'step_type',
        'status',
        'input',
        'output',
        'metadata',
        'started_at',
        'completed_at',
        'completed_by',
        'notes',
    ];

    protected $casts = [
        'input' => 'array',
        'output' => 'array',
        'metadata' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function skillRun(): BelongsTo
    {
        return $this->belongsTo(OrganicSkillRun::class, 'skill_run_id');
    }

    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function humanTask(): HasOne
    {
        return $this->hasOne(OrganicHumanTask::class, 'skill_step_id');
    }
}
