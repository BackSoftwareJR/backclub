<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Project;
use App\Models\User;
use App\Models\TaskComment;
use App\Models\Document;

class Task extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function assignees()
    {
        return $this->belongsToMany(User::class, 'task_assignees');
    }

    public function comments()
    {
        return $this->hasMany(TaskComment::class);
    }

    public function documents()
    {
        return $this->morphMany(Document::class, 'attachable');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
