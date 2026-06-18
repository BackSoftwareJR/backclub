# Analisi Completa del Processo Preventivi
## URL: https://backclub.it/venditori/preventivi/nuovo

---

## 📋 Panoramica Generale

Il sistema di creazione preventivi è implementato come un **wizard multi-step** (8 passaggi) che guida l'utente attraverso la selezione di servizi, configurazione, informazioni cliente, e finalizzazione del preventivo.

---

## 🏗️ Architettura

### Frontend
- **Componente Principale**: `QuoteWizardPage.tsx`
- **Location**: `public_html/frontend/src/pages/Venditori/QuoteWizardPage.tsx`
- **Route**: `/venditori/preventivi/nuovo`
- **Layout**: Utilizza `VenditoriLayout` con sidebar dedicata

### Backend
- **Controller**: `QuoteController.php`
- **Location**: `public_html/backend/app/Http/Controllers/QuoteController.php`
- **API Endpoint**: `POST /api/quotes`
- **Model**: `Quote.php` e `QuoteItem.php`

---

## 🔄 Flusso Completo del Processo

### **STEP 1: Selezione Servizi** (`QuoteStep1Services.tsx`)

**Funzionalità:**
- Carica servizi dal listino prezzi (`price_list_items`)
- Ricerca in tempo reale per nome, descrizione o settore
- Filtro per dipartimento/settore
- Visualizzazione a griglia con card servizi
- Selezione multipla di servizi

**Dati Gestiti:**
- Lista servizi disponibili dal listino
- Servizi selezionati con quantità, prezzo unitario, totale
- Calcolo automatico del prezzo con margine applicato: `prezzo_base * (1 + margin_percentage / 100)`

**Validazione:**
- Almeno 1 servizio deve essere selezionato per procedere

**API Chiamate:**
- `GET /api/price-list` - Caricamento servizi disponibili

---

### **STEP 2: Configurazione** (`QuoteStep2Configuration.tsx`)

**Funzionalità:**
- Configurazione opzioni di pagamento per ogni servizio
- Selezione opzioni di rinnovo (opzionale)
- Selezione caratteristiche incluse (features)

**Opzioni di Pagamento Supportate:**
1. **tantum** - Pagamento unico
2. **installments** - Rate (con input per numero rate)
3. **split_30_40_30** - 30% all'ordine, 40% a metà, 30% alla fine
4. **30_60_days** - 30% all'ordine, 70% a 60 giorni
5. **custom** - Percentuali personalizzate

**Logica Rate:**
- Se `installments` è selezionato, mostra input per numero rate
- Minimo 2 rate, massimo `max_installments` del servizio (default 12)
- Calcolo automatico importo per rata: `totale_servizio / numero_rate`
- Ricalcolo automatico del `payment_schedule` quando cambia il numero di rate

**Validazione:**
- Ogni servizio deve avere un `payment_option` selezionato

**Dati Aggiornati:**
- `payment_option`: Oggetto con `type`, `installments` (se applicabile), `percentages` (se custom)
- `payment_schedule`: Array di date e importi calcolati automaticamente
- `selected_renewal`: Opzione di rinnovo selezionata (opzionale)
- `selected_features`: Array di caratteristiche selezionate (opzionale)

---

### **STEP 3: Articoli Aggiuntivi** (`QuoteStep3AdditionalItems.tsx`)

**Funzionalità:**
- Aggiunta di articoli/servizi personalizzati non presenti nel listino
- Input: descrizione, quantità, prezzo unitario
- Calcolo automatico del totale

**Validazione:**
- Step opzionale (si può saltare)

**Dati Gestiti:**
- `additionalItems`: Array di oggetti con `description`, `quantity`, `unit_price`, `total`

---

### **STEP 4: Servizi Consigliati** (`QuoteStep4Recommended.tsx`)

**Funzionalità:**
- Suggerisce servizi dello stesso settore dei servizi già selezionati
- Mostra max 6 servizi consigliati
- Permette di aggiungere servizi consigliati al preventivo

