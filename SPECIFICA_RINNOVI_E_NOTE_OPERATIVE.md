# Specifica: Note Operative e Gestione Rinnovi Avanzata

## 📋 Panoramica

Questo documento descrive le modifiche al sistema per:
1. **Note Operative**: Campo aggiuntivo nei prodotti del listino
2. **Gestione Rinnovi Avanzata**: Sistema di rinnovo con 3 modalità (obbligatorio, facoltativo, multi-rinnovo)

---

## 🗄️ Modifiche Database

### 1. Tabella `price_list_items`

#### Nuovo Campo: `operational_notes`
```sql
ALTER TABLE `price_list_items` 
ADD COLUMN `operational_notes` TEXT NULL DEFAULT NULL 
COMMENT 'Note operative per il prodotto/servizio (mostrate nel preventivo)' 
AFTER `description`;
```

**Descrizione**: Note operative che vengono mostrate nel preventivo per fornire informazioni aggiuntive sul prodotto/servizio.

#### Nuovo Campo: `renewal_type`
```sql
ALTER TABLE `price_list_items` 
ADD COLUMN `renewal_type` ENUM('obbligatorio', 'facoltativo', 'multi') NULL DEFAULT NULL 
COMMENT 'Tipo di rinnovo: obbligatorio, facoltativo o multi-rinnovo' 
AFTER `renewal_options`;
```

**Valori possibili**:
- `obbligatorio`: Il venditore DEVE selezionare una opzione di rinnovo
- `facoltativo`: Il venditore può scegliere se selezionare o no
- `multi`: Tutte le opzioni sono selezionate di default (multi-rinnovo)

### 2. Tabella `quote_items`

#### Nuovo Campo: `renewal_options` (array)
```sql
ALTER TABLE `quote_items` 
ADD COLUMN `renewal_options` LONGTEXT NULL DEFAULT NULL 
COMMENT 'JSON: array di opzioni di rinnovo selezionate (per multi-rinnovo)' 
AFTER `renewal_option`;
```

**Logica**:
- `renewal_option` (singolo): Usato quando `renewal_type = 'obbligatorio'` o `'facoltativo'` (una sola opzione selezionata)
- `renewal_options` (array): Usato quando `renewal_type = 'multi'` (più opzioni selezionate di default)

---

## 🔄 Logica di Funzionamento

### Configurazione Listino (`/venditori/configurazione-listini`)

#### 1. Campo "Note Operative"
- **Posizione**: Dopo il campo "Descrizione"
- **Tipo**: Textarea
- **Obbligatorio**: No
- **Uso**: Note che verranno mostrate nel preventivo per questo prodotto/servizio

#### 2. Configurazione Rinnovo

**Struttura JSON `renewal_options`** (rimane invariata):
```json
[
  {
    "id": "1767528702617",
    "duration": "monthly",
    "price": 260,
    "description": "Rinnovo con gestione...",
    "includes": ["Manutenzione server", "Backup Giornaliero", ...],
    "is_active": true
  },
  {
    "id": "1767528901968",
    "duration": "monthly",
    "price": 80,
    "description": "Rinnovo e mantenimento...",
    "includes": ["Manutenzione server", "Backup settimanale", ...],
    "is_active": true
  }
]
```

**Nuovo Campo `renewal_type`**:
- **Default**: `NULL` (comportamento legacy: facoltativo)
- **Opzioni**:
  - `obbligatorio`: Rinnovo obbligatorio
  - `facoltativo`: Rinnovo facoltativo
  - `multi`: Multi-rinnovo

**Comportamento in base a `renewal_type`**:

##### `renewal_type = 'obbligatorio'`
- Se c'è **solo 1 opzione** di rinnovo:
  - ✅ Selezionata **automaticamente** nel wizard preventivo
  - 🔒 Non può essere deselezionata
  - 📝 Mostrata come "Rinnovo Obbligatorio"
