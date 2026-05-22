<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseReimbursementRequest extends Model
{
    use SoftDeletes;

    protected $table = 'expense_reimbursement_requests';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'amount',
        'category',
        'expense_date',
        'crm_code',
        'project_id',
        'client_id',
        'receipt_file_path',
        'receipt_file_name',
        'additional_files',
        'status',
        'requested_at',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'payment_notes',
        'paid_at',
        'paid_by',
        'uscita_id',
        'payment_method',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'requested_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'paid_at' => 'datetime',
        'additional_files' => 'array',
        'metadata' => 'array',
    ];

    protected $appends = [
        'status_label',
        'days_pending',
        'urgency_level',
    ];

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function uscita(): BelongsTo
    {
        return $this->belongsTo(UscitaCocchi::class, 'uscita_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    // ============================================================
    // ACCESSORS
    // ============================================================

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'pending' => 'In Attesa',
            'approved' => 'Approvato',
            'rejected' => 'Rifiutato',
            'paid' => 'Pagato',
            'cancelled' => 'Annullato',
            default => ucfirst($this->status),
        };
    }

    public function getDaysPendingAttribute(): ?int
    {
        if ($this->status !== 'pending' || !$this->requested_at) {
            return null;
    }
        return now()->diffInDays($this->requested_at);
    }

    public function getUrgencyLevelAttribute(): string
    {
        if ($this->status !== 'pending') {
            return 'none';
        }
        
        $days = $this->days_pending ?? 0;
        
        if ($days > 7) return 'overdue';
        if ($days > 3) return 'urgent';
        return 'normal';
    }

    // ============================================================
    // SCOPES
    // ============================================================

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForCrm($query, string $crmCode)
    {
        return $query->where('crm_code', $crmCode);
    }

    public function scopeForProject($query, int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('expense_date', [$startDate, $endDate]);
    }

    // ============================================================
    // METHODS
    // ============================================================

    public function approve(int $reviewerId, ?string $notes = null): self
    {
        $this->status = 'approved';
        $this->reviewed_by = $reviewerId;
        $this->reviewed_at = now();
            $this->payment_notes = $notes;
        $this->save();

        // Log audit
        $this->logAudit('approved', $reviewerId);

        return $this;
    }

    public function reject(int $reviewerId, string $reason): self
    {
        $this->status = 'rejected';
        $this->reviewed_by = $reviewerId;
        $this->reviewed_at = now();
        $this->rejection_reason = $reason;
        $this->save();

        // Log audit
        $this->logAudit('rejected', $reviewerId);

        return $this;
    }

    public function markAsPaid(int $paidBy, int $uscitaId): self
    {
        $this->status = 'paid';
        $this->paid_by = $paidBy;
        $this->paid_at = now();
        $this->uscita_id = $uscitaId;
        $this->save();

        // Log audit
        $this->logAudit('paid', $paidBy);

        return $this;
    }

    public function cancel(): self
    {
        $this->status = 'cancelled';
        $this->save();

        // Log audit
        $this->logAudit('cancelled', auth()->id());

        return $this;
    }

    protected function logAudit(string $action, ?int $userId = null): void
    {
        ExpenseAuditLog::create([
            'auditable_type' => self::class,
            'auditable_id' => $this->id,
            'action' => $action,
            'user_id' => $userId ?? auth()->id(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'new_values' => $this->toArray(),
        ]);
    }
}
