<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Seller extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'contract_file',
        'contract_start_date',
        'contract_end_date',
        'territory',
        'commission_rate',
        'is_active',
    ];

    protected $casts = [
        'territory' => 'array',
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'commission_rate' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Relazione con User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relazione con SellerDepartment
     */
    public function sellerDepartments(): HasMany
    {
        return $this->hasMany(SellerDepartment::class);
    }

    /**
     * Relazione many-to-many con CrmDepartment tramite seller_departments
     */
    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(
            CrmDepartment::class,
            'seller_departments',
            'seller_id',
            'crm_department_id'
        )->withPivot('is_active', 'currently_working')
          ->withTimestamps();
    }

    /**
     * Settori attivi del venditore
     */
    public function activeDepartments(): BelongsToMany
    {
        return $this->departments()->wherePivot('is_active', 1);
    }

    /**
     * Settore in cui sta lavorando attualmente
     */
    public function currentDepartment(): BelongsToMany
    {
        return $this->departments()->wherePivot('currently_working', 1);
    }

    /**
     * Relazione con Clients
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class, 'seller_id');
    }

    /**
     * Relazione con CrmProjects
     */
    public function projects(): HasMany
    {
        return $this->hasMany(CrmProject::class, 'seller_id');
    }

    /**
     * Relazione con Quotes
     */
    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    /**
     * Relazione con Contracts
     */
    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    /**
     * Relazione con Leads
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'assigned_seller_id');
    }

    /**
     * Relazione con SellerSupportTicket
     */
    public function supportTickets(): HasMany
    {
        return $this->hasMany(SellerSupportTicket::class);
    }

    /**
     * Scope per venditori attivi
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', 1);
    }

    /**
     * Scope per venditori con contratto in scadenza
     */
    public function scopeExpiringContracts($query, $days = 30)
    {
        return $query->whereNotNull('contract_end_date')
                     ->whereDate('contract_end_date', '<=', now()->addDays($days))
                     ->whereDate('contract_end_date', '>=', now());
    }

    /**
     * Verifica se il contratto è scaduto
     */
    public function isContractExpired(): bool
    {
        if (!$this->contract_end_date) {
            return false;
        }
        return $this->contract_end_date->isPast();
    }

    /**
     * Giorni rimanenti al contratto
     */
    public function contractDaysRemaining(): ?int
    {
        if (!$this->contract_end_date) {
            return null;
        }
        return now()->diffInDays($this->contract_end_date, false);
    }
}