- Se ci sono **più opzioni**:
  - ⚠️ Il venditore **DEVE** selezionarne una
  - ❌ Non può procedere senza selezionare
  - 📝 Mostrate tutte con label "Seleziona Rinnovo Obbligatorio"

##### `renewal_type = 'facoltativo'`
- Se c'è **solo 1 opzione**:
  - ✅ Opzione disponibile ma non selezionata di default
  - ✅ Il venditore può selezionarla o no
  - 📝 Mostrata come "Rinnovo Facoltativo"
- Se ci sono **più opzioni**:
  - ✅ Il venditore può selezionarne una o nessuna
  - 📝 Mostrate tutte con label "Rinnovo Facoltativo (Opzionale)"

##### `renewal_type = 'multi'`
- **Tutte le opzioni** sono selezionate di default
- ✅ Il venditore può deselezionare alcune opzioni
- 📝 Mostrate tutte con checkbox e label "Multi-Rinnovo"
- 💡 **Spiegazione**: Il cliente può scegliere quale rinnovo fare di mese in mese
- 💾 Salvato come **array** in `quote_items.renewal_options` (non `renewal_option`)

---

## 📝 Wizard Preventivo

### Step 2: Configurazione

#### Gestione Rinnovo in base a `renewal_type`

**Caso 1: `renewal_type = 'obbligatorio'` + 1 opzione**
```tsx
// Selezionata automaticamente
if (item.renewal_type === 'obbligatorio' && item.renewal_options?.length === 1) {
  // Auto-seleziona l'unica opzione
  onUpdateService(index, { 
    selected_renewal: item.renewal_options[0],
    renewal_type: 'obbligatorio'
  });
  
  // Mostra come read-only
  <div className="renewal-obligatory-single">
    <label>Rinnovo Obbligatorio</label>
    <div className="renewal-display">
      {item.renewal_options[0].description} - € {item.renewal_options[0].price}
    </div>
  </div>
}
```

**Caso 2: `renewal_type = 'obbligatorio'` + più opzioni**
```tsx
// Il venditore DEVE selezionarne una
<div className="renewal-obligatory-multiple">
  <label>Rinnovo Obbligatorio *</label>
  <select required>
    <option value="">Seleziona un rinnovo...</option>
    {item.renewal_options.map(renewal => (
      <option key={renewal.id} value={renewal.id}>
        {renewal.description} - € {renewal.price}
      </option>
    ))}
  </select>
</div>
```

**Caso 3: `renewal_type = 'facoltativo'`**
```tsx
// Comportamento attuale (già implementato)
<div className="renewal-optional">
  <label>Opzione di Rinnovo (Opzionale)</label>
  <select>
    <option value="">Nessun rinnovo</option>
    {item.renewal_options.map(renewal => (
      <option key={renewal.id} value={renewal.id}>
        {renewal.description} - € {renewal.price}
      </option>
    ))}
  </select>
</div>
```

**Caso 4: `renewal_type = 'multi'`**
```tsx
// Tutte selezionate di default, checkbox per deselezionare
<div className="renewal-multi">
  <label>Multi-Rinnovo</label>
  <p className="renewal-multi-description">
    Tutte le opzioni sono incluse. Il cliente può scegliere quale fare di mese in mese.
  </p>
  {item.renewal_options.map(renewal => (
    <label key={renewal.id} className="renewal-multi-checkbox">
      <input
        type="checkbox"
        checked={service.selected_renewals?.some(r => r.id === renewal.id) ?? true}
        onChange={(e) => {
          const renewals = service.selected_renewals || item.renewal_options;
          if (e.target.checked) {
            onUpdateService(index, { 
              selected_renewals: [...renewals, renewal]
            });
          } else {
            onUpdateService(index, { 
              selected_renewals: renewals.filter(r => r.id !== renewal.id)
            });
          }
        }}
      />
      <div>
        <span>{renewal.description}</span>
        <span className="renewal-price">€ {renewal.price}</span>
      </div>
    </label>
  ))}
</div>
```

