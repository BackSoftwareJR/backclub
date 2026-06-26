<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrganicWebProject extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'mysql_marketing';

    protected $fillable = [
        'crm_project_id',
        'website_url',
        'blog_platform',
        'blog_api_url',
        'blog_api_key_encrypted',
        'blog_api_token_encrypted',
        'gsc_property_id',
        'target_keywords',
        'tone_of_voice',
        'target_audience',
        'posting_frequency',
        'active_skills',
        'language',
        'is_active',
        'last_audit_at',
    ];

    protected $casts = [
        'target_keywords' => 'array',
        'active_skills' => 'array',
        'is_active' => 'boolean',
        'last_audit_at' => 'datetime',
    ];

    public function crmProject(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class);
    }

    public function skillRuns(): HasMany
    {
        return $this->hasMany(OrganicSkillRun::class, 'organic_project_id');
    }

    public function blogPosts(): HasMany
    {
        return $this->hasMany(OrganicBlogPost::class, 'organic_project_id');
    }

    public function seoAudits(): HasMany
    {
        return $this->hasMany(OrganicSeoAudit::class, 'organic_project_id');
    }

    public function keywordSnapshots(): HasMany
    {
        return $this->hasMany(OrganicKeywordSnapshot::class, 'organic_project_id');
    }

    public function humanTasks(): HasMany
    {
        return $this->hasMany(OrganicHumanTask::class, 'organic_project_id');
    }

    public function googleIntegration(): HasOne
    {
        return $this->hasOne(OrganicProjectGoogleIntegration::class, 'organic_web_project_id');
    }
}