**Logica:**
- Filtra servizi per `crm_department_id` dei servizi selezionati
- Esclude servizi già selezionati
- Mostra solo servizi attivi

**Validazione:**
- Step opzionale

---

### **STEP 5: Info Cliente** (`QuoteStep5ClientInfo.tsx`)

**Funzionalità:**
- Due modalità: **Cliente Esistente** o **Nuovo Cliente**

**Cliente Esistente:**
- Ricerca in tempo reale (minimo 2 caratteri)
- Carica tutti i clienti quando il campo è vuoto
- Selezione da lista risultati
- Pre-compilazione automatica dei dati

**Nuovo Cliente:**
- Form con campi:
  - Ragione Sociale * (obbligatorio)
  - Email * (obbligatorio)
  - Telefono
  - Partita IVA
  - Indirizzo
  - Città
  - CAP
  - Paese (default: "Italia")

**Validazione:**
- `client_id` O `client_info.company_name` deve essere presente

**API Chiamate:**
- `GET /api/clients` - Ricerca clienti esistenti

**Logica Creazione Cliente:**
- Se non c'è `client_id` ma ci sono dati cliente, il cliente viene creato nello STEP 8 prima della creazione del preventivo

---

### **STEP 6: Venditore** (`QuoteStep6Seller.tsx`)

**Funzionalità:**
- Se l'utente è un venditore (`role === 'seller'` o `'venditori'`), il `seller_id` viene auto-impostato
- Se l'utente non è venditore, mostra lista venditori attivi per selezione

**Validazione:**
- `seller_id` deve essere presente

**API Chiamate:**
- `GET /api/sellers` - Caricamento lista venditori (solo se utente non è venditore)

---

### **STEP 7: Riepilogo** (`QuoteStep7Summary.tsx`)

**Funzionalità:**
- Visualizzazione completa del preventivo
- Modifica margini per servizio
- Modifica numero rate (se pagamento a rate)
- Timeline pagamenti e provvigioni
- Calcolo totali (subtotale, sconto, IVA, totale)
- Campi aggiuntivi: titolo, descrizione, note, validità

**Calcoli Eseguiti:**

1. **Subtotale Servizi:**
   ```
   sum(servizio.total * servizio.quantity) per tutti i servizi
   ```

2. **Subtotale Articoli Aggiuntivi:**
   ```
   sum(item.quantity * item.unit_price * (1 - item.discount / 100))
   ```

3. **Subtotale Totale:**
   ```
   subtotale_servizi + subtotale_articoli
   ```

4. **Sconto:**
   ```
   subtotale * (discount_percentage / 100)
   ```

5. **Totale dopo Sconto:**
   ```
   subtotale - sconto
   ```

6. **IVA:**
   ```
   totale_dopo_sconto * (tax_percentage / 100)
   ```

7. **Totale Finale:**
   ```
   totale_dopo_sconto + IVA
   ```

**Timeline Pagamenti:**
- Raccoglie tutti i `payment_schedule` da tutti i servizi
- Calcola provvigione per ogni pagamento: `importo * (commission_rate / 100)`
- Ordina per data
- Mostra timeline completa con date, importi, provvigioni

**Aggiustamento Margini:**
- Permette di aumentare liberamente il margine
- Permette di diminuire solo fino al margine base disponibile
- Ricalcola automaticamente prezzo e totali
- Ricalcola `payment_schedule` quando cambia il totale

**Modifica Numero Rate:**
- Se pagamento a rate, mostra input per modificare numero rate
- Ricalcola automaticamente importo per rata e `payment_schedule`

**Validazione:**
- Step di revisione (sempre valido)

---

### **STEP 8: Finalizzazione** (`QuoteStep8Finalize.tsx`)

**Funzionalità:**
- Creazione preventivo nel database
- Generazione PDF
- Invio email (TODO - non implementato)

**Processo di Creazione:**

