<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectPmChatMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_id',
        'user_id',
        'message',
        'message_type',
        'media_path',
        'media_name',
        'media_size',
        'media_type',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relazione con CrmProject
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class, 'crm_project_id');
    }

    /**
     * Relazione con User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope per messaggi non letti
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope per messaggi di tipo specifico
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('message_type', $type);
    }
}

