/**
 * Cache Freelance: dati istantanei su mobile per UX fluida
 *
 * Strategia:
 * - Stale-while-revalidate: mostra subito i dati in cache (se presenti) e aggiorna in background.
 * - TTL: progetti e task 2 min, dashboard 1 min.
 * - Invalidazione: dopo mutate o cambio contesto (CRM) si invalida la cache relativa.
 *
 * Chiavi: freelance:<tipo>:<userId>:<scope> (scope = '' o crmCode).
 */

const CACHE = new Map<string, { data: unknown; expiresAt: number }>();

const TTL = {
  dashboard: 60_000,   // 1 min
  projects: 120_000,  // 2 min
  tasks: 120_000,     // 2 min
} as const;

function key(parts: (string | number)[]): string {
  return ['freelance', ...parts].join(':');
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

function invalidatePrefix(prefix: string): void {
  for (const k of CACHE.keys()) {
    if (k.startsWith(prefix)) CACHE.delete(k);
  }
}

/** Scope per chiave: '' = globale, altrimenti codice CRM */
function scopeKey(crmCode: string | undefined): string {
  return crmCode ? String(crmCode) : '';
}

// --- Progetti ---
export const projectsCache = {
  get: <T>(userId: number, crmCode?: string): T | null =>
    get<T>(key(['projects', String(userId), scopeKey(crmCode)])),
  set: (userId: number, crmCode: string | undefined, data: unknown) =>
    set(key(['projects', String(userId), scopeKey(crmCode)]), data, TTL.projects),
  invalidate: (userId: number, crmCode?: string) => {
    if (crmCode !== undefined) {
      CACHE.delete(key(['projects', String(userId), scopeKey(crmCode)]));
    } else {
      invalidatePrefix(key(['projects', String(userId)]));
    }
  },
};

// --- Task (lista task + progetti per filtri) ---
export const tasksCache = {
  get: <T>(userId: number, crmCode?: string): T | null =>
    get<T>(key(['tasks', String(userId), scopeKey(crmCode)])),
  set: (userId: number, crmCode: string | undefined, data: unknown) =>
    set(key(['tasks', String(userId), scopeKey(crmCode)]), data, TTL.tasks),
  invalidate: (userId: number, crmCode?: string) => {
    if (crmCode !== undefined) {
      CACHE.delete(key(['tasks', String(userId), scopeKey(crmCode)]));
    } else {
      invalidatePrefix(key(['tasks', String(userId)]));
    }
  },
};

/** Payload della pagina Task: tasks + projects */
export interface TasksPageCachePayload {
  tasks: unknown[];
  projects: unknown[];
}

// --- Dashboard (statistiche / dati iniziali) ---
export const dashboardCache = {
  get: <T>(userId: number): T | null =>
    get<T>(key(['dashboard', String(userId)])),
  set: (userId: number, data: unknown) =>
    set(key(['dashboard', String(userId)]), data, TTL.dashboard),
  invalidate: (userId: number) =>
    CACHE.delete(key(['dashboard', String(userId)])),
};

export const freelanceCache = {
  projects: projectsCache,
  tasks: tasksCache,
  dashboard: dashboardCache,
  invalidateAll: () => invalidatePrefix('freelance:'),
};
