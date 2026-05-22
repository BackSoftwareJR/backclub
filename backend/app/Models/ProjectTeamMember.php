<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectTeamMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'role',
        'payment_type',
        'payment_amount',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'payment_amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

