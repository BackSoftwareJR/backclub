<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicGscIndexingError extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_gsc_indexing_errors';

    protected $fillable = [
        'organic_web_project_id',
        'url',
        'verdict',
        'coverage_state',
        'last_scanned_at',
    ];

    protected function casts(): array
    {
        return [
            'last_scanned_at' => 'datetime',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
