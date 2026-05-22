<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectType extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'required_fields',
        'default_duration_days',
        'icon',
        'color',
        'is_active',
    ];

    protected $casts = [
        'required_fields' => 'array',
        'is_active' => 'boolean',
        'default_duration_days' => 'integer',
    ];

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
