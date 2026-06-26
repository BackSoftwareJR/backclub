<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicGscUrlDetail extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_gsc_url_details';

    protected $fillable = [
        'organic_web_project_id',
        'url',
        'indexing_status',
        'last_crawled',
        'canonical_url',
        'mobile_usability',
        'coverage_state',
        'blocked_by_robots',
        'errors_json',
        'inspection_result',
    ];

    protected function casts(): array
    {
        return [
            'last_crawled' => 'datetime',
            'blocked_by_robots' => 'boolean',
            'errors_json' => 'array',
            'inspection_result' => 'array',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
