<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectChatMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'message',
        'is_pm_chat',
        'parent_message_id',
        'attachments',
        'is_read',
    ];

    protected $casts = [
        'is_pm_chat' => 'boolean',
        'is_read' => 'boolean',
        'attachments' => 'array',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parentMessage()
    {
        return $this->belongsTo(ProjectChatMessage::class, 'parent_message_id');
    }

    public function replies()
    {
        return $this->hasMany(ProjectChatMessage::class, 'parent_message_id');
    }

    public function scopePmChat($query)
    {
        return $query->where('is_pm_chat', true);
    }

    public function scopeGeneralChat($query)
    {
        return $query->where('is_pm_chat', false);
    }

    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }
}
