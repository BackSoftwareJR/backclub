<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectResource extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'type',
        'name',
        'description',
        'url',
        'username',
        'password',
        'notes',
        'created_by',
    ];

    protected $hidden = [
        'password',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

