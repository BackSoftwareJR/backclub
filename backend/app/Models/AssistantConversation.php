<?php

namespace App\Models;

use App\Enums\ConversationRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssistantConversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'focus_session_id',
        'role',
        'content',
        'intent_detected',
        'metadata',
    ];

    protected $casts = [
        'role'     => ConversationRole::class,
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(FocusSession::class, 'focus_session_id');
    }
}
