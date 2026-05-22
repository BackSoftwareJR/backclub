/**
 * Hook per mostrare contenuti dal backend nella lingua corrente.
 * - Se il contenuto è un oggetto con chiavi lingua (es. { it, en, es, fr }), usa quella.
 * - Se è una stringa e la lingua corrente non è la stessa del contenuto, opzionalmente
 *   chiama l'API di traduzione (backend con Google Translate o altro).
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLocalizedContent,
  getLocalizedField,
  type LocalizedString,
  type SupportedLocale,
} from '../utils/translatedContent';
import { translateApi } from '../api/translate';

type ContentInput =
  | string
  | LocalizedString
  | null
  | undefined;

interface UseTranslatedContentOptions {
  /** Se true e il contenuto è una stringa, chiama l'API di traduzione quando la lingua UI ≠ italiano. Default true. */
  useAutoTranslate?: boolean;
  /** Lingua presunta del contenuto quando è una stringa. Default 'it'. */
  sourceLang?: SupportedLocale;
}

/**
 * Restituisce il testo nella lingua corrente.
 * - content come oggetto { it, en, es, fr }: usa la chiave della lingua corrente (sincrono).
 * - content come stringa: se useAutoTranslate e lingua corrente !== sourceLang, chiama l'API e aggiorna (async).
 */
export function useTranslatedContent(
  content: ContentInput,
  options: UseTranslatedContentOptions = {}
): string {
  const { i18n } = useTranslation();
  const { useAutoTranslate = true, sourceLang = 'it' } = options;
  const locale = (i18n.language || 'it').split('-')[0] as SupportedLocale;
  const [autoTranslated, setAutoTranslated] = useState<string | null>(null);

  const isString = typeof content === 'string';
  const shouldTranslate =
    isString &&
    useAutoTranslate &&
    locale !== sourceLang &&
    !!content?.trim();

  useEffect(() => {
    if (!shouldTranslate || !content || typeof content !== 'string') return;
    translateApi.translate(content, locale, sourceLang).then(setAutoTranslated);
  }, [content, locale, sourceLang, shouldTranslate]);

  if (content == null) return '';
  if (!isString) {
    return getLocalizedContent(content as LocalizedString, locale, 'it');
  }
  if (locale === sourceLang || !useAutoTranslate) return content;
  return autoTranslated ?? content;
}

/**
 * Helper per un singolo campo localizzato su un oggetto (es. da API).
 * Usa title_it, title_en, ... oppure title: { it, en, ... }. Non chiama l'API di traduzione.
 */
export function useLocalizedField<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  field: string
): string {
  const { i18n } = useTranslation();
  const locale = (i18n.language || 'it').split('-')[0];
  if (obj == null) return '';
  return getLocalizedField(obj, field, locale, 'it');
}
