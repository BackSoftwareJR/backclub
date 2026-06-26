<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicSitemapHealthHistory extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_sitemap_health_history';

    protected $fillable = [
        'organic_web_project_id',
        'score',
        'breakdown_json',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'breakdown_json' => 'array',
            'recorded_at' => 'datetime',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
