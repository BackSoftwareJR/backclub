# Implementazione Backend - Sistema Rinnovi e Note Operative

## ✅ Modifiche Completate

### 1. Modelli (Models)

#### `PriceListItem.php`
- ✅ Aggiunto `operational_notes` a `$fillable`
- ✅ Aggiunto `renewal_type` a `$fillable`
- ✅ Aggiunti metodi helper:
  - `hasRenewals()`: Verifica se ha rinnovi configurati
  - `hasObligatoryRenewal()`: Verifica se ha rinnovo obbligatorio
  - `hasMultiRenewal()`: Verifica se ha multi-rinnovo
  - `getActiveRenewalOptions()`: Ottiene solo le opzioni attive

#### `QuoteItem.php`
- ✅ Aggiunto `renewal_options` a `$fillable`
- ✅ Aggiunto `renewal_options` a `$casts` come array

### 2. Controller

#### `PriceListController.php`
- ✅ Aggiunta validazione per `operational_notes` (nullable|string)
- ✅ Aggiunta validazione per `renewal_type` (nullable|in:obbligatorio,facoltativo,multi)
- ✅ Validazione in entrambi i metodi `store()` e `update()`

#### `QuoteController.php`
- ✅ Aggiunta validazione per `items.*.renewal_options` (nullable|array) in `store()`
- ✅ Aggiunta validazione per `items.*.renewal_options` (nullable|array) in `update()`
- ✅ Logica di salvataggio rinnovi:
  - Se `renewal_options` (array) è presente → salva in `renewal_options`, `renewal_option` = null
  - Se `renewal_option` (singolo) è presente → salva in `renewal_option`, `renewal_options` = null
  - Altrimenti entrambi = null
- ✅ Aggiornato metodo `show()` per decodificare `renewal_options` se stringa

### 3. View PDF

#### `resources/views/quotes/pdf.blade.php`
- ✅ Aggiunta visualizzazione **Note Operative** dal listino (campo `operational_notes`)
- ✅ Distinzione tra "Note Operative" (dal listino) e "Note Aggiuntive" (sulla voce)
- ✅ Sezione Rinnovi completamente riscritta:
  - Supporta `renewal_option` (singolo)
  - Supporta `renewal_options` (array per multi-rinnovo)
  - Mostra label "Multi-Rinnovo" quando applicabile
  - Calcola e mostra **Totale Rinnovi Annuali**
  - Gestisce correttamente durate (mensile, trimestrale, semestrale, annuale, personalizzata)
  - Mostra "Include" per ogni opzione

---

## 📋 Logica di Salvataggio Rinnovi

### Nel Database

**Tabella `quote_items`:**
- `renewal_option` (LONGTEXT, JSON): Rinnovo singolo (obbligatorio/facoltativo)
- `renewal_options` (LONGTEXT, JSON): Array di rinnovi (multi-rinnovo)

### Regole di Salvataggio

```php
// Se renewal_options (array) è presente e non vuoto
if (isset($itemData['renewal_options']) && is_array($itemData['renewal_options']) && count($itemData['renewal_options']) > 0) {
    $itemToCreate['renewal_options'] = json_encode($itemData['renewal_options']);
    $itemToCreate['renewal_option'] = null; // Non usare renewal_option per multi-rinnovo
}
// Se renewal_option (singolo) è presente
elseif (isset($itemData['renewal_option']) && $itemData['renewal_option'] !== null) {
    $itemToCreate['renewal_option'] = json_encode($itemData['renewal_option']);
    $itemToCreate['renewal_options'] = null;
}
// Nessun rinnovo
else {
    $itemToCreate['renewal_option'] = null;
    $itemToCreate['renewal_options'] = null;
}
```

---

## 🔍 Esempi di Dati

### Rinnovo Singolo (Obbligatorio/Facoltativo)

**Input Frontend:**
```json
{
  "renewal_option": {
    "id": "1767528702617",
    "duration": "monthly",
    "price": 260,
    "description": "Rinnovo con gestione",
    "includes": ["Manutenzione server", "Backup Giornaliero"]
  }
}
```

