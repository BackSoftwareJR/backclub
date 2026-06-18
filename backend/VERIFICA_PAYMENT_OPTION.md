# Verifica e Fix per payment_option

## Problema
Il `payment_option` non viene salvato nel database quando si crea un preventivo.

## Soluzione

### 1. Verifica che il campo esista nel database

Esegui questa query per verificare se il campo `payment_option` esiste:

```sql
SHOW COLUMNS FROM `quote_items` LIKE 'payment_option';
```

Se non esiste, esegui:

```sql
ALTER TABLE `quote_items`
ADD COLUMN `payment_option` LONGTEXT DEFAULT NULL
COMMENT 'JSON: opzione di pagamento selezionata per questo item (type, label, installments, etc.)'
AFTER `total`,
ADD COLUMN `notes` TEXT DEFAULT NULL
COMMENT 'Note aggiuntive per questo item'
AFTER `payment_option`;
```

### 2. Verifica i dati salvati

Dopo aver creato un preventivo, verifica che il `payment_option` sia stato salvato:

```sql
SELECT 
    id, 
    description, 
    payment_option,
    notes
FROM `quote_items` 
WHERE quote_id = [ID_DEL_PREVENTIVO]
ORDER BY id DESC 
LIMIT 5;
```

### 3. Debug Frontend

Apri la console del browser (F12) e verifica i log quando crei un preventivo. Dovresti vedere:
- `QuoteStep8Finalize - Preparazione item:` con il `payment_option` presente

### 4. Debug Backend

Controlla i log Laravel (`storage/logs/laravel.log`) per vedere:
- `QuoteController::store - Creazione item` con i dettagli del `payment_option`

### 5. Struttura attesa del payment_option

Il `payment_option` dovrebbe essere un oggetto JSON con questa struttura:

```json
{
  "type": "installments",
  "label": "Pagamento Rateale",
  "installments": 6
}
```

Oppure per 30/40/30:
```json
{
  "type": "split_30_40_30",
  "label": "Pagamento 30/40/30"
}
```

Oppure per 30/60 giorni:
```json
{
  "type": "30_60_days",
  "label": "Pagamento 30/60 giorni"
}
```

### 6. Se il campo esiste ma non salva

Verifica che:
1. Il model `QuoteItem` abbia `payment_option` in `$fillable`
2. Il controller accetti `payment_option` nelle regole di validazione (già fatto)
3. Il frontend invii correttamente il `payment_option` (già fatto con debug)

