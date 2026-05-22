# 📱 Implementazione Layout Mobile - Sistema Seller

## Panoramica

È stato implementato un layout mobile dedicato per il sistema Seller che segue le Human Interface Guidelines di iOS, con un'esperienza utente ottimizzata per dispositivi mobili.

## Componenti Creati

### 1. Hook `useIsMobile`
**File:** `src/hooks/useIsMobile.ts`

Hook per rilevare se il viewport è mobile (< 768px). Utilizza un listener su `resize` per aggiornare lo stato dinamicamente.

```typescript
const isMobile = useIsMobile();
```

### 2. `SellerMobileLayout`
**File:** `src/pages/Seller/SellerMobileLayout.tsx`

Layout principale per mobile che include:
- Area contenuto principale con safe area support
- Bottom navigation bar
- Bottom sheet per menu "Altro"

### 3. `SellerMobileNavBar`
**File:** `src/components/Mobile/SellerMobileNavBar.tsx`

Barra di navigazione fissa in basso con 5 tab:
1. **Home** - Dashboard
2. **Contatti** - Leads/Contatti
3. **Vendita** - Preventivi/Contratti
4. **Agenda** - Calendario
5. **Altro** - Menu accesso a Listini, Clienti, Commissioni, Supporto

### 4. `BottomSheet`
**File:** `src/components/Mobile/BottomSheet.tsx`

Componente bottom sheet iOS-style con:
- Drag to dismiss
- Snap points configurabili
- Overlay con blur
- Animazioni fluide
- Supporto dark mode

### 5. `SkeletonLoader`
**File:** `src/components/Mobile/SkeletonLoader.tsx`

Componente per skeleton loading states con vari tipi:
- `card` - Card con avatar e testo
- `list` - Lista elementi
- `tile` - Tile quadrato (per KPI)
- `text` - Solo testo
- `avatar` - Solo avatar

### 6. `PullToRefresh`
**File:** `src/components/Mobile/PullToRefresh.tsx`

Componente per implementare il pattern "Pull to Refresh":
- Indicatore visivo durante il pull
- Animazione di refresh
- Threshold configurabile
- Feedback visivo

### 7. `SellerDashboardMobile`
**File:** `src/pages/Seller/SellerDashboardMobile.tsx`

Versione mobile ottimizzata della dashboard con:
- KPI tiles in grid 2x2 (stile Apple Health)
- Revenue card
- Sezione "Azioni Prioritarie" (urgent leads)
- Quick actions
- Recent quotes
- Pull to refresh integrato
- Skeleton loading states

## Modifiche ai File Esistenti

### `SellerLayout.tsx`
- Aggiunto import di `useIsMobile`
- Aggiunto check: se mobile, renderizza `SellerMobileLayout`
- Desktop layout rimane invariato

### `SellerDashboardPage.tsx`
- Aggiunto import di `useIsMobile` e `SellerDashboardMobile`
- Se mobile, renderizza `SellerDashboardMobile`
- Desktop dashboard rimane invariata

### `App.tsx`
- Aggiunta route `/seller/more` per il menu "Altro"

### `index.html`
- Aggiornato viewport meta tag con `viewport-fit=cover` per supporto safe area

### CSS
- Creato `mobile-safe-area.css` per utility classes safe area
- Creato `SellerMobileLayout.css` per stili layout mobile
- Creato `SellerDashboardMobile.css` per stili dashboard mobile

## Design Language iOS

### Typography
- **Large Title:** `text-3xl font-bold` per titoli principali
- **Body:** `text-base` per testo normale
- **Caption:** `text-sm text-gray-500` per didascalie

### Cards
- Background bianco (`bg-white`) o grigio scuro in dark mode
- Border radius grande (`rounded-2xl`)
- Shadow sottile (`shadow-sm`)
- Border sottile per separazione

### Colors
- KPI Tiles con colori distinti:
  - Giallo: Preventivi
  - Verde: Contratti
  - Rosso: Lead urgenti
  - Blu: Fatturato

### Interactions
- Active state: `active:scale-95` o `active:scale-98`
- Tap highlight: `-webkit-tap-highlight-color: transparent`
- Transitions: `transition-transform` per feedback immediato

### Spacing
- Padding principale: `px-6`
- Gap tra elementi: `space-y-3` o `space-y-4`
- Margin bottom sezioni: `mb-6`

## Safe Area Support

Il layout supporta le safe area di iOS per dispositivi con notch e home indicator:

- `env(safe-area-inset-top)` - Top padding
- `env(safe-area-inset-bottom)` - Bottom padding (per bottom nav)
- `env(safe-area-inset-left)` - Left padding
- `env(safe-area-inset-right)` - Right padding

## Pattern Implementati

### 1. Bottom Navigation
- Fissa in basso con safe area
- 5 tab principali
- Badge per notifiche
- Active state con colore blu

### 2. Bottom Sheet
- Si apre dal basso
- Drag to dismiss
- Snap points configurabili
- Overlay con blur

### 3. Pull to Refresh
- Trascina verso il basso per aggiornare
- Indicatore visivo
- Animazione di refresh

### 4. Skeleton Loading
- Placeholder durante caricamento
- Animazione pulse
- Tipi diversi per contesti diversi

### 5. Card-Based Lists
- Liste trasformate in card
- Tap per aprire dettaglio
- Swipe actions (da implementare)

## Prossimi Passi

### Funzionalità da Implementare

1. **Lista Contatti Mobile**
   - Trasformare tabella in lista stile WhatsApp
   - Swipe actions (chiama, email)
   - Ricerca ottimizzata

2. **Agenda Mobile**
   - Vista giornaliera invece di settimanale
   - Lista cronologica verticale
   - Creazione rapida eventi

3. **Preventivi Mobile**
   - Card view invece di tabella
   - Quick actions
   - Filtri in bottom sheet

4. **Wizard Preventivo Mobile**
   - Step indicator migliorato
   - Form ottimizzati per mobile
   - Salvataggio automatico più frequente

5. **Input Ottimizzati**
   - `type="tel"` per telefoni
   - `type="email"` per email
   - `type="number"` per numeri
   - Keyboard type appropriato

## Testing

### Device da Testare
- iPhone (varie dimensioni, con e senza notch)
- iPad (tablet mode)
- Android (varie dimensioni)

### Funzionalità da Testare
- Bottom navigation switching
- Bottom sheet drag
- Pull to refresh
- Safe area su device con notch
- Dark mode
- Transizioni e animazioni

## Note Tecniche

- Il breakpoint mobile è **768px**
- Utilizza **Tailwind CSS** per styling
- **Lucide Icons** per icone
- Supporto **dark mode** completo
- **TypeScript** per type safety

## Performance

- Lazy loading dei componenti mobile
- Skeleton loading per percezione velocità
- Transizioni hardware-accelerated
- Debounce su resize listener
