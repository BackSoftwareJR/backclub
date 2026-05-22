/**
 * API per traduzione automatica di testi provenienti dal backend.
 * Il backend deve esporre POST /api/translate (vedi TranslateController).
 * Se non configurato, l'endpoint può restituire il testo originale.
 */

import apiClient from './client';

export interface TranslateRequest {
  text: string;
  target_lang: string; // it, en, es, fr
  source_lang?: string; // opzionale, default auto-detect o 'it'
}

export interface TranslateResponse {
  translated_text: string;
  source_lang?: string;
  target_lang: string;
}

const CACHE_KEY_PREFIX = 'bc_translate_';
const CACHE_MAX_ENTRIES = 200;

function cacheKey(text: string, targetLang: string): string {
  return `${CACHE_KEY_PREFIX}${targetLang}_${text.length}_${hashCode(text)}`;
}

function hashCode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

const memoryCache = new Map<string, string>();

function getCached(key: string): string | null {
  return memoryCache.get(key) ?? null;
}

function setCached(key: string, value: string): void {
  if (memoryCache.size >= CACHE_MAX_ENTRIES) {
    const first = memoryCache.keys().next().value;
    if (first) memoryCache.delete(first);
  }
  memoryCache.set(key, value);
}

export const translateApi = {
  /**
   * Traduce un testo nella lingua richiesta.
   * Usa cache in memoria per evitare richieste ripetute nella stessa sessione.
   * Se l'API non è configurata o fallisce, restituisce il testo originale.
   */
  async translate(
    text: string,
    targetLang: string,
    sourceLang?: string
  ): Promise<string> {
    if (!text?.trim()) return text || '';
    const key = cacheKey(text, targetLang);
    const cached = getCached(key);
    if (cached != null) return cached;

    try {
      const { data } = await apiClient.post<TranslateResponse>('/translate', {
        text: text.trim(),
        target_lang: targetLang,
        source_lang: sourceLang,
      });
      const result = data?.translated_text ?? text;
      setCached(key, result);
      return result;
    } catch (err) {
      console.warn('Translation API unavailable or error:', err);
      return text;
    }
  },
};

export default translateApi;
