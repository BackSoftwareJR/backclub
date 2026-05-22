<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceInstallment extends Model
{
    use HasFactory;

    protected $table = 'invoice_installments';

    protected $fillable = [
        'invoice_id',
        'installment_number',
        'amount_cocchi',
        'due_date',
        'status',
        'paid_at',
        'payment_method',
        'payment_reference',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount_cocchi' => 'decimal:2',
            'due_date' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function payments()
    {
        return $this->hasMany(InvoicePayment::class, 'installment_id');
    }

    /**
     * Calcola totale pagato per questa rata
     */
    public function getTotalPaidAttribute(): float
    {
        return (float) $this->payments()->sum('amount_cocchi');
    }

    /**
     * Verifica se la rata è completamente pagata
     */
    public function isFullyPaid(): bool
    {
        return $this->getTotalPaidAttribute() >= $this->amount_cocchi;
    }
}

