<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    use HasFactory;

    protected $fillable = [
        'assigned_seller_id',
        'company_name',
        'tipologia',
        'contact_person',
        'address',
        'phones',
        'emails',
        'crm_department_id',
        'websites',
        'description',
        'digital_status',
        'pitch_strategy',
        'status',
        'priority',
        'estimated_value',
        'expected_close_date',
        'source',
        'last_contact_date',
        'next_followup_date',
        'notes',
        'converted_to_client_id',
        'created_by',
        'referral_user_id',
        'region',
    ];

    protected $casts = [
        'phones' => 'array',
        'emails' => 'array',
        'websites' => 'array',
        'estimated_value' => 'decimal:2',
        'expected_close_date' => 'date',
        'last_contact_date' => 'date',
        'next_followup_date' => 'date',
    ];

    /**
     * Relazione con Seller
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class, 'assigned_seller_id');
    }

    /**
     * Relazione con CrmDepartment
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(CrmDepartment::class, 'crm_department_id');
    }

    /**
     * Relazione con Client (se convertito)
     */
    public function convertedClient(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'converted_to_client_id');
    }

    /**
     * Relazione con User (creatore)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relazione con User (referral)
     */
    public function referralUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referral_user_id');
    }

    /**
     * Relazione con LeadActivities
     */
    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class)->orderBy('created_at', 'desc');
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
     * Scope per venditore
     */
    public function scopeBySeller($query, $sellerId)
    {
        return $query->where('assigned_seller_id', $sellerId);
    }

    /**
     * Scope per leads da seguire
     */
    public function scopeNeedsFollowup($query)
    {
        return $query->whereNotNull('next_followup_date')
                     ->whereDate('next_followup_date', '<=', now())
                     ->whereNotIn('status', ['won', 'lost']);
    }

    /**
     * Scope per leads nuovi
     */
    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }

    /**
     * Scope per leads non assegnati
     */
    public function scopeUnassigned($query)
    {
        return $query->whereNull('assigned_seller_id');
    }

    /**
     * Verifica se il lead è convertito
     */
    public function isConverted(): bool
    {
        return !is_null($this->converted_to_client_id);
    }

    /**
     * Verifica se necessita follow-up
     */
    public function needsFollowup(): bool
    {
        if (!$this->next_followup_date) {
            return false;
        }
        return $this->next_followup_date->isPast() && !in_array($this->status, ['won', 'lost']);
    }

    /**
     * Ottieni telefono principale
     */
    public function getPrimaryPhone(): ?string
    {
        if (!$this->phones) {
            return null;
        }
        
        $primary = collect($this->phones)->firstWhere('isPrimary', true);
        return $primary['number'] ?? ($this->phones[0]['number'] ?? null);
    }

    /**
     * Ottieni email principale
     */
    public function getPrimaryEmail(): ?string
    {
        if (!$this->emails) {
            return null;
        }
        
        $primary = collect($this->emails)->firstWhere('isPrimary', true);
        return $primary['email'] ?? ($this->emails[0]['email'] ?? null);
    }

    /**
     * Aggiungi attività
     */
    public function addActivity(string $type, string $description, ?string $outcome = null, ?int $userId = null, ?array $emailDetails = null): LeadActivity
    {
        $data = [
            'user_id' => $userId ?? auth()->id(),
            'activity_type' => $type,
            'description' => $description,
            'outcome' => $outcome,
        ];
        
        if ($emailDetails !== null) {
            $data['email_details'] = json_encode($emailDetails);
        }
        
        return $this->activities()->create($data);
    }
}

