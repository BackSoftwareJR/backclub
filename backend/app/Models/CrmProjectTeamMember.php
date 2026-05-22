<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTeamMember extends Model
{
    use HasFactory;

    protected $table = 'crm_project_team_members';

    protected $fillable = [
        'crm_project_id',
        'user_id',
        'role',
        'is_active',
        'start_date',
        'end_date',
        'payment_methods',
        'project_rate_cocchi',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
        'payment_methods' => 'array',
        'project_rate_cocchi' => 'decimal:2',
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
     * Scope per membri attivi
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

