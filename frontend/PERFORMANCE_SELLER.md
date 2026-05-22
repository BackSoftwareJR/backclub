# Cache venditori: dati istantanei e ben gestiti

## Strategia

- **Stale-while-revalidate**: mostriamo subito i dati in cache (se presenti) e aggiorniamo in background.
- **TTL differenziati**: dashboard 30s, liste 1.5 min, commissioni 2 min, listino 3 min, dettagli 2 min.
- **Invalidazione su mutate**: dopo create/update/delete invalidiamo la cache relativa così il refetch porta dati freschi.
- **Cache dettagli** (client, lead, quote, contract) per back-navigation istantanea.
- **Logout**: `sellerCache.invalidateAll()` svuota tutta la cache.

## Cosa è in cache

| Risorsa | Chiave | TTL | Invalida quando |
|--------|--------|-----|-----------------|
| Dashboard | `seller:dashboard:{sellerId}:{period}` | 30s | - |
| Contatti/Leads | `seller:leads:{sellerId}:{status}:{priority}` | 1.5 min | Crea/aggiorna/rifiuta lead |
| Preventivi | `seller:quotes:{sellerId}:{status}` | 1.5 min | Crea/elimina/duplica/richiesta contratto |
| Contratti | `seller:contracts:{sellerId}:{status}` | 1.5 min | - |
| Clienti | `seller:clients:{sellerId}` | 1.5 min | Crea cliente |
| Commissioni | `seller:commissions:{sellerId}` | 2 min | - |
| Listino | `seller:priceList:{dept}:{status}` | 3 min | - |
| Dettaglio cliente | `seller:detail:client:{id}` | 2 min | - |
| Dettaglio lead | `seller:detail:lead:{id}` | 2 min | Cambio stato lead |
| Dettaglio preventivo | `seller:detail:quote:{id}` | 2 min | Elimina/richiesta contratto |
| Dettaglio contratto | `seller:detail:contract:{id}` | 2 min | - |

## API (`src/utils/sellerCache.ts`)

- `sellerCache.dashboard.get/set(sellerId, period)`
- `sellerCache.leads.get/set(sellerId, status, priority)` + `invalidate(sellerId)`
- `sellerCache.quotes.get/set(sellerId, status)` + `invalidate(sellerId)`
- `sellerCache.contracts.get/set(sellerId, status)` + `invalidate(sellerId)`
- `sellerCache.clients.get/set(sellerId)` + `invalidate(sellerId)`
- `sellerCache.commissions.get/set(sellerId)` + `invalidate(sellerId)`
- `sellerCache.priceList.get/set(deptFilter, statusFilter)` + `invalidate()`
- `sellerCache.detail.client/lead/quote/contract.get/set(id)` + `invalidate(id?)`
- `sellerCache.invalidateAll()` (chiamato al logout)

## Perché i caricamenti erano lenti

1. **Nessuna cache**: ogni navigazione = nuova richiesta HTTP + attesa.
2. **Round-trip**: RTT + tempo backend (0.5–2+ secondi a pagina).
3. **Nessun prefetch**: dati successivi mai caricati in anticipo.

Con la cache, il ritorno a una pagina già visitata (entro il TTL) è **istantaneo**; il refetch in background aggiorna i dati senza bloccare l’UI.
