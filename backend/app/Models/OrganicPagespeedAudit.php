<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganicPagespeedAudit extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_pagespeed_audits';

    protected $fillable = [
        'organic_web_project_id',
        'url',
        'device',
        'performance_score',
        'lcp',
        'cls',
        'fid',
        'fcp',
        'ttfb',
        'tti',
        'tbt',
        'speed_index',
        'accessibility_score',
        'best_practices_score',
        'seo_score',
        'opportunities',
        'audits_json',
        'diagnostics_json',
        'passed_audits_json',
        'ai_suggestions_json',
        'ai_suggestions_generated_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'opportunities'              => 'array',
            'audits_json'                => 'array',
            'diagnostics_json'           => 'array',
            'passed_audits_json'         => 'array',
            'ai_suggestions_json'        => 'array',
            'performance_score'          => 'integer',
            'accessibility_score'        => 'integer',
            'best_practices_score'       => 'integer',
            'seo_score'                  => 'integer',
            'lcp'                        => 'float',
            'cls'                        => 'float',
            'fid'                        => 'float',
            'fcp'                        => 'float',
            'ttfb'                       => 'float',
            'tti'                        => 'float',
            'tbt'                        => 'float',
            'speed_index'                => 'float',
            'ai_suggestions_generated_at' => 'datetime',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }

    public function verifications(): HasMany
    {
        return $this->hasMany(OrganicPagespeedVerification::class, 'audit_id');
    }
}
