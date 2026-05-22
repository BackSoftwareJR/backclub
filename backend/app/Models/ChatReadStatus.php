<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatReadStatus extends Model
{
    use HasFactory;

    protected $table = 'chat_read_status';

    protected $fillable = [
        'chat_message_id',
        'user_id',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function chatMessage()
    {
        return $this->belongsTo(ChatGlobal::class, 'chat_message_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

