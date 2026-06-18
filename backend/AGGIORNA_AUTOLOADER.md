# Aggiornamento Autoloader per QuoteItem

## Problema
L'errore `Class "App\Models\QuoteItem" not found` indica che l'autoloader di Composer non riconosce la classe `QuoteItem`.

## Soluzione

### Opzione 1: Eseguire composer dump-autoload (CONSIGLIATO)
Se hai accesso SSH al server, esegui:

```bash
cd /home/u589701076/domains/backclub.it/public_html/backend
composer dump-autoload
```

### Opzione 2: Verificare che il file esista
Assicurati che il file esista sul server in:
```
/home/u589701076/domains/backclub.it/public_html/backend/app/Models/QuoteItem.php
```

### Opzione 3: Caricare manualmente il file
Se non hai accesso SSH, carica il file `app/Models/QuoteItem.php` sul server tramite FTP/SFTP.

Il file deve contenere:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_id',
        'price_list_item_id',
        'description',
        'quantity',
        'unit_price',
        'discount',
        'total',
        'payment_option',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'payment_option' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            $item->calculateTotal();
        });

        static::saved(function ($item) {
            $item->quote->recalculateTotals();
        });

        static::deleted(function ($item) {
            $item->quote->recalculateTotals();
        });
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function priceListItem(): BelongsTo
    {
        return $this->belongsTo(PriceListItem::class);
    }

    public function calculateTotal(): void
    {
        $subtotal = $this->quantity * $this->unit_price;
        $discountAmount = $subtotal * ($this->discount / 100);
        $this->total = $subtotal - $discountAmount;
    }
}
```

### Opzione 4: Usare il pannello di controllo del hosting
Se il tuo hosting ha un pannello di controllo con interfaccia Composer, esegui `composer dump-autoload` da lì.

## Verifica
Dopo aver eseguito `composer dump-autoload`, prova a creare un nuovo preventivo. L'errore dovrebbe scomparire.