1. **Preparazione Dati:**
   ```typescript
   // Converte selectedServices in quoteItems
   quoteItems = [
     ...selectedServices.map(service => ({
       price_list_item_id: service.price_list_item_id,
       description: service.price_list_item.name,
       quantity: service.quantity,
       unit_price: service.unit_price,
       discount: service.discount,
       total: service.total,
       payment_option: service.payment_option || null,
       renewal_option: service.selected_renewal || null,
       selected_features: service.selected_features || null,
       notes: service.price_list_item.description || null,
     })),
     ...additionalItems.map(item => ({
       description: item.description,
       quantity: item.quantity,
       unit_price: item.unit_price,
       discount: 0,
       total: item.quantity * item.unit_price,
     }))
   ]
   ```

2. **Creazione Cliente (se necessario):**
   - Se non c'è `client_id` ma ci sono dati cliente, crea nuovo cliente
   - API: `POST /api/clients`

3. **Creazione Preventivo:**
   - API: `POST /api/quotes`
   - Payload:
     ```json
     {
       "client_id": number,
       "seller_id": number,
       "title": string,
       "description": string,
       "notes": string,
       "discount_percentage": number,
       "discount_amount": number,
       "tax_percentage": number,
       "tax_amount": number,
       "subtotal": number,
       "total_amount": number,
       "valid_until": string (YYYY-MM-DD),
       "items": array
     }
     ```

4. **Generazione PDF:**
   - API: `GET /api/quotes/{id}/pdf`
   - Backend genera PDF usando DomPDF
   - View: `resources/views/quotes/pdf.blade.php`
   - Download automatico del file

**Validazione:**
- Cliente deve essere presente
- Almeno 1 item deve essere presente

**API Chiamate:**
- `POST /api/quotes` - Creazione preventivo
- `POST /api/clients` - Creazione cliente (se necessario)
- `GET /api/quotes/{id}/pdf` - Generazione PDF

---

## 🗄️ Struttura Database

### Tabella `quotes`
```sql
- id (PK)
- quote_number (auto-generato: PRV-YYYY-####)
- client_id (FK)
- seller_id (FK, nullable)
- crm_department_id (FK, nullable)
- title
- description
- status (pending|approved|rejected|started|completed|contract_requested)
- subtotal
- discount_percentage
- discount_amount
- tax_percentage
- tax_amount
- total_amount
- notes
- valid_until (date)
- pdf_path
- created_by (FK users)
- created_at
- updated_at
```

### Tabella `quote_items`
```sql
- id (PK)
- quote_id (FK)
- price_list_item_id (FK, nullable)
- description
- quantity
- unit_price
- discount
- total (calcolato automaticamente)
- payment_option (JSON)
- renewal_option (JSON)
- selected_features (JSON)
- notes
- created_at
- updated_at
```

**Campi JSON:**
- `payment_option`: `{ type, installments?, percentages?, days?, label }`
- `renewal_option`: `{ id, duration, duration_months, price }`
- `selected_features`: `string[]`

---

## 🔌 API Endpoints Utilizzati

### Frontend → Backend

1. **GET /api/price-list**
   - Carica servizi dal listino
   - Query params: `per_page`, `department_id`, `is_active`

2. **GET /api/clients**
   - Ricerca clienti
   - Query params: `search`, `active_only`

3. **POST /api/clients**
   - Crea nuovo cliente
   - Body: `{ company_name, email, phone, vat_number, address, is_active }`

4. **GET /api/sellers**
   - Carica lista venditori
   - Query params: `is_active`

5. **POST /api/quotes**
   - Crea preventivo
   - Body: vedi sopra

6. **GET /api/quotes/{id}/pdf**
   - Genera PDF preventivo
   - Response: Blob PDF

---

## 🔄 Flussi di Navigazione

### Accesso al Wizard

1. **Da Lista Preventivi:**
   - Route: `/venditori/preventivi`
   - Click su "Nuovo Preventivo"
   - Naviga a `/venditori/preventivi/nuovo`