### Step 7: Riepilogo

#### Calcolo Automatico Rinnovi

**Se ci sono 2+ servizi con rinnovo:**
```typescript
// Calcola totale rinnovi
const totalRenewals = wizardData.selectedServices
  .filter(service => {
    // Rinnovo singolo
    if (service.selected_renewal) {
      return true;
    }
    // Multi-rinnovo
    if (service.selected_renewals && service.selected_renewals.length > 0) {
      return true;
    }
    return false;
  })
  .reduce((sum, service) => {
    // Rinnovo singolo
    if (service.selected_renewal) {
      return sum + service.selected_renewal.price;
    }
    // Multi-rinnovo: somma tutte le opzioni selezionate
    if (service.selected_renewals) {
      return sum + service.selected_renewals.reduce((s, r) => s + r.price, 0);
    }
    return sum;
  }, 0);
```

**Visualizzazione nel Riepilogo:**
```tsx
{totalRenewals > 0 && (
  <div className="summary-section renewal-summary">
    <h3>Rinnovi Configurati</h3>
    <div className="renewal-total">
      <span>Totale Rinnovi Annuali:</span>
      <span>€ {totalRenewals.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
    </div>
    {/* Dettaglio per servizio */}
    {wizardData.selectedServices
      .filter(s => s.selected_renewal || (s.selected_renewals && s.selected_renewals.length > 0))
      .map((service, idx) => (
        <div key={idx} className="renewal-service-detail">
          <div className="service-name">{service.price_list_item.name}</div>
          {service.selected_renewal ? (
            <div className="renewal-option">
              {service.selected_renewal.description} - € {service.selected_renewal.price}
            </div>
          ) : (
            <div className="renewal-options-multi">
              {service.selected_renewals?.map((r, i) => (
                <div key={i} className="renewal-option">
                  {r.description} - € {r.price}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
  </div>
)}
```

### Nuova Pagina: Spiegazione Rinnovo

**Aggiungere dopo Step 7 (Riepilogo) o come sezione espandibile:**

```tsx
<div className="renewal-explanation-section">
  <h3>Spiegazione Rinnovi</h3>
  
  {/* Rinnovo Singolo */}
  {servicesWithSingleRenewal.length > 0 && (
    <div className="renewal-explanation-card">
      <h4>Rinnovi Singoli</h4>
      {servicesWithSingleRenewal.map((service, idx) => (
        <div key={idx} className="renewal-explanation-item">
          <div className="service-name">{service.price_list_item.name}</div>
          <div className="renewal-type-badge">
            {service.price_list_item.renewal_type === 'obbligatorio' 
              ? 'Obbligatorio' 
              : 'Facoltativo'}
          </div>
          <div className="renewal-details">
            <p>{service.selected_renewal.description}</p>
            <ul>
              {service.selected_renewal.includes?.map((inc, i) => (
                <li key={i}>{inc}</li>
              ))}
            </ul>
            <p className="renewal-price">
              Prezzo: € {service.selected_renewal.price} / {getDurationLabel(service.selected_renewal.duration)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )}
  
  {/* Multi-Rinnovo */}
  {servicesWithMultiRenewal.length > 0 && (
    <div className="renewal-explanation-card">
      <h4>Multi-Rinnovo</h4>
      <p className="multi-renewal-description">
        I seguenti servizi includono più opzioni di rinnovo. Il cliente può scegliere 
        quale opzione attivare di mese in mese in base alle sue esigenze.
      </p>
      {servicesWithMultiRenewal.map((service, idx) => (
        <div key={idx} className="renewal-explanation-item multi">
          <div className="service-name">{service.price_list_item.name}</div>
          <div className="renewal-options-list">
            {service.selected_renewals?.map((renewal, rIdx) => (
              <div key={rIdx} className="renewal-option-card">
                <h5>{renewal.description}</h5>
                <ul>
                  {renewal.includes?.map((inc, i) => (
                    <li key={i}>{inc}</li>
                  ))}
                </ul>
                <p className="renewal-price">
                  € {renewal.price} / {getDurationLabel(renewal.duration)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## 📄 PDF Preventivo

### Note Operative

**Mostrare le note operative per ogni servizio:**
```php
@foreach($quote->items as $item)
  @if($item->priceListItem && $item->priceListItem->operational_notes)
    <div class="operational-notes">
      <strong>Note Operative:</strong>
      <p>{{ $item->priceListItem->operational_notes }}</p>
    </div>
  @endif
