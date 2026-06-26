<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganicAiReport extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_ai_reports';

    protected $fillable = [
        'organic_web_project_id',
        'title',
        'deep_analysis_markdown',
        'model_used',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class, 'organic_web_project_id');
    }

    public function chatSessions(): HasMany
    {
        return $this->hasMany(OrganicAiChatSession::class, 'report_id');
    }
}
