<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicInternalLink extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_internal_links';

    protected $fillable = [
        'organic_web_project_id',
        'from_url',
        'to_url',
        'anchor_text',
    ];

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
