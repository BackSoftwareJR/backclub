<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SerbatoioTransaction extends Model
{
    protected $table = 'serbatoio_transactions';

    protected $fillable = [
        'serbatoio_id',
        'type',
        'amount',
        'balance_before',
        'balance_after',
        'from_serbatoio_id',
        'to_serbatoio_id',
        'related_type',
        'related_id',
        'reason',
        'metadata',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'metadata' => 'array',
    ];

    protected $appends = [
        'formatted_amount',
        'is_positive',
        'type_label',
    ];

    /**
     * Relazione: Serbatoio principale
     */
    public function serbatoio()
    {
        return $this->belongsTo(Serbatoio::class, 'serbatoio_id');
    }

    /**
     * Relazione: Serbatoio sorgente (per trasferimenti)
     */
    public function fromSerbatoio()
    {
        return $this->belongsTo(Serbatoio::class, 'from_serbatoio_id');
    }

    /**
     * Relazione: Serbatoio destinazione (per trasferimenti)
     */
    public function toSerbatoio()
    {
        return $this->belongsTo(Serbatoio::class, 'to_serbatoio_id');
    }

    /**
     * Relazione: Utente creatore
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relazione polimorfica: Entità correlata (invoice, expense, etc.)
     */
    public function relatedEntity()
    {
        return $this->morphTo('related');
    }

    /**
     * Accessor: Importo formattato
     */
    public function getFormattedAmountAttribute()
    {
        $prefix = $this->amount >= 0 ? '+' : '';
        return $prefix . '¢ ' . number_format(abs($this->amount), 2, ',', '.');
    }

    /**
     * Accessor: Check se importo è positivo
     */
    public function getIsPositiveAttribute()
    {
        return $this->amount >= 0;
    }

    /**
     * Accessor: Label del tipo transazione
     */
    public function getTypeLabelAttribute()
    {
        return match($this->type) {
            'auto_income' => 'Auto-Income',
            'manual_transfer_in' => 'Transfer In',
            'manual_transfer_out' => 'Transfer Out',
            'expense' => 'Spesa',
            'adjustment' => 'Rettifica',
            default => ucfirst($this->type),
        };
    }

    /**
     * Scope: Solo entrate
     */
    public function scopeIncome($query)
    {
        return $query->whereIn('type', ['auto_income', 'manual_transfer_in'])
                     ->where('amount', '>', 0);
    }

    /**
     * Scope: Solo uscite
     */
    public function scopeExpenses($query)
    {
        return $query->whereIn('type', ['manual_transfer_out', 'expense'])
                     ->where('amount', '<', 0);
    }

    /**
     * Scope: Per periodo
     */
    public function scopeForPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope: Per tipo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