**Salvato nel DB:**
- `renewal_option`: `{"id":"1767528702617","duration":"monthly","price":260,...}`
- `renewal_options`: `NULL`

### Multi-Rinnovo

**Input Frontend:**
```json
{
  "renewal_options": [
    {
      "id": "1767528702617",
      "duration": "monthly",
      "price": 260,
      "description": "Rinnovo con gestione",
      "includes": ["Manutenzione server", "Backup Giornaliero"]
    },
    {
      "id": "1767528901968",
      "duration": "monthly",
      "price": 80,
      "description": "Rinnovo base",
      "includes": ["Manutenzione base"]
    }
  ]
}
```

**Salvato nel DB:**
- `renewal_option`: `NULL`
- `renewal_options`: `[{"id":"1767528702617",...},{"id":"1767528901968",...}]`

---

## 📄 PDF - Sezione Rinnovi

### Visualizzazione

1. **Rinnovo Singolo:**
   - Mostra servizio, descrizione, durata, prezzo
   - Include lista "Include"

2. **Multi-Rinnovo:**
   - Mostra servizio con label "Multi-Rinnovo: Il cliente può scegliere quale opzione attivare di mese in mese"
   - Elenca tutte le opzioni con indentazione
   - Ogni opzione mostra descrizione, durata, prezzo, include

3. **Totale Rinnovi:**
   - Calcola somma di tutti i rinnovi (singoli + multi)
   - Mostra in riga evidenziata: "Totale Rinnovi Annuali"

---

## ✅ Checklist Implementazione

### Backend
- [x] Modello `PriceListItem`: aggiunto `operational_notes` e `renewal_type`
- [x] Modello `QuoteItem`: aggiunto `renewal_options`
- [x] `PriceListController`: validazione nuovi campi
- [x] `QuoteController`: validazione e logica salvataggio `renewal_options`
- [x] `QuoteController::show()`: decodifica `renewal_options`
- [x] View PDF: note operative
- [x] View PDF: sezione rinnovi migliorata
- [x] Metodi helper `PriceListItem` per gestione rinnovi

### Test Consigliati

1. **Creazione Prodotto con Note Operative:**
   ```bash
   POST /api/price-list
   {
     "name": "Test",
     "operational_notes": "Queste sono note operative",
     ...
   }
   ```

2. **Creazione Prodotto con Rinnovo Obbligatorio:**
   ```bash
   POST /api/price-list
   {
     "name": "Test",
     "renewal_type": "obbligatorio",
     "renewal_options": [...]
   }
   ```

3. **Creazione Preventivo con Multi-Rinnovo:**
   ```bash
   POST /api/quotes
   {
     "items": [{
       "renewal_options": [
         {"id": "1", "price": 100, ...},
         {"id": "2", "price": 200, ...}
       ]
     }]
   }
   ```

4. **Verifica PDF:**
   - Generare PDF preventivo
   - Verificare note operative
   - Verificare sezione rinnovi
   - Verificare totale rinnovi

---

## 🚀 Prossimi Passi (Frontend)

1. Aggiornare `types/sellers.ts` con nuovi campi
2. Modificare `PriceListItemFormPage.tsx`:
   - Aggiungere campo "Note Operative"
   - Aggiungere select per `renewal_type`
3. Modificare `QuoteStep2Configuration.tsx`:
   - Logica per rinnovo obbligatorio (auto-selezione)
   - Logica per multi-rinnovo (checkbox multiple)
4. Modificare `QuoteStep7Summary.tsx`:
   - Calcolo totale rinnovi
   - Visualizzazione rinnovi
   - Sezione spiegazione rinnovi
5. Modificare `QuoteStep8Finalize.tsx`:
   - Inviare `renewal_options` se multi-rinnovo

---

**Data Implementazione**: 2024
**Versione**: 1.0
**Status**: ✅ Backend Completato

