import { useCallback, useRef, useEffect } from 'react';

/**
 * Returns a debounced version of the callback that delays execution until
 * after `delay` ms have elapsed since the last call.
 * Best practice: use for search inputs, resize handlers, etc.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  callbackRef.current = callback;

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (lastArgsRef.current !== null) {
      callbackRef.current(...lastArgsRef.current);
      lastArgsRef.current = null;
    }
  }, []);

  const debounced = useCallback(
    ((...args: Parameters<T>) => {
      lastArgsRef.current = args;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, delay);
    }) as T,
    [delay, flush]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return debounced;
}
