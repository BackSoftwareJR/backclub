import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const MAX_CACHED_VIEWS = 12;

/** Pathnames che hanno senso tenere in cache (viste lista, non dettagli con :id) */
const CACHEABLE_PATH_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /^\/freelance\/?$/, key: '/freelance' },
  { pattern: /^\/freelance\/dashboard\/?$/, key: '/freelance' },
  { pattern: /^\/freelance\/progetti\/?$/, key: '/freelance/progetti' },
  { pattern: /^\/freelance\/task\/?$/, key: '/freelance/task' },
  { pattern: /^\/freelance\/richieste\/?$/, key: '/freelance/richieste' },
  { pattern: /^\/freelance\/chat\/?$/, key: '/freelance/chat' },
  { pattern: /^\/freelance\/calendario\/?$/, key: '/freelance/calendario' },
  { pattern: /^\/freelance\/supporto\/?$/, key: '/freelance/supporto' },
  { pattern: /^\/freelance\/notifiche\/?$/, key: '/freelance/notifiche' },
];

export function getFreelanceCacheKey(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/freelance';
  for (const { pattern, key } of CACHEABLE_PATH_PATTERNS) {
    if (pattern.test(normalized)) return key;
  }
  return null;
}

export interface CachedFreelanceViewsProps {
  /** Per ogni cache key restituisce l’elemento da renderizzare (le pagine sono passate dal Layout). */
  renderView: (cacheKey: string, isActive: boolean) => React.ReactNode;
}

/**
 * Mantiene in cache le viste freelance (keep-alive): le pagine lista restano montate
 * quando navighi altrove, così al ritorno non si ri-montano e non rifanno le chiamate API.
 */
const CachedFreelanceViews: React.FC<CachedFreelanceViewsProps> = ({ renderView }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const currentKey = useMemo(() => getFreelanceCacheKey(pathname), [pathname]);
  const [cachedKeys, setCachedKeys] = useState<string[]>(() => (currentKey ? [currentKey] : []));

  useEffect(() => {
    if (!currentKey) return;
    setCachedKeys((prev) => {
      if (prev.includes(currentKey)) return prev;
      const next = [...prev, currentKey];
      if (next.length > MAX_CACHED_VIEWS) return next.slice(-MAX_CACHED_VIEWS);
      return next;
    });
  }, [currentKey]);

  return (
    <>
      {cachedKeys.map((key) => {
        const isActive = key === currentKey;
        return (
          <div
            key={key}
            data-cached-view={key}
            style={{
              display: isActive ? 'block' : 'none',
              visibility: isActive ? 'visible' : 'hidden',
              position: isActive ? 'relative' : 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              pointerEvents: isActive ? 'auto' : 'none',
              height: isActive ? undefined : 0,
              overflow: isActive ? undefined : 'hidden',
            }}
            aria-hidden={!isActive}
          >
            {renderView(key, isActive)}
          </div>
        );
      })}
    </>
  );
};

export default CachedFreelanceViews;
