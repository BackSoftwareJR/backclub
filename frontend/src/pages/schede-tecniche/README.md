# Schede Tecniche - Landing Pages

Questa cartella contiene le landing page pubbliche per i servizi del listino prezzi.

## Struttura

Ogni landing page è un componente React standalone con:
- Componente principale (`.tsx`)
- Stili dedicati (`.css`)
- Design Apple-style luminoso e arioso
- Animazioni Framer Motion
- Before/After slider interattivo (quando applicabile)

## Landing Pages Disponibili

### 1. Restyling Strutture Accoglienza
- **File**: `RestylingStruttureAccoglienza.tsx`
- **Route**: `/schede-tecniche/restyling-strutture-accoglienza`
- **Servizio**: Web Restyling for Care Facilities
- **Target**: Case Famiglia / RSA

## Aggiungere una Nuova Landing Page

1. Crea i file nella cartella `schede-tecniche/`:
   - `NomeServizio.tsx`
   - `NomeServizio.css`

2. Aggiungi la route in `App.tsx`:
```tsx
import NomeServizio from './pages/schede-tecniche/NomeServizio.tsx';

// Nelle Routes:
<Route
  path="/schede-tecniche/nome-servizio"
  element={<NomeServizio />}
/>
```

3. Collega il link nel listino prezzi:
   - Aggiungi `landing_page_url: "/schede-tecniche/nome-servizio"` al prodotto nel backend

## Design Guidelines

- **Palette**: Soft Whites, Warm Beiges, Trustworthy Teals/Blues
- **Typography**: Inter/Geist, alta leggibilità
- **No Dark Mode**: Le landing devono essere sempre luminose
- **Animazioni**: Sottili, Apple-like, con Framer Motion
- **Performance**: Target 100/100 Lighthouse Score
