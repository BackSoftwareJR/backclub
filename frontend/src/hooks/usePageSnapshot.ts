import { useCallback } from 'react';

/**
 * usePageSnapshot
 *
 * Extracts a human-readable text snapshot of what is currently visible on the
 * screen. Used to give the AI real context about what the user sees, beyond
 * just the URL.
 *
 * Data is collected from:
 * 1. [data-ai-context] attributes  — explicit hints from components
 * 2. Key visible text in headings, inputs, textareas
 * 3. Window selection (highlighted text)
 * 4. Active element placeholder/value
 */

export interface PageSnapshot {
  /** Concatenated context from [data-ai-context] attributes */
  contextAttrs: string;
  /** Current window.getSelection() text */
  selectedText: string;
  /** Active element description */
  activeElement: { tag: string; id: string; name: string; placeholder: string; value: string };
  /** Visible h1/h2/h3 headings */
  headings: string[];
  /** Status chips / badges visible */
  statusChips: string[];
  /** Visible input/textarea labels + values */
  formFields: Array<{ label: string; value: string }>;
  /** Full text summary (ready to pass to AI) */
  summary: string;
}

function getText(el: Element): string {
  return (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 400);
}

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < window.innerHeight &&
    rect.bottom > 0
  );
}

export function usePageSnapshot() {
  const capture = useCallback((): PageSnapshot => {
    // ── 1. [data-ai-context] attributes ──────────────────────────────────────
    const ctxEls = Array.from(document.querySelectorAll('[data-ai-context]'));
    const contextAttrs = ctxEls
      .filter(isVisible)
      .map((el) => el.getAttribute('data-ai-context') || getText(el))
      .filter(Boolean)
      .join(' | ');

    // ── 2. Selected text ──────────────────────────────────────────────────────
    const selectedText = window.getSelection()?.toString().trim().slice(0, 600) ?? '';

    // ── 3. Active element ─────────────────────────────────────────────────────
    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const activeElement = {
      tag:         active?.tagName?.toLowerCase() ?? '',
      id:          active?.id ?? '',
      name:        (active as HTMLInputElement)?.name ?? '',
      placeholder: (active as HTMLInputElement)?.placeholder ?? '',
      value:       active && 'value' in active ? String(active.value).slice(0, 200) : '',
    };

    // ── 4. Visible headings ───────────────────────────────────────────────────
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, [data-ai-heading]'))
      .filter(isVisible)
      .map(getText)
      .filter(Boolean)
      .slice(0, 6);

    // ── 5. Status chips ───────────────────────────────────────────────────────
    const statusChips = Array.from(
      document.querySelectorAll('[data-ai-status], .status-chip, [class*="status-badge"]')
    )
      .filter(isVisible)
      .map(getText)
      .filter(Boolean)
      .slice(0, 4);

    // ── 6. Form fields ────────────────────────────────────────────────────────
    const formFields: Array<{ label: string; value: string }> = [];
    document.querySelectorAll('input:not([type=hidden]):not([type=password]), textarea').forEach((el) => {
      if (!isVisible(el)) return;
      const inp = el as HTMLInputElement;
      const label =
        (inp.labels?.[0]?.textContent?.trim()) ||
        inp.placeholder ||
        inp.name ||
        inp.id ||
        '';
      const value = String(inp.value ?? '').slice(0, 120);
      if (label || value) {
        formFields.push({ label: label.slice(0, 60), value });
      }
    });

    // ── 7. Build text summary ─────────────────────────────────────────────────
    const parts: string[] = [];
    if (headings.length)       parts.push(`Titoli visibili: ${headings.join(', ')}`);
    if (statusChips.length)    parts.push(`Stato: ${statusChips.join(', ')}`);
    if (contextAttrs)          parts.push(`Contesto pagina: ${contextAttrs}`);
    if (selectedText)          parts.push(`Testo selezionato dall'utente: "${selectedText}"`);
    if (activeElement.tag)     parts.push(
      `Campo attivo: <${activeElement.tag}>${activeElement.placeholder ? ` placeholder="${activeElement.placeholder}"` : ''}` +
      (activeElement.value ? ` valore="${activeElement.value}"` : '')
    );
    if (formFields.length > 0) {
      const fieldSummary = formFields
        .filter((f) => f.value)
        .map((f) => `${f.label}: "${f.value}"`)
        .join(', ');
      if (fieldSummary) parts.push(`Campi compilati: ${fieldSummary}`);
    }

    return {
      contextAttrs,
      selectedText,
      activeElement,
      headings,
      statusChips,
      formFields,
      summary: parts.join('\n'),
    };
  }, []);

  return { capture };
}
