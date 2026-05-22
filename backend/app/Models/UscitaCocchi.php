<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UscitaCocchi extends Model
{
    use SoftDeletes;

    protected $table = 'uscite_cocchi';

    protected $fillable = [
        'title',
        'description',
        'amount',
        'type',
        'category',
        'paid_to',
        'team_member_id',
        'client_id',
        'project_id',
        'serbatoio_id',
        'payment_date',
        'due_date',
        'invoice_number',
        'invoice_file_path',
        'invoice_file_name',
        'status',
        'tags',
        'notes',
        'created_by',
        'paid_by',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
        'due_date' => 'date',
        'paid_at' => 'datetime',
        'tags' => 'array',
    ];

    protected $appends = [
        'formatted_amount',
        'is_paid',
        'is_overdue',
        'status_label',
        'type_label',
    ];

    /**
     * Relazione: Membro del team (beneficiario)
     */
    public function teamMember()
    {
        return $this->belongsTo(User::class, 'team_member_id');
    }

    /**
     * Relazione: Cliente correlato
     */
    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /**
     * Relazione: Progetto correlato
     */
    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * Relazione: Serbatoio da cui prelevare
     */
    public function serbatoio()
    {
        return $this->belongsTo(Serbatoio::class, 'serbatoio_id');
    }

    /**
     * Relazione: Utente creatore
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relazione: Utente che ha effettuato il pagamento
     */
    public function payer()
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    /**
     * Accessor: Importo formattato
     */
    public function getFormattedAmountAttribute()
    {
        return '¢ ' . number_format($this->amount, 2, ',', '.');
    }

    /**
     * Accessor: Check se pagato
     */
    public function getIsPaidAttribute()
    {
        return $this->status === 'paid';
    }

    /**
     * Accessor: Check se scaduto
     */
    public function getIsOverdueAttribute()
    {
        if ($this->status === 'paid' || !$this->due_date) {
            return false;
        }
        
        return $this->due_date->isPast();
    }

    /**
     * Accessor: Label status
     */
    public function getStatusLabelAttribute()
    {
        return match($this->status) {
            'pending' => 'In Attesa',
            'paid' => 'Pagato',
            'cancelled' => 'Annullato',
            'refunded' => 'Rimborsato',
            default => ucfirst($this->status),
        };
    }

    /**
     * Accessor: Label tipo
     */
    public function getTypeLabelAttribute()
    {
        return match($this->type) {
            'fattura' => 'Fattura',
            'ricevuta' => 'Ricevuta',
            'bonifico' => 'Bonifico',
            'contanti' => 'Contanti',
            'carta' => 'Carta',
            'paypal' => 'PayPal',
            'altro' => 'Altro',
            default => ucfirst($this->type),
        };
    }

    /**
     * Scope: Solo pagate
     */
    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    /**
     * Scope: Solo pending
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Scadute
     */
    public function scopeOverdue($query)
    {
        return $query->where('status', 'pending')
                     ->whereNotNull('due_date')
                     ->where('due_date', '<', now());
    }

    /**
     * Scope: Per categoria
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope: Per tipo
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: Per periodo
     */
    public function scopeForPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('payment_date', [$startDate, $endDate]);
    }

    /**
     * Scope: Per team member
     */
    public function scopeForTeamMember($query, int $userId)
    {
        return $query->where('team_member_id', $userId);
    }

    /**
     * Scope: Per cliente
     */
    public function scopeForClient($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    /**
     * Scope: Per progetto
     */
    public function scopeForProject($query, int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    /**
     * Metodo: Marca come pagata
     */
    public function markAsPaid(?int $userId = null, ?string $serbatoioId = null)
    {
        $this->status = 'paid';
        $this->paid_at = now();
        $this->paid_by = $userId ?? auth()->id();
        $this->payment_date = $this->payment_date ?? now()->toDateString();
        
        if ($serbatoioId && !$this->serbatoio_id) {
            $this->serbatoio_id = $serbatoioId;
        }
        
        $this->save();

        // Se c'è un serbatoio collegato, sottrai l'importo
        if ($this->serbatoio_id && $this->serbatoio) {
            $this->serbatoio->subtractCocchi(
                $this->amount,
                'expense',
                "Pagamento: {$this->title} (#{$this->invoice_number})",
                null,
                $this->paid_by
            );
        }

        return $this;
    }

    /**
     * Metodo: Annulla
     */
    public function cancel()
    {
        $this->status = 'cancelled';
        $this->save();

        return $this;
    }
}
