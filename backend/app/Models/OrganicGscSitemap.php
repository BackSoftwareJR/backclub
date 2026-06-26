<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicGscSitemap extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_gsc_sitemaps';

    protected $fillable = [
        'organic_web_project_id',
        'path',
        'last_submitted',
        'last_downloaded',
        'status',
        'downloaded_urls',
        'indexed_urls',
        'errors',
    ];

    protected function casts(): array
    {
        return [
            'last_submitted' => 'datetime',
            'last_downloaded' => 'datetime',
            'downloaded_urls' => 'integer',
            'indexed_urls' => 'integer',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
