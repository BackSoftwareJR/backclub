<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicSitemapAlert extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_sitemap_alerts';

    protected $fillable = [
        'organic_web_project_id',
        'type',
        'severity',
        'message',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }

    public function scopeActive($query)
    {
        return $query->whereNull('resolved_at');
    }
}
