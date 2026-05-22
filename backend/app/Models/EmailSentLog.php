<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailSentLog extends Model
{
    use HasFactory;

    protected $table = 'email_sent_logs';

    protected $fillable = [
        'template_id',
        'to_email',
        'to_name',
        'subject',
        'body_html',
        'sent_by',
        'related_type',
        'related_id',
        'status',
        'sent_at',
        'is_template',
        'custom_subject',
        'custom_body',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    public function template()
    {
        return $this->belongsTo(EmailTemplate::class, 'template_id');
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function related()
    {
        return $this->morphTo();
    }

    public function attachments()
    {
        return $this->hasMany(EmailAttachment::class, 'email_sent_log_id');
    }

    protected function casts(): array
    {
        return [
            'is_template' => 'boolean',
            'sent_at' => 'datetime',
        ];
    }
}

