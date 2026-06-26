<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'opportunities',
    ];

    protected function casts(): array
    {
        return [
            'opportunities'     => 'array',
            'performance_score' => 'integer',
            'lcp'               => 'float',
            'cls'               => 'float',
            'fid'               => 'float',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