2. **Da Lead:**
   - Route: `/venditori/leads/:id`
   - Click su "Crea Preventivo"
   - Naviga con `state: { fromLead: true, quoteData: {...} }`
   - Dati cliente pre-compilati

3. **Da Progetto:**
   - Route: `/progetti/:id`
   - Click su "Crea Preventivo"
   - Naviga con `state: { fromProject: true, projectId: id, quoteData: {...} }`
   - Dati cliente e progetto pre-compilati

4. **Da Context Menu:**
   - Menu contestuale globale
   - Azione: "Nuovo Preventivo"

### Dati Pre-compilati

Il wizard supporta dati iniziali da:
- **Lead**: `client_info`, `seller_id`, `title`, `description`, `notes`
- **Progetto**: `client_id`, `client_info`, `seller_id`, `title`, `description`, `notes`, `projectId`

---

## ✅ Validazioni e Controlli

### Validazioni Frontend (per step)

1. **Step 1**: Almeno 1 servizio selezionato
2. **Step 2**: Ogni servizio deve avere `payment_option`
3. **Step 3**: Opzionale
4. **Step 4**: Opzionale
5. **Step 5**: `client_id` O `client_info.company_name` presente
6. **Step 6**: `seller_id` presente
7. **Step 7**: Opzionale (revisione)
8. **Step 8**: Cliente presente, almeno 1 item

### Validazioni Backend

```php
- client_id: required|exists:clients,id
- seller_id: nullable|exists:sellers,id
- title: required|string|max:255
- items: required|array|min:1
- items.*.description: required|string
- items.*.quantity: required|numeric|min:0.01
- items.*.unit_price: required|numeric|min:0
- items.*.payment_option: nullable|array
- items.*.renewal_option: nullable|array
- items.*.selected_features: nullable|array
```

---

## 🎨 UI/UX

### Design
- **Stile**: Apple-like, minimal, pulito
- **Colori**: Usati con parsimonia, principalmente per dettagli
- **Layout**: Wizard con progress bar in alto
- **Navigazione**: 
  - Freccia indietro per ogni step
  - Pulsanti "Avanti" / "Indietro" in fondo
  - Click su step completati per tornare indietro

### Progress Indicator
- 8 step visualizzati come cerchi numerati
- Step completati: checkmark verde
- Step corrente: evidenziato
- Step non accessibili: disabilitati

### Responsive
- Layout adattivo per mobile/tablet/desktop
- Card servizi responsive
- Form ottimizzati per touch

---

## 🔧 Funzionalità Avanzate

### Calcolo Automatico Totali

Il backend ricalcola automaticamente i totali tramite **Model Events**:

```php
// QuoteItem model
protected static function boot() {
    static::saving(function ($item) {
        $item->total = ($item->unit_price * $item->quantity) * (1 - ($item->discount / 100));
    });
}

// Quote model
protected static function boot() {
    static::saved(function ($quote) {
        $quote->recalculateTotals();
    });
}
```

### Generazione Numero Preventivo

Formato: `PRV-YYYY-####`
- `PRV`: Prefisso fisso
- `YYYY`: Anno corrente
- `####`: Numero sequenziale (4 cifre, zero-padded)

Esempio: `PRV-2024-0001`

### Payment Schedule

Calcolato automaticamente in base a:
- Tipo pagamento selezionato
- Numero rate (se installments)
- Totale servizio
- Data inizio (oggi)

Supporta:
- Pagamento unico
- Rate mensili
- Split percentuali (30-40-30, 30-60 giorni, custom)
- Date personalizzate

### Provvigioni

Calcolate su ogni singolo pagamento:
```
provvigione = importo_pagamento * (commission_rate / 100)
```

Provvigione totale = somma di tutte le provvigioni su tutti i pagamenti

---

## 🐛 Note Tecniche

### Gestione Payment Option

- Il backend può ricevere `type: 'rate'` ma viene normalizzato a `'installments'`
- Il frontend gestisce entrambi i formati per compatibilità
- `installments` deve essere sempre >= 2 se presente

