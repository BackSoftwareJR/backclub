<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contract extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_number',
        'quote_id',
        'client_id',
        'seller_id',
        'crm_project_id',
        'status',
        'title',
        'contract_type',
        'start_date',
        'end_date',
        'total_value',
        'payment_terms',
        'contract_file',
        'signed_file',
        'signed_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_value' => 'decimal:2',
        'signed_at' => 'datetime',
    ];

    /**
     * Boot del model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($contract) {
            if (!$contract->contract_number) {
                $contract->contract_number = self::generateContractNumber();
            }
        });
    }

    /**
     * Genera numero contratto univoco
     */
    public static function generateContractNumber(): string
    {
        $year = date('Y');
        $lastContract = self::whereYear('created_at', $year)
                           ->orderBy('id', 'desc')
                           ->first();
        
        $number = $lastContract ? intval(substr($lastContract->contract_number, -4)) + 1 : 1;
        
        return 'CTR-' . $year . '-' . str_pad($number, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Relazione con Quote
     */
    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    /**
     * Relazione con Client
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Relazione con Seller
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    /**
     * Relazione con CrmProject
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class, 'crm_project_id');
    }

    /**
     * Relazione con PaymentPlan
     */
    public function paymentPlans(): HasMany
    {
        return $this->hasMany(PaymentPlan::class);
    }

    /**
     * Relazione con User (creatore)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relazione con ContractRevisions
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(ContractRevision::class);
    }

    /**
     * Relazione con ContractSignedDocuments
     */
    public function signedDocuments(): HasMany
    {
        return $this->hasMany(ContractSignedDocument::class);
    }

    /**
     * Scope per stato
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope per venditore
     */
    public function scopeBySeller($query, $sellerId)
    {
        return $query->where('seller_id', $sellerId);
    }

    /**
     * Scope per contratti attivi
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope per contratti in scadenza
     */
    public function scopeExpiringSoon($query, $days = 30)
    {
        return $query->whereNotNull('end_date')
                     ->whereDate('end_date', '<=', now()->addDays($days))
                     ->whereDate('end_date', '>=', now())
                     ->where('status', 'active');
    }

    /**
     * Verifica se il contratto è attivo
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Verifica se il contratto è firmato
     */
    public function isSigned(): bool
    {
        return !is_null($this->signed_at) && !is_null($this->signed_file);
    }

    /**
     * Giorni rimanenti al contratto
     */
    public function daysRemaining(): ?int
    {
        if (!$this->end_date) {
            return null;
        }
        return now()->diffInDays($this->end_date, false);
    }
}

