<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailAttachment extends Model
{
    use HasFactory;

    protected $table = 'email_attachments';

    protected $fillable = [
        'email_sent_log_id',
        'document_id',
        'path',
        'filename',
        'original_name',
        'mime_type',
        'size',
    ];

    public function emailLog()
    {
        return $this->belongsTo(EmailSentLog::class, 'email_sent_log_id');
    }

    public function document()
    {
        return $this->belongsTo(Document::class, 'document_id');
    }
}