### Gestione JSON Fields

- `payment_option`, `renewal_option`, `selected_features` sono salvati come JSON nel database
- Laravel li decodifica automaticamente tramite `$casts`
- Se stringa, viene decodificata manualmente nel controller

### Creazione Cliente

- Se il cliente non esiste, viene creato nello STEP 8 prima della creazione preventivo
- Se la creazione fallisce, viene mostrato errore e il processo si interrompe

### PDF Generation

- Usa DomPDF (`Barryvdh\DomPDF\Facade\Pdf`)
- Se DomPDF non disponibile, fallback a view HTML
- PDF salvato in `storage/app/public/quotes/`
- Path salvato in `quotes.pdf_path`

---

## 📊 Dati Trasmessi

### QuoteWizardData (Frontend State)

```typescript
{
  selectedServices: SelectedService[],
  additionalItems: AdditionalItem[],
  client_id?: number,
  client_info: ClientInfo,
  seller_id?: number,
  title: string,
  description?: string,
  notes?: string,
  discount_percentage: number,
  tax_percentage: number,
  valid_until?: string
}
```

### QuoteFormData (API Request)

```typescript
{
  client_id: number,
  seller_id?: number,
  title: string,
  description?: string,
  notes?: string,
  discount_percentage: number,
  discount_amount: number,
  tax_percentage: number,
  tax_amount: number,
  subtotal: number,
  total_amount: number,
  valid_until?: string,
  items: QuoteItemData[]
}
```

---

## 🚀 Possibili Miglioramenti

1. **Invio Email**: Implementare API per invio email preventivo
2. **Salvataggio Bozza**: Salvare preventivo come bozza prima della finalizzazione
3. **Template Preventivi**: Supporto per template personalizzati
4. **Storico Modifiche**: Tracciare modifiche al preventivo
5. **Approvazione Workflow**: Sistema di approvazione multi-livello
6. **Export Excel**: Export preventivo in formato Excel
7. **Firma Digitale**: Integrazione firma digitale preventivo
8. **Notifiche**: Notifiche quando preventivo scade o viene approvato

---

## 📝 File Chiave

### Frontend
- `QuoteWizardPage.tsx` - Componente principale wizard
- `QuoteWizard/QuoteStep1Services.tsx` - Step 1
- `QuoteWizard/QuoteStep2Configuration.tsx` - Step 2
- `QuoteWizard/QuoteStep3AdditionalItems.tsx` - Step 3
- `QuoteWizard/QuoteStep4Recommended.tsx` - Step 4
- `QuoteWizard/QuoteStep5ClientInfo.tsx` - Step 5
- `QuoteWizard/QuoteStep6Seller.tsx` - Step 6
- `QuoteWizard/QuoteStep7Summary.tsx` - Step 7
- `QuoteWizard/QuoteStep8Finalize.tsx` - Step 8
- `types/quotes.ts` - TypeScript types
- `api/quotes.ts` - API client

### Backend
- `QuoteController.php` - Controller principale
- `Quote.php` - Model preventivo
- `QuoteItem.php` - Model voce preventivo
- `routes/api.php` - Route API
- `resources/views/quotes/pdf.blade.php` - Template PDF

---

## ✅ Checklist Processo

- [x] Step 1: Selezione servizi
- [x] Step 2: Configurazione pagamento/rinnovo/features
- [x] Step 3: Articoli aggiuntivi
- [x] Step 4: Servizi consigliati
- [x] Step 5: Info cliente (esistente/nuovo)
- [x] Step 6: Venditore
- [x] Step 7: Riepilogo e calcoli
- [x] Step 8: Creazione preventivo
- [x] Generazione PDF
- [ ] Invio email (TODO)
- [x] Navigazione da lead/progetto
- [x] Validazioni frontend/backend
- [x] Calcolo automatico totali
- [x] Payment schedule
- [x] Provvigioni

---

**Data Analisi**: 2024
**Versione Sistema**: 1.0

