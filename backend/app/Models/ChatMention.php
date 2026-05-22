<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatMention extends Model
{
    use HasFactory;

    protected $table = 'chat_mentions';

    protected $fillable = [
        'chat_message_id',
        'mentionable_type',
        'mentionable_id',
        'mentioned_user_id',
    ];

    public function chatMessage()
    {
        return $this->belongsTo(ChatGlobal::class, 'chat_message_id');
    }

    public function mentionedUser()
    {
        return $this->belongsTo(User::class, 'mentioned_user_id');
    }

    public function mentionable()
    {
        return $this->morphTo();
    }
}

