<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTaskCommentAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_task_comment_id',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
    ];

    public function comment(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTaskComment::class, 'crm_project_task_comment_id');
    }
}
