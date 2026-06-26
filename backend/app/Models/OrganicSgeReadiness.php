<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicSgeReadiness extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_sge_readiness';

    protected $fillable = [
        'organic_web_project_id',
        'url',
        'has_schema',
        'schema_types',
        'ai_generated_jsonld',
    ];

    protected function casts(): array
    {
        return [
            'schema_types' => 'array',
            'has_schema'   => 'boolean',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
