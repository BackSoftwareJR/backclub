<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicSeoAudit extends Model
{
    use HasFactory;

    protected $connection = 'mysql_marketing';

    protected $fillable = [
        'organic_project_id',
        'skill_run_id',
        'audit_date',
        'overall_score',
        'pages_crawled',
        'issues',
        'recommendations',
        'critical_count',
        'warning_count',
        'info_count',
        'raw_crawl_data',
    ];

    protected $casts = [
        'audit_date' => 'date',
        'issues' => 'array',
        'recommendations' => 'array',
        'raw_crawl_data' => 'array',
    ];

    public function organicProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class, 'organic_project_id');
    }

    public function skillRun(): BelongsTo
    {
        return $this->belongsTo(OrganicSkillRun::class, 'skill_run_id');
    }
}
