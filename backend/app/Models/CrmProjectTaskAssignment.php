<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmProjectTaskAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_task_id',
        'user_id',
        'payment_method',
        'hourly_rate_cocchi',
        'hours_requested',
        'task_rate_cocchi',
        'project_rate_cocchi',
        'total_cost_cocchi',
        'is_active',
        'assigned_by',
    ];

    protected $casts = [
        'hourly_rate_cocchi' => 'decimal:2',
        'hours_requested' => 'decimal:2',
        'task_rate_cocchi' => 'decimal:2',
        'project_rate_cocchi' => 'decimal:2',
        'total_cost_cocchi' => 'decimal:2',
        'is_active' => 'boolean',
        'assigned_at' => 'datetime',
    ];

    /**
     * Relazione con Task
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'crm_project_task_id');
    }

    /**
     * Relazione con User (assegnato)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relazione con User (assegnatore)
     */
    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Calcola il costo totale in base al metodo di pagamento
     */
    public function calculateTotalCost(): float
    {
        switch ($this->payment_method) {
            case 'hourly':
                if ($this->hourly_rate_cocchi && $this->hours_requested) {
                    return $this->hourly_rate_cocchi * $this->hours_requested;
                }
                break;
            case 'per_task':
                return $this->task_rate_cocchi ?? 0;
            case 'per_project':
                return $this->project_rate_cocchi ?? 0;
            case 'fixed':
                return 0; // Nessun cocco per pagamento fisso
            case 'no_payment':
                return 0; // Nessun pagamento
        }
        return 0;
    }
}

