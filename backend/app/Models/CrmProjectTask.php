<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmProjectTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_project_id',
        'crm_label_id',
        'title',
        'description',
        'status',
        'execution_mode',
        'exact_prompt',
        'priority',
        'start_date',
        'due_date',
        'completed_date',
        'progress',
        'estimated_hours',
        'actual_hours',
        'budget_cocchi',
        'parent_task_id',
        'created_by',
        'n8n_status',
        'n8n_execution_id',
        'n8n_queue_position',
        'n8n_response',
        'n8n_response_format',
        'n8n_error',
        'n8n_completed_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'completed_date' => 'date',
        'n8n_completed_at' => 'datetime',
        'exact_prompt' => 'boolean',
        'progress' => 'integer',
        'n8n_queue_position' => 'integer',
        'estimated_hours' => 'decimal:2',
        'actual_hours' => 'decimal:2',
        'budget_cocchi' => 'decimal:2',
        'n8n_response' => 'array',
    ];

    /**
     * Relazione con CrmProject
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class, 'crm_project_id');
    }

    /**
     * Relazione con CrmDepartment (etichetta CRM)
     */
    public function crmLabel(): BelongsTo
    {
        return $this->belongsTo(CrmDepartment::class, 'crm_label_id');
    }

    /**
     * Relazione con User (creatore)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relazione con Task padre
     */
    public function parentTask(): BelongsTo
    {
        return $this->belongsTo(CrmProjectTask::class, 'parent_task_id');
    }

    /**
     * Relazione con sottotask
     */
    public function subtasks(): HasMany
    {
        return $this->hasMany(CrmProjectTask::class, 'parent_task_id');
    }

    /**
     * Relazione con assegnazioni
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(CrmProjectTaskAssignment::class, 'crm_project_task_id');
    }

    /**
     * Relazione con utenti assegnati (many-to-many tramite assignments)
     */
    public function assignedUsers()
    {
        return $this->belongsToMany(User::class, 'crm_project_task_assignments', 'crm_project_task_id', 'user_id')
            ->withPivot(['payment_method', 'hourly_rate_cocchi', 'hours_requested', 'task_rate_cocchi', 'total_cost_cocchi', 'is_active'])
            ->withTimestamps();
    }

    /**
     * Relazione con richieste di spostamento
     */
    public function rescheduleRequests(): HasMany
    {
        return $this->hasMany(CrmProjectTaskRescheduleRequest::class, 'crm_project_task_id');
    }

    /**
     * Relazione con richieste di eliminazione
     */
    public function deletionRequests(): HasMany
    {
        return $this->hasMany(CrmProjectTaskDeletionRequest::class, 'crm_project_task_id');
    }

    /**
     * Relazione con commenti
     */
    public function comments(): HasMany
    {
        return $this->hasMany(CrmProjectTaskComment::class, 'crm_project_task_id');
    }

    /**
     * Relazione con eventi
     */
    public function events(): HasMany
    {
        return $this->hasMany(CrmProjectTaskEvent::class, 'crm_project_task_id');
    }

    /**
     * Relazione con step N8N
     */
    public function n8nSteps(): HasMany
    {
        return $this->hasMany(CrmProjectTaskN8nStep::class, 'crm_project_task_id');
    }

    /**
     * Scope per task attivi
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['completed', 'cancelled']);
    }

    /**
     * Scope per stato
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope per priorità
     */
    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Calcola il costo totale delle assegnazioni
     */
    public function getTotalAssignmentCost(): float
    {
        return $this->assignments()
            ->where('is_active', true)
            ->sum('total_cost_cocchi') ?? 0;
    }
}

