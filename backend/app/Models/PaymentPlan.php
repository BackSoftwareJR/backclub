<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentPlan extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'contract_id',
        'quote_id',
        'project_id',
        'client_id',
        'status',
        'total_amount',
        'currency',
        'start_date',
        'end_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    // Relationships
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class, 'project_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function installments(): HasMany
    {
        return $this->hasMany(PaymentPlanInstallment::class)->orderBy('due_date');
    }

    public function renewals(): HasMany
    {
        return $this->hasMany(PaymentPlanRenewal::class)->where('is_active', true);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForContract($query, $contractId)
    {
        return $query->where('contract_id', $contractId);
    }
}
