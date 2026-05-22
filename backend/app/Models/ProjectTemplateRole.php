<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectTemplateRole extends Model
{
    protected $fillable = [
        'template_id',
        'role_code',
        'role_name',
        'is_required',
    ];

    protected $casts = [
        'is_required' => 'boolean',
    ];

    /**
     * Relationships
     */
    public function template()
    {
        return $this->belongsTo(ProjectTemplate::class, 'template_id');
    }
}