@endforeach
```

### Sezione Rinnovi

**Aggiungere sezione dedicata ai rinnovi nel PDF:**
```php
@php
  $servicesWithRenewal = $quote->items->filter(function($item) {
    return $item->renewal_option || 
           ($item->renewal_options && count(json_decode($item->renewal_options, true)) > 0);
  });
@endphp

@if($servicesWithRenewal->count() > 0)
  <div class="renewal-section">
    <h2>Opzioni di Rinnovo</h2>
    
    @foreach($servicesWithRenewal as $item)
      <div class="renewal-item">
        <h3>{{ $item->description }}</h3>
        
        @if($item->renewal_option)
          {{-- Rinnovo Singolo --}}
          @php $renewal = json_decode($item->renewal_option, true); @endphp
          <div class="renewal-option">
            <p><strong>{{ $renewal['description'] }}</strong></p>
            <p>Prezzo: € {{ number_format($renewal['price'], 2, ',', '.') }} 
               / {{ $renewal['duration'] }}</p>
            @if(isset($renewal['includes']))
              <ul>
                @foreach($renewal['includes'] as $include)
                  <li>{{ $include }}</li>
                @endforeach
              </ul>
            @endif
          </div>
        @elseif($item->renewal_options)
          {{-- Multi-Rinnovo --}}
          @php $renewals = json_decode($item->renewal_options, true); @endphp
          <div class="renewal-multi">
            <p><em>Multi-Rinnovo: Il cliente può scegliere quale opzione attivare di mese in mese.</em></p>
            @foreach($renewals as $renewal)
              <div class="renewal-option">
                <p><strong>{{ $renewal['description'] }}</strong></p>
                <p>Prezzo: € {{ number_format($renewal['price'], 2, ',', '.') }} 
                   / {{ $renewal['duration'] }}</p>
                @if(isset($renewal['includes']))
                  <ul>
                    @foreach($renewal['includes'] as $include)
                      <li>{{ $include }}</li>
                    @endforeach
                  </ul>
                @endif
              </div>
            @endforeach
          </div>
        @endif
      </div>
    @endforeach
    
    {{-- Totale Rinnovi --}}
    @php
      $totalRenewals = 0;
      foreach($servicesWithRenewal as $item) {
        if($item->renewal_option) {
          $renewal = json_decode($item->renewal_option, true);
          $totalRenewals += $renewal['price'];
        } elseif($item->renewal_options) {
          $renewals = json_decode($item->renewal_options, true);
          foreach($renewals as $renewal) {
            $totalRenewals += $renewal['price'];
          }
        }
      }
    @endphp
    
    <div class="renewal-total">
      <strong>Totale Rinnovi Annuali: € {{ number_format($totalRenewals, 2, ',', '.') }}</strong>
    </div>
  </div>
@endif
```

---

## 🔧 Modifiche TypeScript

### Aggiornare `types/sellers.ts`

```typescript
export interface PriceListItem {
  // ... campi esistenti
  operational_notes?: string; // NUOVO
  renewal_type?: 'obbligatorio' | 'facoltativo' | 'multi'; // NUOVO
  renewal_options?: RenewalOption[];
}

export interface SelectedService {
  // ... campi esistenti
  selected_renewal?: RenewalOption; // Rinnovo singolo
  selected_renewals?: RenewalOption[]; // NUOVO: Multi-rinnovo
  renewal_type?: 'obbligatorio' | 'facoltativo' | 'multi'; // NUOVO
}

