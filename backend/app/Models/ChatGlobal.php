<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatGlobal extends Model
{
    use HasFactory;

    protected $table = 'chat_global';

    protected $fillable = [
        'user_id',
        'message',
        'message_type',
        'media_path',
        'reply_to_id',
        'is_edited',
        'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'is_edited' => 'boolean',
            'is_deleted' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function replyTo()
    {
        return $this->belongsTo(ChatGlobal::class, 'reply_to_id');
    }

    public function mentions()
    {
        return $this->hasMany(ChatMention::class, 'chat_message_id');
    }

    public function readStatus()
    {
        return $this->hasMany(ChatReadStatus::class, 'chat_message_id');
    }

    /**
     * Check if message is read by user
     */
    public function isReadBy(int $userId): bool
    {
        return $this->readStatus()->where('user_id', $userId)->exists();
    }

    /**
     * Mark message as read by user
     */
    public function markAsRead(int $userId): void
    {
        $this->readStatus()->firstOrCreate([
            'user_id' => $userId,
        ], [
            'read_at' => now(),
        ]);
    }
}

