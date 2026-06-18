# Analisi Completa Sistema Venditori - backclub.it/venditori

**Data Analisi:** 2026-01-XX  
**Versione Sistema:** 1.0  
**URL Base:** https://backclub.it/venditori

---

## 📋 Indice

1. [Panoramica Generale](#panoramica-generale)
2. [Architettura Frontend](#architettura-frontend)
3. [Pagine e Funzionalità](#pagine-e-funzionalità)
4. [Backend e API](#backend-e-api)
5. [Database Schema](#database-schema)
6. [Flussi di Lavoro Principali](#flussi-di-lavoro-principali)
7. [Integrazioni](#integrazioni)
8. [Design e UX](#design-e-ux)

---

## 🎯 Panoramica Generale

Il sistema gestionale venditori è un modulo completo per la gestione del ciclo di vendita, dalla gestione dei contatti (leads) fino alla creazione di contratti e progetti. Il sistema è integrato con il CRM principale e gestisce:

- **Venditori**: Anagrafica, contratti, territori, settori
- **Preventivi**: Creazione, gestione, approvazione, conversione in contratti
- **Contratti**: Gestione documenti, firme, avvio progetti
- **Leads**: Contatti da chiamare, importazione CSV, assegnazione venditori
- **Clienti**: Visualizzazione clienti portati dai venditori
- **Listini**: Configurazione prodotti/servizi con prezzi e opzioni di pagamento
- **Progetti**: Integrazione con sistema progetti CRM

---

## 🏗️ Architettura Frontend

### Struttura File

```
frontend/src/
├── pages/Venditori/
│   ├── VenditoriLayout.tsx          # Layout principale con sidebar
│   ├── OverviewPage.tsx             # Dashboard con statistiche
│   ├── AmministrazioneVenditoriPage.tsx
│   ├── VenditoreFormPage.tsx
│   ├── ConfigurazioneListiniPage.tsx
│   ├── PriceListItemFormPage.tsx
│   ├── PriceListItemDetailPage.tsx
│   ├── PreventiviPage.tsx
│   ├── QuoteWizardPage.tsx          # Wizard 8 step per creazione preventivi
│   ├── QuoteDetailPage.tsx
│   ├── QuoteEditPage.tsx
│   ├── ContrattiPage.tsx
│   ├── ContractDetailPage.tsx
│   ├── LeadsPage.tsx
│   ├── LeadDetailPage.tsx
│   ├── ClientiVenditoriPage.tsx
│   ├── ClienteVenditoriDetailPage.tsx
│   ├── ProgettiVenditoriPage.tsx    # Redirect a GestioneProgettiPage
│   └── QuoteWizard/                  # Step del wizard preventivi
│       ├── QuoteStep1Services.tsx
│       ├── QuoteStep2Configuration.tsx
│       ├── QuoteStep3AdditionalItems.tsx
│       ├── QuoteStep4Recommended.tsx
│       ├── QuoteStep5ClientInfo.tsx
│       ├── QuoteStep6Seller.tsx
│       ├── QuoteStep7Summary.tsx
│       └── QuoteStep8Finalize.tsx
├── api/
│   ├── sellers.ts                    # API venditori
│   ├── quotes.ts                     # API preventivi
│   ├── contracts.ts                  # API contratti
│   ├── leads.ts                      # API leads
│   └── priceList.ts                  # API listino prezzi
└── types/
    └── sellers.ts                     # TypeScript types
```

### Routing

Il routing è configurato in `App.tsx`:

```typescript
/venditori                          → OverviewPage (default)
/venditori/overview                 → OverviewPage
/venditori/amministrazione-venditori → AmministrazioneVenditoriPage
/venditori/amministrazione-venditori/nuovo → VenditoreFormPage
/venditori/amministrazione-venditori/:id → VenditoreFormPage
/venditori/configurazione-listini  → ConfigurazioneListiniPage
/venditori/configurazione-listini/nuovo → PriceListItemFormPage
/venditori/configurazione-listini/:id → PriceListItemDetailPage
/venditori/configurazione-listini/:id/edit → PriceListItemFormPage
/venditori/preventivi              → PreventiviPage
/venditori/preventivi/nuovo         → QuoteWizardPage
/venditori/preventivi/:id          → QuoteDetailPage
/venditori/preventivi/:id/edit     → QuoteEditPage
/venditori/contratti               → ContrattiPage
/venditori/contratti/:id           → ContractDetailPage
/venditori/clienti                 → ClientiVenditoriPage
/venditori/clienti/:id             → ClienteVenditoriDetailPage
/venditori/progetti                 → ProgettiVenditoriPage (redirect)
/venditori/leads                   → LeadsPage
/venditori/leads/:id               → LeadDetailPage
```

---

## 📄 Pagine e Funzionalità

### 1. OverviewPage - Dashboard

**Path:** `/venditori/overview`

**Funzionalità:**
- **KPI Cards**: Fatturato totale, Contratti attivi, Preventivi pending, Venditori attivi
- **Grafici**:
  - Andamento vendite (line chart) con filtri periodo (7/30/90/365 giorni)
  - Distribuzione per settore (pie chart)
- **Attività Recenti**: Timeline delle ultime attività (preventivi, contratti, leads)

**API Endpoint:**
- `GET /api/sellers/overview/stats?period=30`

**Componenti Chiave:**
- Recharts per visualizzazioni
- Statistiche con variazioni percentuali
- Filtri periodo dinamici

---

### 2. AmministrazioneVenditoriPage

**Path:** `/venditori/amministrazione-venditori`

**Funzionalità:**
- Lista venditori con ricerca
- Visualizzazione:
  - Dati venditore (nome, email, telefono)
  - Territorio (province/regioni)
  - Stato contratto (scadenza, validità)
  - Provvigione
  - Statistiche (clienti, preventivi, contratti)
  - Stato attivo/inattivo
- Azioni:
  - Crea nuovo venditore
  - Modifica venditore
  - Elimina venditore
  - Visualizza contratto

**API Endpoints:**
- `GET /api/sellers?with_stats=true`
- `DELETE /api/sellers/{id}`

**Filtri:**
- Ricerca per nome, email, territorio

---

### 3. VenditoreFormPage

**Path:** `/venditori/amministrazione-venditori/nuovo` o `/:id`

**Funzionalità:**
- Form creazione/modifica venditore
- Campi:
  - Dati utente (nome, email, password, telefono)
  - Contratto (date inizio/fine, upload file)
  - Territorio (array province/regioni)
  - Provvigione (%)
  - Settori assegnati (multi-select con CRM departments)
  - Stato attivo/inattivo

**API Endpoints:**
- `POST /api/sellers`
- `PUT /api/sellers/{id}`
- `POST /api/sellers/{id}/contract` (upload)
- `PUT /api/sellers/{id}/departments`
- `PUT /api/sellers/{id}/territory`

---

### 4. ConfigurazioneListiniPage

**Path:** `/venditori/configurazione-listini`

**Funzionalità:**
- Lista prodotti/servizi del listino
- Filtri:
  - Ricerca per nome/descrizione
  - Filtro per settore (CRM department)
  - Filtro stato (attivo/inattivo)
- Visualizzazione:
  - Nome prodotto/servizio
  - Settore
  - Prezzo base
  - Tipo prezzo (fisso/variabile/personalizzato)
  - Landing page URL
  - Stato
- Azioni:
  - Crea nuovo prodotto
  - Visualizza dettagli
  - Modifica
  - Elimina

**API Endpoints:**
- `GET /api/price-list`
- `GET /api/price-list/department/{id}`

---

### 5. PriceListItemFormPage / PriceListItemDetailPage

**Path:** `/venditori/configurazione-listini/nuovo` o `/:id` o `/:id/edit`

**Funzionalità:**
- Form creazione/modifica prodotto/servizio
- Campi principali:
  - Nome, descrizione
  - Settore (CRM department)
  - Prezzo base
  - Tipo prezzo
  - Opzioni di pagamento (JSON)
  - Opzioni di rinnovo (JSON)
  - Note operative (JSON)
  - Landing page URL
  - Visibilità clienti
  - Stato attivo

**Dettaglio:**
- Visualizzazione completa con tutte le opzioni
- Storico modifiche
- Statistiche utilizzo

---

### 6. PreventiviPage

**Path:** `/venditori/preventivi`

**Funzionalità:**
- Lista preventivi con filtri
- Filtri:
  - Ricerca (numero, titolo, cliente, venditore)
  - Stato (pending, approved, rejected, contract_requested, started, completed)
- Visualizzazione:
  - Numero preventivo
  - Titolo
  - Cliente
  - Venditore
  - Totale
  - Stato (badge colorato)
  - Data creazione
- Azioni:
  - Visualizza dettaglio
  - Richiedi contratto (se approvato)
  - Rifiuta preventivo
  - Elimina preventivo (con conferma se ha contratto)

**API Endpoints:**
- `GET /api/quotes?status=pending&per_page=50`
- `POST /api/quotes/{id}/request-contract`
- `POST /api/quotes/{id}/reject`
- `DELETE /api/quotes/{id}` (con opzione force_delete_with_contract)

**Stati Preventivo:**
- `pending`: In attesa
- `approved`: Approvato
- `rejected`: Rifiutato
- `contract_requested`: Contratto richiesto
- `started`: Avviato
- `completed`: Completato

---

### 7. QuoteWizardPage - Wizard Preventivi

**Path:** `/venditori/preventivi/nuovo`

**Funzionalità:**
Wizard a 8 step per creazione preventivo completo:

**Step 1 - Servizi:**
- Selezione servizi dal listino
- Filtro per settore
- Aggiunta multipla servizi

**Step 2 - Configurazione:**
- Configurazione opzioni di pagamento per ogni servizio
- Selezione rinnovi (obbligatori/facoltativi/multi)
- Configurazione features selezionate
- Note per ogni servizio

**Step 3 - Voci Aggiuntive:**
- Aggiunta voci personalizzate (descrizione, quantità, prezzo unitario)

**Step 4 - Consigliati:**
- Suggerimenti servizi aggiuntivi basati su selezione

**Step 5 - Info Cliente:**
- Selezione cliente esistente o creazione nuovo
- Dati cliente (ragione sociale, email, telefono, P.IVA, indirizzo)

**Step 6 - Venditore:**
- Selezione venditore assegnato
- Auto-selezione se utente è venditore

**Step 7 - Riepilogo:**
- Riepilogo completo preventivo
- Calcolo totale con sconti e IVA
- Validità preventivo (default 30 giorni)

**Step 8 - Finalizzazione:**
- Salvataggio preventivo
- Generazione PDF opzionale
- Navigazione a dettaglio

**Validazione Step:**
- Step 1: Almeno un servizio selezionato
- Step 2: Tutti i servizi devono avere payment_option configurato; rinnovi obbligatori selezionati
- Step 5: Cliente selezionato o dati cliente compilati
- Step 6: Venditore selezionato

**API Endpoints:**
- `POST /api/quotes` (creazione)
- `GET /api/quotes/{id}/pdf` (generazione PDF)

**Integrazione con Leads:**
- Supporto precompilazione dati da lead
- Navigazione da `LeadDetailPage` con dati precompilati

---

### 8. QuoteDetailPage

**Path:** `/venditori/preventivi/:id`

**Funzionalità:**
- Visualizzazione completa preventivo
- Dettagli:
  - Informazioni generali (numero, titolo, cliente, venditore)
  - Voci preventivo con configurazioni
  - Calcoli (subtotale, sconti, IVA, totale)
  - Note e condizioni
  - Validità
  - Stato e storico
- Azioni:
  - Genera/Scarica PDF
  - Modifica preventivo
  - Richiedi contratto
  - Rifiuta preventivo
  - Duplica preventivo
  - Elimina preventivo

**API Endpoints:**
- `GET /api/quotes/{id}`
- `GET /api/quotes/{id}/pdf`
- `POST /api/quotes/{id}/duplicate`
- `POST /api/quotes/{id}/request-contract`

---

### 9. ContrattiPage

**Path:** `/venditori/contratti`

**Funzionalità:**
- Lista contratti con filtri
- Filtri:
  - Ricerca (numero, titolo, cliente, venditore)
  - Stato (draft, requested, pending_signature, active, suspended, completed, terminated)
- Visualizzazione:
  - Vista lista o vista card
  - Numero contratto
  - Titolo
  - Cliente
  - Venditore
  - Valore totale
  - Stato
  - Progetto (se avviato)
  - Data inizio
- Azioni:
  - Visualizza dettaglio

**API Endpoints:**
- `GET /api/contracts?status=active&per_page=50`

**Stati Contratto:**
- `draft`: Bozza
- `requested`: Richiesta
- `pending_signature`: In attesa di firma
- `active`: Attivo
- `suspended`: Sospeso
- `completed`: Completato
- `terminated`: Terminato

---

### 10. ContractDetailPage

**Path:** `/venditori/contratti/:id`

**Funzionalità:**
Pagina dettaglio contratto molto completa:

**Sezioni Principali:**

1. **Header:**
   - Numero contratto, titolo
   - Stato con badge
   - Azioni rapide

2. **Informazioni Generali:**
   - Cliente, venditore, settore
   - Date (inizio, fine, firma)
   - Valore totale
   - Tipo contratto
   - Note

3. **Documenti:**
   - Upload contratto (con opzione revisione)
   - Upload contratto firmato
   - Lista revisioni
   - Download documenti

4. **Documenti Firmati Aggiuntivi:**
   - Privacy policy
   - Consenso trattamento dati
   - Altri documenti
   - Supporto upload file o URL esterno (es. Google Drive)

5. **Piano di Pagamento:**
   - Visualizzazione rate
   - Generazione piano da contratto
   - Link a gestione piani di pagamento

6. **Progetto:**
   - Collegamento a progetto CRM
   - Avvio progetto da contratto firmato
   - Visualizzazione stato progetto

7. **Preventivo Originale:**
   - Link al preventivo da cui è stato generato
   - Visualizzazione voci preventivo

**API Endpoints:**
- `GET /api/contracts/{id}`
- `POST /api/contracts/{id}/file` (upload contratto)
- `POST /api/contracts/{id}/signed` (upload firmato)
- `GET /api/contracts/{id}/revisions`
- `GET /api/contracts/{id}/signed-documents`
- `POST /api/contracts/{id}/signed-documents` (upload documento aggiuntivo)
- `POST /api/contracts/{id}/start-project` (avvia progetto)
- `POST /api/payment-plans/generate-from-contract/{contractId}`

**Workflow Contratto:**
1. Creazione contratto (draft o da preventivo)
2. Upload contratto → stato `pending_signature`
3. Upload contratto firmato → stato `active`
4. Upload documenti aggiuntivi (privacy, consenso)
5. Generazione piano di pagamento
6. Avvio progetto (se necessario)

---

### 11. LeadsPage - Contatti da Chiamare

**Path:** `/venditori/leads`

**Funzionalità:**
Gestione completa leads con 3 viste:

**Vista Tabella:**
- Lista completa leads con colonne:
  - Ragione sociale, tipologia, contatto
  - Telefoni (multi, con link tel:)
  - Email (multi, con link mailto:)
  - Sito web (link esterno)
  - Indirizzo
  - Fonte (badge colorato)
  - Venditore assegnato
  - Stato (new, contacted, qualified, proposal, negotiation, won, lost)
  - Priorità (low, medium, high, urgent)
- Filtri:
  - Ricerca (ragione sociale, contatto, descrizione, tipologia)
  - Stato
  - Fonte (website, referral, manual, csv_import, cold_call)
  - Venditore (tutti, non assegnati, specifico venditore)
  - Regione
- Azioni:
  - Crea preventivo (precompila dati)
  - Visualizza dettaglio
  - Elimina

**Vista Venditori:**
- Raggruppamento leads per venditore
- Card venditore con conteggio leads
- Sezione "Non Assegnati"
- Click su card → filtra vista tabella

**Vista Regioni:**
- Mappa Italia interattiva
- Click su regione → filtra vista tabella
- Visualizzazione conteggio per regione

**Importazione CSV:**
- Modal importazione CSV
- Mapping colonne
- Assegnazione regione e venditore

**API Endpoints:**
- `GET /api/leads?status=new&per_page=100`
- `POST /api/leads/import-csv`
- `GET /api/leads/{id}/prepare-quote` (prepara dati per preventivo)
- `DELETE /api/leads/{id}`

**Stati Lead:**
- `new`: Nuovo
- `contacted`: Contattato
- `qualified`: Qualificato
- `proposal`: Proposta
- `negotiation`: Negoziazione
- `won`: Vinto
- `lost`: Perso

**Fonti Lead:**
- `website`: Sito Web
- `referral`: Referral
- `manual`: Manuale
- `csv_import`: Importazione CSV
- `cold_call`: Cold Call

---

### 12. LeadDetailPage

**Path:** `/venditori/leads/:id`

**Funzionalità:**
- Dettaglio completo lead
- Sezioni:
  - **Header**: Ragione sociale, contatto, azioni rapide (chiama, email)
  - **Informazioni**: Dati azienda, indirizzo, regione, tipologia
  - **Contatti**: Telefoni multipli, email multiple, siti web
  - **Stato e Priorità**: Badge stato e priorità
  - **Venditore**: Assegnazione venditore
  - **Note**: Note editabili
  - **Timeline Attività**: Storico attività (chiamate, email, riunioni, note)
  - **Azioni**: Crea preventivo, converti in cliente, modifica, elimina

**API Endpoints:**
- `GET /api/leads/{id}`
- `PUT /api/leads/{id}`
- `POST /api/leads/{id}/activities`
- `GET /api/leads/{id}/activities`
- `POST /api/leads/{id}/convert` (converti in cliente)
- `PUT /api/leads/{id}/assign` (assegna venditore)

**Tipi Attività:**
- `note`: Nota
- `call`: Chiamata
- `email`: Email
- `meeting`: Riunione
- `status_change`: Cambio stato

---

### 13. ClientiVenditoriPage

**Path:** `/venditori/clienti`

**Funzionalità:**
- Lista clienti portati dai venditori
- Visualizzazione:
  - Cliente (ragione sociale, nome secondario)
  - Contatti (email, telefono)
  - Venditore assegnato
  - Statistiche (progetti, contratti, preventivi)
- Filtri:
  - Ricerca (nome, email, telefono, venditore)
  - Filtro per venditore
- Azioni:
  - Visualizza dettaglio cliente

**API Endpoints:**
- `GET /api/clients?seller_id={id}`

---

### 14. ClienteVenditoriDetailPage

**Path:** `/venditori/clienti/:id`

**Funzionalità:**
- Dettaglio cliente completo
- Informazioni:
  - Dati anagrafici
  - Contatti
  - Venditore assegnato
  - Progetti collegati
  - Contratti
  - Preventivi
  - Storico attività

---

### 15. ProgettiVenditoriPage

**Path:** `/venditori/progetti`

**Funzionalità:**
- Redirect a `GestioneProgettiPage`
- Mostra tutti i progetti avviati dai contratti
- Integrazione completa con sistema progetti CRM

---

## 🔧 Backend e API

### Controller Principali

#### SellerController

**File:** `backend/app/Http/Controllers/SellerController.php`

**Endpoints:**
- `GET /api/sellers/overview/stats` - Statistiche overview
- `GET /api/sellers` - Lista venditori
- `POST /api/sellers` - Crea venditore
- `GET /api/sellers/{id}` - Dettaglio venditore
- `PUT /api/sellers/{id}` - Aggiorna venditore
- `DELETE /api/sellers/{id}` - Elimina venditore
- `POST /api/sellers/{id}/contract` - Upload contratto
- `PUT /api/sellers/{id}/departments` - Aggiorna settori
- `PUT /api/sellers/{id}/territory` - Aggiorna territorio

**Funzionalità:**
- Gestione anagrafica venditori
- Statistiche (clienti, preventivi, contratti, leads, progetti)
- Gestione contratti venditori
- Assegnazione settori (many-to-many)
- Gestione territorio (JSON array)

---

#### QuoteController

**File:** `backend/app/Http/Controllers/QuoteController.php`

**Endpoints:**
- `GET /api/quotes` - Lista preventivi (paginata)
- `POST /api/quotes` - Crea preventivo
- `GET /api/quotes/{id}` - Dettaglio preventivo
- `PUT /api/quotes/{id}` - Aggiorna preventivo
- `DELETE /api/quotes/{id}` - Elimina preventivo
- `PUT /api/quotes/{id}/status` - Aggiorna stato
- `POST /api/quotes/{id}/duplicate` - Duplica preventivo
- `POST /api/quotes/{id}/request-contract` - Richiedi contratto
- `POST /api/quotes/{id}/reject` - Rifiuta preventivo
- `GET /api/quotes/{id}/pdf` - Genera PDF (pubblico)

**Funzionalità:**
- Gestione preventivi completi
- Calcolo automatico totali (subtotale, sconti, IVA)
- Generazione PDF con DomPDF
- Gestione voci preventivo con opzioni di pagamento e rinnovi
- Validazione business rules
- Eliminazione con controllo contratti associati

**Validazioni:**
- Cliente obbligatorio
- Almeno una voce preventivo
- Calcolo automatico totali
- Validità preventivo

---

#### ContractController

**File:** `backend/app/Http/Controllers/ContractController.php`

**Endpoints:**
- `GET /api/contracts` - Lista contratti (paginata)
- `POST /api/contracts` - Crea contratto
- `GET /api/contracts/{id}` - Dettaglio contratto
- `PUT /api/contracts/{id}` - Aggiorna contratto
- `DELETE /api/contracts/{id}` - Elimina contratto
- `PUT /api/contracts/{id}/status` - Aggiorna stato
- `POST /api/contracts/{id}/file` - Upload contratto
- `POST /api/contracts/{id}/signed` - Upload contratto firmato
- `GET /api/contracts/{id}/revisions` - Lista revisioni
- `GET /api/contracts/{id}/signed-documents` - Lista documenti firmati
- `POST /api/contracts/{id}/signed-documents` - Upload documento firmato
- `DELETE /api/contracts/{id}/signed-documents/{documentId}` - Elimina documento
- `PUT /api/contracts/{id}/project` - Collega a progetto
- `POST /api/contracts/{id}/start-project` - Avvia progetto
- `GET /api/contracts/{id}/download/{type}` - Download file
- `GET /api/contracts/{id}/signed-documents/{documentId}/download` - Download documento
- `GET /api/contracts/{id}/revisions/{revisionId}/download` - Download revisione

**Funzionalità:**
- Gestione completa contratti
- Upload e gestione file (contratto, firmato, revisioni)
- Gestione documenti aggiuntivi (privacy, consenso)
- Supporto URL esterni (Google Drive)
- Collegamento a progetti CRM
- Avvio automatico progetto da contratto firmato
- Gestione stati workflow

**Workflow Stati:**
1. `draft` → Creazione
2. `requested` → Richiesta da preventivo
3. `pending_signature` → Upload contratto
4. `active` → Upload contratto firmato
5. `suspended` → Sospeso
6. `completed` → Completato
7. `terminated` → Terminato

---

#### LeadController

**File:** `backend/app/Http/Controllers/LeadController.php`

**Endpoints:**
- `GET /api/leads` - Lista leads (paginata)
- `POST /api/leads` - Crea lead
- `GET /api/leads/{id}` - Dettaglio lead
- `PUT /api/leads/{id}` - Aggiorna lead
- `DELETE /api/leads/{id}` - Elimina lead
- `PUT /api/leads/{id}/assign` - Assegna venditore
- `POST /api/leads/{id}/convert` - Converti in cliente
- `GET /api/leads/{id}/prepare-quote` - Prepara dati per preventivo
- `POST /api/leads/{id}/activities` - Aggiungi attività
- `GET /api/leads/{id}/activities` - Lista attività
- `POST /api/leads/import-csv` - Importa CSV

**Funzionalità:**
- Gestione leads/contatti
- Assegnazione venditori
- Conversione in clienti
- Timeline attività
- Importazione CSV con validazione
- Preparazione dati per preventivo (precompilazione)

**Importazione CSV:**
- Mapping colonne automatico
- Validazione dati
- Assegnazione regione e venditore
- Report errori importazione

---

#### PriceListController

**File:** `backend/app/Http/Controllers/PriceListController.php`

**Endpoints:**
- `GET /api/price-list` - Lista prodotti/servizi
- `POST /api/price-list` - Crea prodotto
- `GET /api/price-list/{id}` - Dettaglio prodotto
- `PUT /api/price-list/{id}` - Aggiorna prodotto
- `DELETE /api/price-list/{id}` - Elimina prodotto
- `GET /api/price-list/department/{id}` - Prodotti per settore

**Funzionalità:**
- Gestione listino prezzi
- Configurazione opzioni di pagamento (JSON)
- Configurazione opzioni di rinnovo (JSON)
- Note operative (JSON)
- Prezzi fissi/variabili/personalizzati
- Visibilità clienti

---

### Modelli Eloquent

#### Seller Model

**File:** `backend/app/Models/Seller.php`

**Relazioni:**
- `user()` - BelongsTo User
- `departments()` - BelongsToMany CrmDepartment (pivot: seller_departments)
- `clients()` - HasMany Client
- `quotes()` - HasMany Quote
- `contracts()` - HasMany Contract
- `leads()` - HasMany Lead
- `projects()` - HasMany CrmProject

**Metodi:**
- `contractDaysRemaining()` - Giorni rimanenti contratto
- `isContractExpired()` - Contratto scaduto
- `expiringContracts($days)` - Scope contratti in scadenza

---

#### Quote Model

**File:** `backend/app/Models/Quote.php`

**Relazioni:**
- `client()` - BelongsTo Client
- `seller()` - BelongsTo Seller
- `department()` - BelongsTo CrmDepartment
- `creator()` - BelongsTo User
- `items()` - HasMany QuoteItem
- `contract()` - HasOne Contract

**Campi JSON:**
- `payment_option` (in QuoteItem)
- `renewal_option` (in QuoteItem)
- `renewal_options` (in QuoteItem)
- `selected_features` (in QuoteItem)

**Metodi:**
- `calculateTotals()` - Calcolo automatico totali
- `expiringSoon($days)` - Scope preventivi in scadenza
- `generatePDF()` - Generazione PDF

---

#### Contract Model

**File:** `backend/app/Models/Contract.php`

**Relazioni:**
- `client()` - BelongsTo Client
- `seller()` - BelongsTo Seller
- `project()` - BelongsTo CrmProject
- `quote()` - BelongsTo Quote
- `creator()` - BelongsTo User
- `revisions()` - HasMany ContractRevision
- `signedDocuments()` - HasMany ContractSignedDocument

**Metodi:**
- `daysRemaining()` - Giorni rimanenti
- `isSigned()` - Contratto firmato
- `isActive()` - Contratto attivo
- `expiringSoon($days)` - Scope contratti in scadenza

---

#### Lead Model

**File:** `backend/app/Models/Lead.php`

**Relazioni:**
- `seller()` - BelongsTo Seller
- `department()` - BelongsTo CrmDepartment
- `convertedClient()` - BelongsTo Client
- `creator()` - BelongsTo User
- `activities()` - HasMany LeadActivity

**Campi JSON:**
- `phones` - Array telefoni
- `emails` - Array email
- `websites` - Array URL

**Metodi:**
- `convertToClient()` - Conversione in cliente
- `prepareForQuote()` - Preparazione dati preventivo

---

## 🗄️ Database Schema

### Tabelle Principali

#### sellers
```sql
- id (PK)
- user_id (FK users, UNIQUE)
- contract_file
- contract_start_date
- contract_end_date
- territory (LONGTEXT JSON)
- commission_rate (DECIMAL 5,2)
- is_active (TINYINT)
- created_at, updated_at
```

#### seller_departments (Pivot)
```sql
- id (PK)
- seller_id (FK sellers)
- crm_department_id (FK crm_departments)
- is_active
- currently_working
- created_at, updated_at
```

#### price_list_items
```sql
- id (PK)
- crm_department_id (FK crm_departments)
- name
- description
- base_price (DECIMAL)
- price_type (ENUM: fisso, variabile, personalizzato)
- payment_options (LONGTEXT JSON)
- renewal_options (LONGTEXT JSON)
- operational_notes (LONGTEXT JSON)
- landing_page_url
- is_active
- is_visible_to_clients
- created_at, updated_at
```

#### quotes
```sql
- id (PK)
- quote_number (UNIQUE)
- client_id (FK clients)
- seller_id (FK sellers)
- crm_department_id (FK crm_departments)
- status (ENUM)
- title
- description
- subtotal (DECIMAL)
- discount_percentage (DECIMAL)
- discount_amount (DECIMAL)
- tax_percentage (DECIMAL)
- tax_amount (DECIMAL)
- total_amount (DECIMAL)
- notes
- valid_until (DATE)
- pdf_path
- created_by (FK users)
- created_at, updated_at
```

#### quote_items
```sql
- id (PK)
- quote_id (FK quotes)
- price_list_item_id (FK price_list_items, nullable)
- description
- quantity (DECIMAL)
- unit_price (DECIMAL)
- discount (DECIMAL)
- total (DECIMAL)
- payment_option (LONGTEXT JSON)
- renewal_option (LONGTEXT JSON)
- renewal_options (LONGTEXT JSON)
- selected_features (LONGTEXT JSON)
- notes
- created_at, updated_at
```

#### contracts
```sql
- id (PK)
- quote_id (FK quotes, nullable)
- client_id (FK clients)
- seller_id (FK sellers)
- crm_project_id (FK crm_projects, nullable)
- contract_number (UNIQUE)
- title
- contract_type
- status (ENUM)
- start_date (DATE)
- end_date (DATE)
- total_value (DECIMAL)
- payment_terms
- contract_file
- signed_file
- signed_at (DATETIME)
- notes
- created_by (FK users)
- created_at, updated_at
```

#### contract_revisions
```sql
- id (PK)
- contract_id (FK contracts)
- revision_number
- file_path
- revision_notes
- created_by (FK users)
- created_at, updated_at
```

#### contract_signed_documents
```sql
- id (PK)
- contract_id (FK contracts)
- document_type (ENUM: privacy_policy, consent_personal_data, other)
- document_name
- file_path
- external_url (per Google Drive, etc)
- signed_at (DATETIME)
- notes
- created_by (FK users)
- created_at, updated_at
```

#### leads
```sql
- id (PK)
- assigned_seller_id (FK sellers, nullable)
- company_name
- tipologia
- contact_person
- address
- region
- phones (LONGTEXT JSON)
- emails (LONGTEXT JSON)
- crm_department_id (FK crm_departments)
- websites (LONGTEXT JSON)
- description
- digital_status
- pitch_strategy
- status (ENUM)
- priority (ENUM)
- estimated_value (DECIMAL)
- expected_close_date (DATE)
- source
- last_contact_date (DATE)
- next_followup_date (DATE)
- notes
- converted_to_client_id (FK clients, nullable)
- created_by (FK users)
- created_at, updated_at
```

#### lead_activities
```sql
- id (PK)
- lead_id (FK leads)
- activity_type (ENUM: note, call, email, meeting, status_change)
- description
- outcome
- created_by (FK users)
- created_at, updated_at
```

### Indici

- `idx_seller_active` su `sellers(is_active)`
- `idx_price_list_department` su `price_list_items(crm_department_id, is_active)`
- `idx_quote_date` su `quotes(created_at)`
- `idx_contract_dates` su `contracts(start_date, end_date)`
- `idx_lead_followup` su `leads(next_followup_date)`
- `idx_lead_created` su `leads(created_at)`

### Viste

- `sellers_summary` - Riepilogo venditori con statistiche
- `quotes_detailed` - Preventivi con dettagli

---

## 🔄 Flussi di Lavoro Principali

### 1. Flusso Preventivo → Contratto → Progetto

```
Lead → QuoteWizard → Quote (pending)
  ↓
Quote (approved) → Request Contract
  ↓
Contract (draft) → Upload Contract → Contract (pending_signature)
  ↓
Upload Signed Contract → Contract (active)
  ↓
Upload Additional Documents (privacy, consent)
  ↓
Generate Payment Plan
  ↓
Start Project → CrmProject (active)
```

**Punti Chiave:**
- Preventivo può essere creato da lead (precompilazione)
- Richiesta contratto da preventivo approvato
- Upload documenti in sequenza
- Generazione piano pagamento automatica
- Avvio progetto da contratto firmato

---

### 2. Flusso Lead → Cliente

```
Lead (new) → Assign Seller
  ↓
Lead Activities (call, email, meeting)
  ↓
Lead (qualified) → Create Quote
  ↓
Quote (won) → Convert Lead to Client
  ↓
Client → Contracts → Projects
```

**Punti Chiave:**
- Assegnazione venditore
- Timeline attività
- Conversione automatica in cliente
- Trasferimento dati lead → cliente

---

### 3. Flusso Importazione CSV Leads

```
CSV File → Upload
  ↓
Parse & Validate
  ↓
Map Columns
  ↓
Assign Region & Seller
  ↓
Create Leads (bulk)
  ↓
Report (imported, errors)
```

**Punti Chiave:**
- Validazione dati
- Mapping colonne flessibile
- Assegnazione automatica regione/venditore
- Report errori dettagliato

---

### 4. Flusso Configurazione Listino

```
Create Price List Item
  ↓
Configure Payment Options
  ↓
Configure Renewal Options
  ↓
Set Operational Notes
  ↓
Activate Item
  ↓
Use in Quote Wizard
```

**Punti Chiave:**
- Configurazione opzioni pagamento (JSON)
- Configurazione rinnovi (obbligatori/facoltativi/multi)
- Note operative per segreteria
- Visibilità clienti

---

## 🔗 Integrazioni

### 1. Sistema CRM

**Integrazione:**
- Venditori collegati a CRM Departments
- Preventivi/Contratti collegati a settori
- Progetti avviati da contratti
- Budget e spese per settore

**Endpoints Utilizzati:**
- `GET /api/budget/crm` - Lista settori
- `POST /api/crm-projects` - Creazione progetto
- `GET /api/crm-projects/{id}` - Dettaglio progetto

---

### 2. Sistema Clienti

**Integrazione:**
- Clienti collegati a venditori
- Conversione leads in clienti
- Storico preventivi/contratti per cliente

**Endpoints Utilizzati:**
- `GET /api/clients` - Lista clienti
- `POST /api/clients` - Crea cliente
- `GET /api/clients/{id}/projects` - Progetti cliente

---

### 3. Sistema Piani di Pagamento

**Integrazione:**
- Generazione automatica piani da contratti
- Rate basate su opzioni pagamento preventivo
- Gestione rinnovi

**Endpoints Utilizzati:**
- `POST /api/payment-plans/generate-from-contract/{contractId}`
- `GET /api/payment-plans/{id}`
- `POST /api/payment-plans/{id}/installments`

---

### 4. Sistema Fatturazione

**Integrazione:**
- Fatture generate da piani di pagamento
- Collegamento contratti → fatture

**Endpoints Utilizzati:**
- `GET /api/invoices`
- `POST /api/invoices/issue`

---

### 5. Sistema Progetti

**Integrazione:**
- Progetti avviati automaticamente da contratti
- Collegamento venditore → progetto
- Budget progetto da contratto

**Endpoints Utilizzati:**
- `POST /api/contracts/{id}/start-project`
- `GET /api/crm-projects/{id}`

---

## 🎨 Design e UX

### Design System

**Stile:**
- Design Apple-like minimalista
- Colori usati con parsimonia
- UI pulita e moderna
- Componenti riutilizzabili

**Componenti Principali:**
- `VenditoriLayout` - Layout con sidebar collassabile
- `venditori-btn` - Bottoni standardizzati
- `venditori-badge` - Badge stati colorati
- `venditori-table` - Tabelle responsive
- `venditori-empty-state` - Stati vuoti
- `venditori-loading` - Loading states

**Colori:**
- Primary: `#0A84FF` (Blu)
- Success: `#34C759` (Verde)
- Warning: `#FF9F0A` (Arancione)
- Danger: `#FF3B30` (Rosso)
- Info: `#5856D6` (Viola)

**Tipografia:**
- Font system (San Francisco su Mac, Segoe UI su Windows)
- Gerarchia chiara (h1, h2, h3, body, small)

**Spacing:**
- Sistema 8px (8, 16, 24, 32, 40, 48)
- Padding/margin consistenti

**Responsive:**
- Mobile-first approach
- Breakpoints standard
- Tabelle scrollabili su mobile

---

### UX Patterns

**Navigation:**
- Sidebar collassabile
- Breadcrumb implicito
- Back button nelle pagine dettaglio

**Forms:**
- Validazione real-time
- Messaggi errore chiari
- Conferme per azioni distruttive

**Feedback:**
- Loading states
- Success/error messages
- Toast notifications (se implementato)

**Search & Filters:**
- Ricerca in tempo reale
- Filtri multipli
- Reset filtri

**Wizard:**
- Progress indicator
- Validazione step-by-step
- Salvataggio dati tra step
- Navigazione avanti/indietro

---

## 📊 Statistiche e Reporting

### Overview Dashboard

**Metriche:**
- Fatturato totale (con variazione %)
- Contratti attivi (con variazione %)
- Preventivi pending (con variazione %)
- Venditori attivi

**Grafici:**
- Andamento vendite (line chart)
- Distribuzione per settore (pie chart)

**Attività Recenti:**
- Timeline ultime attività
- Link rapidi alle risorse

---

### Statistiche Venditore

**Per Venditore:**
- Clienti totali
- Preventivi totali
- Contratti totali
- Leads assegnati
- Progetti attivi
- Valore contratti attivi
- Valore preventivi pending

---

### Statistiche Lead

**Per Lead:**
- Timeline attività
- Storico contatti
- Conversion rate
- Tempo medio conversione

---

## 🔒 Sicurezza e Permessi

### Ruoli

**Ruolo `venditori`:**
- Accesso completo sezione venditori
- Visualizzazione propri dati
- Creazione preventivi/contratti
- Gestione propri leads

**Ruolo `admin`:**
- Accesso completo sistema
- Gestione venditori
- Approvazione preventivi
- Gestione contratti

**Ruolo `segreteria`:**
- Visualizzazione preventivi/contratti
- Gestione piani di pagamento
- Gestione fatture

---

### Validazioni

**Backend:**
- Validazione input Laravel
- Sanitizzazione dati
- Controllo permessi
- Validazione business rules

**Frontend:**
- Validazione form
- Controllo campi obbligatori
- Messaggi errore chiari

---

## 🚀 Performance

### Ottimizzazioni

**Database:**
- Indici su colonne frequenti
- Eager loading relazioni
- Query ottimizzate

**Frontend:**
- Lazy loading componenti
- Memoization
- Debounce su ricerche
- Paginazione

**API:**
- Paginazione default
- Filtri lato server
- Caching statistiche (se implementato)

---

## 📝 Note Tecniche

### Tecnologie

**Frontend:**
- React 18
- TypeScript
- React Router v6
- Recharts (grafici)
- Lucide React (icone)
- CSS Modules

**Backend:**
- Laravel 10
- PHP 8.1+
- MySQL/MariaDB
- DomPDF (generazione PDF)
- Sanctum (autenticazione)

**Database:**
- MySQL/MariaDB
- JSON columns per dati flessibili
- Indici per performance

---

### Best Practices

**Code Organization:**
- Separazione concerns
- Componenti riutilizzabili
- API layer separato
- Types TypeScript

**Error Handling:**
- Try-catch blocchi
- Messaggi errore user-friendly
- Logging errori backend

**Testing:**
- Unit tests (se implementati)
- Integration tests (se implementati)

---

## 🔮 Possibili Miglioramenti

1. **Notifiche Real-time:**
   - WebSocket per notifiche
   - Notifiche browser
   - Email automatiche

2. **Export Dati:**
   - Export Excel/CSV
   - Report PDF
   - Dashboard personalizzabili

3. **Analytics Avanzati:**
   - Funnel vendite
   - Conversion rate
   - Tempo medio conversione
   - Previsioni vendite

4. **Integrazione Email:**
   - Invio preventivi via email
   - Template email personalizzabili
   - Tracking apertura

5. **Mobile App:**
   - App nativa iOS/Android
   - Accesso offline
   - Notifiche push

6. **AI/ML:**
   - Suggerimenti prodotti
   - Previsioni vendite
   - Scoring leads

---

## 📚 Documentazione Aggiuntiva

- `ANALISI_PROCESSO_PREVENTIVI.md` - Analisi dettagliata processo preventivi
- `SPECIFICA_RINNOVI_E_NOTE_OPERATIVE.md` - Specifica sistema rinnovi
- `venditori_system_schema.sql` - Schema database completo

---

**Fine Analisi**

