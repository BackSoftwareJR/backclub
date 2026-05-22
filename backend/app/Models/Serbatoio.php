<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Serbatoio extends Model
{
    use SoftDeletes;

    protected $table = 'serbatoi';

    protected $fillable = [
        'name',
        'description',
        'balance',
        'color',
        'auto_distribution_enabled',
        'auto_distribution_percentage',
        'priority_order',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'auto_distribution_percentage' => 'decimal:2',
        'auto_distribution_enabled' => 'boolean',
        'is_active' => 'boolean',
        'priority_order' => 'integer',
    ];

    protected $appends = [
        'formatted_balance',
        'is_auto_enabled',
    ];

    /**
     * Relazione: Utente creatore
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relazione: Tutte le transazioni del serbatoio
     */
    public function transactions()
    {
        return $this->hasMany(SerbatoioTransaction::class, 'serbatoio_id')
                    ->orderBy('created_at', 'desc');
    }

    /**
     * Relazione: Transazioni in entrata
     */
    public function incomingTransactions()
    {
        return $this->hasMany(SerbatoioTransaction::class, 'to_serbatoio_id')
                    ->whereIn('type', ['manual_transfer_in', 'auto_income'])
                    ->orderBy('created_at', 'desc');
    }

    /**
     * Relazione: Transazioni in uscita
     */
    public function outgoingTransactions()
    {
        return $this->hasMany(SerbatoioTransaction::class, 'from_serbatoio_id')
                    ->whereIn('type', ['manual_transfer_out', 'expense'])
                    ->orderBy('created_at', 'desc');
    }

    /**
     * Relazione: Uscite cocchi collegate
     */
    public function usciteCocchi()
    {
        return $this->hasMany(UscitaCocchi::class, 'serbatoio_id');
    }

    /**
     * Relazione: Commenti sul serbatoio
     */
    public function comments()
    {
        return $this->hasMany(SerbatoioComment::class, 'serbatoio_id')
                    ->with('user')
                    ->orderBy('created_at', 'desc');
    }

    /**
     * Accessor: Saldo formattato con simbolo cocchi
     */
    public function getFormattedBalanceAttribute()
    {
        return '¢ ' . number_format($this->balance, 2, ',', '.');
    }

    /**
     * Accessor: Check se auto-distribuzione è abilitata
     */
    public function getIsAutoEnabledAttribute()
    {
        return $this->auto_distribution_enabled && $this->auto_distribution_percentage > 0;
    }

    /**
     * Scope: Solo serbatoi attivi
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Solo serbatoi con auto-distribuzione
     */
    public function scopeAutoEnabled($query)
    {
        return $query->where('auto_distribution_enabled', true)
                     ->where('auto_distribution_percentage', '>', 0);
    }

    /**
     * Scope: Ordinati per priorità
     */
    public function scopeByPriority($query)
    {
        return $query->orderBy('priority_order', 'asc')
                     ->orderBy('name', 'asc');
    }

    /**
     * Metodo helper: Aggiunge cocchi al serbatoio
     */
    public function addCocchi(float $amount, string $type, string $reason, ?int $fromSerbatoioId = null, ?int $userId = null)
    {
        $balanceBefore = $this->balance;
        $this->balance += $amount;
        $this->save();

        return SerbatoioTransaction::create([
            'serbatoio_id' => $this->id,
            'type' => $type,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->balance,
            'from_serbatoio_id' => $fromSerbatoioId,
            'to_serbatoio_id' => $this->id,
            'reason' => $reason,
            'created_by' => $userId ?? auth()->id(),
        ]);
    }

    /**
     * Metodo helper: Sottrae cocchi dal serbatoio
     */
    public function subtractCocchi(float $amount, string $type, string $reason, ?int $toSerbatoioId = null, ?int $userId = null)
    {
        if ($this->balance < $amount) {
            throw new \Exception("Saldo insufficiente nel serbatoio {$this->name}");
        }

        $balanceBefore = $this->balance;
        $this->balance -= $amount;
        $this->save();

        return SerbatoioTransaction::create([
            'serbatoio_id' => $this->id,
            'type' => $type,
            'amount' => -$amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->balance,
            'from_serbatoio_id' => $this->id,
            'to_serbatoio_id' => $toSerbatoioId,
            'reason' => $reason,
            'created_by' => $userId ?? auth()->id(),
        ]);
    }

    /**
     * Metodo statico: Trasferimento tra serbatoi
     */
    public static function transfer(int $fromId, int $toId, float $amount, string $reason, ?int $userId = null)
    {
        $from = self::findOrFail($fromId);
        $to = self::findOrFail($toId);

        if ($from->balance < $amount) {
            throw new \Exception("Saldo insufficiente nel serbatoio {$from->name}");
        }

        // Sottrai dal serbatoio sorgente
        $from->subtractCocchi($amount, 'manual_transfer_out', $reason, $to->id, $userId);

        // Aggiungi al serbatoio destinazione
        $to->addCocchi($amount, 'manual_transfer_in', $reason, $from->id, $userId);

        return [
            'from' => $from->fresh(),
            'to' => $to->fresh(),
        ];
    }

    /**
     * Metodo statico: Distribuisci entrata automaticamente
     */
    public static function distributeIncome(float $totalAmount, ?int $userId = null, ?array $metadata = null)
    {
        $serbatoi = self::autoEnabled()->active()->get();
        
        if ($serbatoi->isEmpty()) {
            return [];
        }

        $transactions = [];

        foreach ($serbatoi as $serbatoio) {
            $amount = ($totalAmount * $serbatoio->auto_distribution_percentage) / 100;
            
            if ($amount > 0) {
                $reason = "Auto-distribuzione {$serbatoio->auto_distribution_percentage}% da entrata di ¢ " . number_format($totalAmount, 2);
                
                $transaction = $serbatoio->addCocchi(
                    $amount,
                    'auto_income',
                    $reason,
                    null,
                    $userId
                );

                if ($metadata) {
                    $transaction->update(['metadata' => json_encode($metadata)]);
                }

                $transactions[] = $transaction;
            }
        }

        return $transactions;
    }
}
