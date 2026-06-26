<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganicAiChatSession extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_ai_chat_sessions';

    protected $fillable = [
        'organic_web_project_id',
        'report_id',
        'title',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(OrganicAiChatMessage::class, 'session_id');
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(OrganicAiReport::class, 'report_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(OrganicWebProject::class, 'organic_web_project_id');
    }
}
