<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrmExpense extends Model
{
    use HasFactory;

    protected $fillable = [
        'crm_department_id',
        'type',
        'name',
        'description',
        'amount',
        'frequency',
        'start_date',
        'end_date',
        'status',
        'category',
        'related_user_id',
        'related_project_id',
        'attachment_url',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    protected $appends = ['formatted_amount', 'is_recurring', 'type_label'];

    // Relationships
    public function crmDepartment()
    {
        return $this->belongsTo(CrmDepartment::class);
    }

    public function relatedUser()
    {
        return $this->belongsTo(User::class, 'related_user_id');
    }

    public function relatedProject()
    {
        return $this->belongsTo(Project::class, 'related_project_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Accessors
    public function getFormattedAmountAttribute()
    {
        return '€ ' . number_format($this->amount, 2, ',', '.');
    }

    public function getIsRecurringAttribute()
    {
        return $this->frequency !== 'once';
    }

    public function getTypeLabelAttribute()
    {
        return match ($this->type) {
            'abbonamento' => 'Abbonamento',
            'spesa_prevista' => 'Spesa Prevista',
            'spesa_imprevista' => 'Spesa Imprevista',
            'servizio' => 'Servizio',
            'altro' => 'Altro',
            default => ucfirst($this->type),
        };
    }

    public function getFrequencyLabelAttribute()
    {
        return match ($this->frequency) {
            'once' => 'Una tantum',
            'monthly' => 'Mensile',
            'quarterly' => 'Trimestrale',
            'yearly' => 'Annuale',
            default => ucfirst($this->frequency),
        };
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeRecurring($query)
    {
        return $query->where('frequency', '!=', 'once');
    }

    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('crm_department_id', $departmentId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }
}
