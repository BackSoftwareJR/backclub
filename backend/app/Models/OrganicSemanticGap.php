<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicSemanticGap extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_semantic_gaps';

    protected $fillable = [
        'organic_web_project_id',
        'url',
        'target_keyword',
        'missing_entities',
        'ai_suggested_paragraph',
    ];

    protected function casts(): array
    {
        return [
            'missing_entities' => 'array',
        ];
    }

    public function organicWebProject(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class);
    }
}
