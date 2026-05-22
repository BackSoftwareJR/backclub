/**
 * Utilities for content that can come in multiple languages (from backend or static data).
 * Supports two patterns:
 * 1) Object with locale keys: { it: "Testo", en: "Text", es: "...", fr: "..." }
 * 2) Suffixed fields: { title_it, title_en, title_es, title_fr }
 */

export const SUPPORTED_LOCALES = ['it', 'en', 'es', 'fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Content stored per locale (e.g. from API) */
export type LocalizedString = Partial<Record<SupportedLocale, string>>;

/**
 * Get the best available text for a locale from an object.
 * - If the value is a LocalizedString (e.g. { it: "...", en: "..." }), returns the key for locale or fallback.
 * - If the value is a plain string, returns it as-is.
 */
export function getLocalizedContent(
  value: LocalizedString | string | null | undefined,
  locale: string,
  fallbackLocale: SupportedLocale = 'it'
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const loc = locale.split('-')[0] as SupportedLocale;
  return (
    value[loc] ||
    value[fallbackLocale] ||
    value.en ||
    value.it ||
    Object.values(value)[0] ||
    ''
  );
}

/**
 * Get a field from an object that may have localized variants.
 * Supports:
 * - obj.title_it, obj.title_en, ... (suffix pattern)
 * - obj.title = { it: "...", en: "..." } (nested object)
 * - obj.title = "single string"
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  field: string,
  locale: string,
  fallbackLocale: SupportedLocale = 'it'
): string {
  if (obj == null) return '';
  const loc = locale.split('-')[0];
  const suffixed = obj[`${field}_${loc}`];
  if (typeof suffixed === 'string') return suffixed;
  const fallbackSuffixed = obj[`${field}_${fallbackLocale}`];
  if (typeof fallbackSuffixed === 'string') return fallbackSuffixed;
  const raw = obj[field];
  return getLocalizedContent(
    raw as LocalizedString | string | null | undefined,
    locale,
    fallbackLocale
  );
}
