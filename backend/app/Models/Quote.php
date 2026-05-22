<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Quote extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_number',
        'client_id',
        'seller_id',
        'crm_department_id',
        'status',
        'title',
        'description',
        'subtotal',
        'discount_percentage',
        'discount_amount',
        'tax_percentage',
        'tax_amount',
        'total_amount',
        'notes',
        'valid_until',
        'pdf_path',
        'created_by',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_percentage' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'valid_until' => 'date',
    ];

    /**
     * Boot del model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($quote) {
            // Genera numero solo se non è già stato impostato
            // Questo permette al controller di impostarlo esplicitamente per evitare race conditions
            if (!$quote->quote_number) {
                $quote->quote_number = self::generateQuoteNumber();
            }
        });
    }

    /**
     * Genera numero preventivo univoco
     * Gestisce race conditions con lock pessimistico e retry
     */
    public static function generateQuoteNumber(): string
    {
        $year = date('Y');
        $maxAttempts = 20;
        $attempt = 0;
        
        while ($attempt < $maxAttempts) {
            // Usa lock pessimistico per evitare race conditions
            // lockForUpdate() funziona anche dentro transazioni esistenti
            $lastQuote = \DB::table('quotes')
                ->where('quote_number', 'LIKE', "PRV-{$year}-%")
                ->orderByRaw('CAST(SUBSTRING(quote_number, -4) AS UNSIGNED) DESC')
                ->lockForUpdate()
                ->first();
            
            if ($lastQuote) {
                // Estrai il numero dall'ultimo preventivo
                $lastNumber = intval(substr($lastQuote->quote_number, -4));
                $number = $lastNumber + 1;
            } else {
                $number = 1;
            }
            
            $quoteNumber = 'PRV-' . $year . '-' . str_pad($number, 4, '0', STR_PAD_LEFT);
            
            // Verifica che il numero non esista già (doppio controllo)
            $exists = \DB::table('quotes')
                ->where('quote_number', $quoteNumber)
                ->exists();
            
            if (!$exists) {
                return $quoteNumber;
            }
            
            // Se esiste, incrementa e riprova
            $attempt++;
            
            // Piccola pausa per evitare loop infiniti in caso di problemi
            if ($attempt < $maxAttempts) {
                usleep(10000); // 10ms
            }
        }
        
        // Fallback: usa timestamp per garantire unicità assoluta
        $microtime = (int)(microtime(true) * 1000);
        $uniqueSuffix = substr($microtime, -4);
        return 'PRV-' . $year . '-' . $uniqueSuffix;
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
     * Relazione con CrmDepartment
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(CrmDepartment::class, 'crm_department_id');
    }

    /**
     * Relazione con User (creatore)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relazione con QuoteItems
     */
    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }

    /**
     * Relazione con Contract (se convertito)
     */
    public function contract(): HasOne
    {
        return $this->hasOne(Contract::class);
    }

    /**
     * Ricalcola i totali del preventivo
     */
    public function recalculateTotals(): void
    {
        $this->subtotal = $this->items()->sum('total');
        
        // Se il preventivo appartiene a un venditore, gli sconti devono essere 0 (solo admin può applicare sconti)
        if ($this->seller_id) {
            $this->discount_percentage = 0;
            $this->discount_amount = 0;
        } else {
            // Calcola sconto solo se non è un venditore
            if ($this->discount_percentage > 0) {
                $this->discount_amount = $this->subtotal * ($this->discount_percentage / 100);
            }
        }
        
        $subtotalAfterDiscount = $this->subtotal - $this->discount_amount;
        
        // Calcola IVA
        $this->tax_amount = $subtotalAfterDiscount * ($this->tax_percentage / 100);
        
        // Totale finale
        $this->total_amount = $subtotalAfterDiscount + $this->tax_amount;
        
        $this->save();
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
     * Scope per preventivi in scadenza
     */
    public function scopeExpiringSoon($query, $days = 7)
    {
        return $query->whereNotNull('valid_until')
                     ->whereDate('valid_until', '<=', now()->addDays($days))
                     ->whereDate('valid_until', '>=', now())
                     ->where('status', 'pending');
    }

    /**
     * Verifica se il preventivo è valido
     */
    public function isValid(): bool
    {
        if (!$this->valid_until) {
            return true;
        }
        return $this->valid_until->isFuture();
    }

    /**
     * Verifica se è stato convertito in contratto
     */
    public function isConverted(): bool
    {
        return $this->contract()->exists();
    }
}

