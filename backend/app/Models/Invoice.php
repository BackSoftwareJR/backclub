<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\CrmProject;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'client_id',
        'project_id',
        'issue_date',
        'due_date',
        'amount_cocchi',
        'tax_cocchi',
        'total_cocchi',
        'status',
        'notes',
        'document_path',
        'created_by',
        'paid_at',
        // New fields
        'type',
        'credit_note_for_invoice_id',
        'invoice_link',
        'receipt_link',
        'bollo_amount',
        'amount_before_bollo',
        'payment_plan_id',
        'installment_number',
    ];

    protected $casts = [
        'amount_cocchi' => 'decimal:2',
        'tax_cocchi' => 'decimal:2',
        'total_cocchi' => 'decimal:2',
        'bollo_amount' => 'decimal:2',
        'amount_before_bollo' => 'decimal:2',
        'issue_date' => 'date',
        'due_date' => 'date',
        'paid_at' => 'datetime',
    ];

    // Relationships
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(CrmProject::class, 'project_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paymentPlan(): BelongsTo
    {
        return $this->belongsTo(PaymentPlan::class);
    }

    public function creditNoteFor(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'credit_note_for_invoice_id');
    }

    public function creditNotes(): HasMany
    {
        return $this->hasMany(Invoice::class, 'credit_note_for_invoice_id');
    }

    public function reserveAllocations(): HasMany
    {
        return $this->hasMany(InvoiceReserveAllocation::class);
    }

    public function bolloTransaction(): HasOne
    {
        return $this->hasOne(InvoiceBolloTransaction::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    // Scopes
    public function scopeToIssue($query)
    {
        return $query->where('status', 'draft')
            ->orWhere(function($q) {
                $q->where('status', 'sent')
                  ->where('due_date', '<=', now()->toDateString());
            });
    }

    public function scopeToSettle($query)
    {
        return $query->where('status', 'sent')
            ->where('paid_at', null);
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeInvoices($query)
    {
        return $query->where('type', 'invoice');
    }

    public function scopeCreditNotes($query)
    {
        return $query->where('type', 'credit_note');
    }
}
