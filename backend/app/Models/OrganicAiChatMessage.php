<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganicAiChatMessage extends Model
{
    protected $connection = 'mysql_marketing';

    protected $table = 'organic_ai_chat_messages';

    protected $fillable = [
        'session_id',
        'role',
        'content',
    ];

    protected $casts = [
        'role' => 'string',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(OrganicAiChatSession::class, 'session_id');
    }
}
