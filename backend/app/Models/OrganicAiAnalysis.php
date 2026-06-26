<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicAiAnalysis extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_ai_analyses';

    protected $fillable = [
        'organic_web_project_id',
        'analysis_type',
        'model_used',
        'raw_context_used',
        'generated_markdown',
        'action_plan',
    ];

    protected $casts = [
        'raw_context_used' => 'array',
        'action_plan'      => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class, 'organic_web_project_id');
    }
}
