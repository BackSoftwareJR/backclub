<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTaskAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_task_id',
        'user_id',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_project_task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
