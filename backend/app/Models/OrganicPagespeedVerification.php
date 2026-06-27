<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicPagespeedVerification extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_pagespeed_verifications';

    protected $fillable = [
        'organic_web_project_id',
        'audit_id',
        'implementation_context',
        'github_repo_url',
        'verification_result',
        'quality_score',
        'completed',
    ];

    protected function casts(): array
    {
        return [
            'verification_result' => 'array',
            'quality_score'       => 'integer',
            'completed'           => 'boolean',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }

    public function audit(): BelongsTo
    {
        return $this->belongsTo(OrganicPagespeedAudit::class, 'audit_id');
    }
}
