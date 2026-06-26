<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrganicBlogPost extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'mysql_marketing';

    protected $fillable = [
        'organic_project_id',
        'skill_run_id',
        'title',
        'target_keyword',
        'secondary_keywords',
        'status',
        'scheduled_date',
        'published_date',
        'published_url',
        'content',
        'meta_title',
        'meta_description',
        'word_count',
        'seo_score',
        'human_approved',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'secondary_keywords' => 'array',
        'scheduled_date' => 'date',
        'published_date' => 'datetime',
        'approved_at' => 'datetime',
        'human_approved' => 'boolean',
    ];

    public function organicProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class, 'organic_project_id');
    }

    public function skillRun(): BelongsTo
    {
        return $this->belongsTo(OrganicSkillRun::class, 'skill_run_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
