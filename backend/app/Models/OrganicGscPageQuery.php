<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicGscPageQuery extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_gsc_page_queries';

    protected $fillable = [
        'organic_web_project_id',
        'date',
        'page_url',
        'query',
        'clicks',
        'impressions',
        'ctr',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'clicks' => 'integer',
            'impressions' => 'integer',
            'ctr' => 'double',
            'position' => 'double',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