export interface QuoteItem {
  // ... campi esistenti
  renewal_option?: RenewalOption; // Rinnovo singolo
  renewal_options?: RenewalOption[]; // NUOVO: Multi-rinnovo (array)
}
```

---

## ✅ Checklist Implementazione

### Backend
- [ ] Eseguire SQL: `add_operational_notes_to_price_list_items.sql`
- [ ] Eseguire SQL: `add_renewal_type_to_price_list_items.sql`
- [ ] Eseguire SQL: `add_renewal_options_array_to_quote_items.sql`
- [ ] Aggiornare `PriceListItem` model: aggiungere `operational_notes` e `renewal_type` a `$fillable` e `$casts`
- [ ] Aggiornare `QuoteItem` model: aggiungere `renewal_options` a `$fillable` e `$casts`
- [ ] Aggiornare `PriceListController`: validazione per `operational_notes` e `renewal_type`
- [ ] Aggiornare `QuoteController`: gestione `renewal_options` (array) nella creazione/update
- [ ] Aggiornare view PDF: aggiungere sezione rinnovi e note operative

### Frontend
- [ ] Aggiornare `types/sellers.ts`: aggiungere nuovi campi
- [ ] Aggiornare `PriceListItemFormPage.tsx`: 
  - [ ] Aggiungere campo "Note Operative"
  - [ ] Aggiungere select per `renewal_type`
- [ ] Aggiornare `QuoteStep2Configuration.tsx`: 
  - [ ] Logica per `renewal_type = 'obbligatorio'` (auto-selezione se 1 opzione)
  - [ ] Logica per `renewal_type = 'multi'` (checkbox multiple)
- [ ] Aggiornare `QuoteStep7Summary.tsx`:
  - [ ] Calcolo totale rinnovi (singoli + multi)
  - [ ] Visualizzazione rinnovi per servizio
  - [ ] Aggiungere sezione "Spiegazione Rinnovi"
- [ ] Aggiornare `QuoteStep8Finalize.tsx`: 
  - [ ] Inviare `renewal_options` (array) se multi-rinnovo
  - [ ] Inviare `renewal_option` (singolo) se non multi

---

## 📊 Esempi di Utilizzo

### Esempio 1: Rinnovo Obbligatorio (1 opzione)
```json
{
  "name": "Hosting Professionale",
  "renewal_type": "obbligatorio",
  "renewal_options": [
    {
      "id": "1",
      "duration": "monthly",
      "price": 50,
      "description": "Hosting mensile con backup",
      "includes": ["Backup giornaliero", "SSL incluso"]
    }
  ]
}
```
**Comportamento**: Selezionato automaticamente, non può essere deselezionato.

### Esempio 2: Rinnovo Obbligatorio (più opzioni)
```json
{
  "name": "Piano Completo",
  "renewal_type": "obbligatorio",
  "renewal_options": [
    {
      "id": "1",
      "duration": "monthly",
      "price": 260,
      "description": "Con gestione campagne"
    },
    {
      "id": "2",
      "duration": "monthly",
      "price": 80,
      "description": "Solo manutenzione"
    }
  ]
}
```
**Comportamento**: Il venditore DEVE selezionarne una.

### Esempio 3: Multi-Rinnovo
```json
{
  "name": "Servizio Premium",
  "renewal_type": "multi",
  "renewal_options": [
    {
      "id": "1",
      "duration": "monthly",
      "price": 100,
      "description": "Piano Base"
    },
    {
      "id": "2",
      "duration": "monthly",
      "price": 200,
      "description": "Piano Avanzato"
    },
    {
      "id": "3",
      "duration": "monthly",
      "price": 300,
      "description": "Piano Enterprise"
    }
  ]
}
```
**Comportamento**: Tutte e 3 selezionate di default. Il cliente può scegliere quale attivare di mese in mese.

---

**Data Creazione**: 2024
**Versione**: 1.0

