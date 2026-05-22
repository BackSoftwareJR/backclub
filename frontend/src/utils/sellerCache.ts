/**
 * Cache venditori: dati istantanei e ben gestiti
 *
 * Strategia:
 * - Stale-while-revalidate: mostriamo subito i dati in cache (se presenti) e aggiorniamo in background.
 * - TTL differenziati: dashboard/statistiche più corti, liste più lunghe, dettagli medi.
 * - Invalidazione su mutate: dopo create/update/delete invalidiamo la cache relativa così il refetch porta dati freschi.
 * - Cache dettagli (client, lead, quote, contract) per back-navigation istantanea.
 *
 * Chiavi: seller:<tipo>:<...> per liste, seller:detail:<tipo>:<id> per dettagli.
 */

const CACHE = new Map<string, { data: unknown; expiresAt: number }>();

const TTL = {
  /** Statistiche che cambiano spesso */
  dashboard: 30_000,       // 30s
  /** Liste principali */
  list: 90_000,            // 1.5 min (leads, quotes, contracts, clients)
  /** Commissioni e listino cambiano meno spesso */
  commissions: 120_000,    // 2 min
  priceList: 180_000,      // 3 min
  /** Dettaglio singola risorsa: 2 min per back-navigation fluida */
  detail: 120_000,
} as const;

function key(parts: (string | number)[]): string {
  return ['seller', ...parts].join(':');
}

function get<T>(k: string): T | null {
  const entry = CACHE.get(k);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(k);
    return null;
  }
  return entry.data as T;
}

function set(k: string, data: unknown, ttlMs: number): void {
  CACHE.set(k, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/** Elimina tutte le chiavi che iniziano con prefix */
function invalidatePrefix(prefix: string): void {
  for (const k of CACHE.keys()) {
    if (k.startsWith(prefix)) CACHE.delete(k);
  }
}

// --- Dashboard ---
export const dashboardCache = {
  get: <T>(sellerId: number, period: string): T | null =>
    get<T>(key(['dashboard', String(sellerId), period])),
  set: (sellerId: number, period: string, data: unknown) =>
    set(key(['dashboard', String(sellerId), period]), data, TTL.dashboard),
  invalidate: (sellerId: number) =>
    invalidatePrefix(key(['dashboard', String(sellerId)])),
};

// --- Liste ---
export const leadsCache = {
  get: <T>(sellerId: number, status: string, priority: string): T | null =>
    get<T>(key(['leads', String(sellerId), status, priority])),
  set: (sellerId: number, status: string, priority: string, data: unknown) =>
    set(key(['leads', String(sellerId), status, priority]), data, TTL.list),
  invalidate: (sellerId: number) =>
    invalidatePrefix(key(['leads', String(sellerId)])),
};

export const quotesCache = {
  get: <T>(sellerId: number, status: string): T | null =>
    get<T>(key(['quotes', String(sellerId), status])),
  set: (sellerId: number, status: string, data: unknown) =>
    set(key(['quotes', String(sellerId), status]), data, TTL.list),
  invalidate: (sellerId: number) =>
    invalidatePrefix(key(['quotes', String(sellerId)])),
};

export const contractsCache = {
  get: <T>(sellerId: number, status: string): T | null =>
    get<T>(key(['contracts', String(sellerId), status])),
  set: (sellerId: number, status: string, data: unknown) =>
    set(key(['contracts', String(sellerId), status]), data, TTL.list),
  invalidate: (sellerId: number) =>
    invalidatePrefix(key(['contracts', String(sellerId)])),
};

export const clientsCache = {
  get: <T>(sellerId: number): T | null =>
    get<T>(key(['clients', String(sellerId)])),
  set: (sellerId: number, data: unknown) =>
    set(key(['clients', String(sellerId)]), data, TTL.list),
  invalidate: (sellerId: number) =>
    invalidatePrefix(key(['clients', String(sellerId)])),
};

// --- Commissioni (lista + summary) ---
export const commissionsCache = {
  get: <T>(sellerId: number): T | null =>
    get<T>(key(['commissions', String(sellerId)])),
  set: (sellerId: number, data: unknown) =>
    set(key(['commissions', String(sellerId)]), data, TTL.commissions),
  invalidate: (sellerId: number) =>
    invalidatePrefix(key(['commissions', String(sellerId)])),
};

// --- Listino (per dipartimento + status filtro) ---
export const priceListCache = {
  get: <T>(departmentFilter: string, statusFilter: string): T | null =>
    get<T>(key(['priceList', departmentFilter, statusFilter])),
  set: (departmentFilter: string, statusFilter: string, data: unknown) =>
    set(key(['priceList', departmentFilter, statusFilter]), data, TTL.priceList),
  invalidate: () => invalidatePrefix(key(['priceList'])),
};

// --- Dettagli (per back-navigation istantanea) ---
export const detailCache = {
  client: {
    get: <T>(id: number): T | null => get<T>(key(['detail', 'client', String(id)])),
    set: (id: number, data: unknown) =>
      set(key(['detail', 'client', String(id)]), data, TTL.detail),
    invalidate: (id?: number) =>
      id ? CACHE.delete(key(['detail', 'client', String(id)])) : invalidatePrefix(key(['detail', 'client'])),
  },
  lead: {
    get: <T>(id: number): T | null => get<T>(key(['detail', 'lead', String(id)])),
    set: (id: number, data: unknown) =>
      set(key(['detail', 'lead', String(id)]), data, TTL.detail),
    invalidate: (id?: number) =>
      id ? CACHE.delete(key(['detail', 'lead', String(id)])) : invalidatePrefix(key(['detail', 'lead'])),
  },
  quote: {
    get: <T>(id: number): T | null => get<T>(key(['detail', 'quote', String(id)])),
    set: (id: number, data: unknown) =>
      set(key(['detail', 'quote', String(id)]), data, TTL.detail),
    invalidate: (id?: number) =>
      id ? CACHE.delete(key(['detail', 'quote', String(id)])) : invalidatePrefix(key(['detail', 'quote'])),
  },
  contract: {
    get: <T>(id: number): T | null => get<T>(key(['detail', 'contract', String(id)])),
    set: (id: number, data: unknown) =>
      set(key(['detail', 'contract', String(id)]), data, TTL.detail),
    invalidate: (id?: number) =>
      id ? CACHE.delete(key(['detail', 'contract', String(id)])) : invalidatePrefix(key(['detail', 'contract'])),
  },
};

// --- API unificata (retrocompatibile con sellerCache.*) + invalidate ---
export const sellerCache = {
  dashboard: dashboardCache,
  leads: leadsCache,
  quotes: quotesCache,
  contracts: contractsCache,
  clients: clientsCache,
  commissions: commissionsCache,
  priceList: priceListCache,
  detail: detailCache,

  /** Invalida tutta la cache venditori (es. logout). */
  invalidateAll: () => invalidatePrefix('seller:'),
};
