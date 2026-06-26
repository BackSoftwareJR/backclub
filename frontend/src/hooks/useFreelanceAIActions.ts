import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AIAction } from '../stores/useFreelanceAIStore';

// ─── Native value setter (bypasses React's synthetic event guard) ─────────────

function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  descriptor?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── Highlight overlay ────────────────────────────────────────────────────────

function highlightElement(selector: string, durationMs = 2200) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top - 4}px;
    left: ${rect.left - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    border: 2px solid rgba(94,92,230,0.9);
    border-radius: 10px;
    box-shadow: 0 0 0 4px rgba(94,92,230,0.25), 0 0 20px rgba(94,92,230,0.3);
    pointer-events: none;
    z-index: 99995;
    animation: bca-highlight-pulse 0.6s ease-in-out infinite alternate;
  `;
  document.body.appendChild(overlay);

  const style = document.getElementById('bca-highlight-style');
  if (!style) {
    const s = document.createElement('style');
    s.id = 'bca-highlight-style';
    s.textContent = `@keyframes bca-highlight-pulse { from { opacity:1; box-shadow:0 0 0 4px rgba(94,92,230,0.25), 0 0 20px rgba(94,92,230,0.3); } to { opacity:0.6; box-shadow:0 0 0 8px rgba(94,92,230,0.1), 0 0 30px rgba(94,92,230,0.5); } }`;
    document.head.appendChild(s);
  }

  return { el, overlay, rect, cleanup: () => overlay.remove(), durationMs };
}

// ─── Fill the currently focused input / textarea ──────────────────────────────

function fillActive(text: string): boolean {
  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (active && ('value' in active) && !active.readOnly && !active.disabled) {
    setNativeInputValue(active, text);
    active.focus();
    return true;
  }
  // Fallback: find the first visible textarea on the page
  const textarea = document.querySelector<HTMLTextAreaElement>(
    'textarea:not([disabled]):not([readonly])'
  );
  if (textarea) {
    setNativeInputValue(textarea, text);
    textarea.focus();
    return true;
  }
  return false;
}

// ─── Get element center coordinates ──────────────────────────────────────────

export function getElementCenter(selector: string): { x: number; y: number } | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface ExecuteOptions {
  onCursorMove?: (x: number, y: number) => void;
  onCursorClick?: (x: number, y: number) => void;
}

export function useFreelanceAIActions() {
  const navigate = useNavigate();

  const execute = useCallback(
    async (actions: AIAction[], opts: ExecuteOptions = {}) => {
      for (const action of actions) {
        const delayMs = action.delay ?? 700;
        await new Promise((r) => setTimeout(r, delayMs));

        switch (action.type) {
          case 'navigate': {
            // Animate cursor to the nav link if it exists
            const navLink = document.querySelector<HTMLElement>(`a[href="${action.path}"]`);
            if (navLink) {
              const rect = navLink.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              opts.onCursorMove?.(cx, cy);
              await new Promise((r) => setTimeout(r, 400));
              opts.onCursorClick?.(cx, cy);
              await new Promise((r) => setTimeout(r, 250));
            }
            navigate(action.path);
            break;
          }

          case 'fill_active': {
            // Animate cursor to active element
            const active = document.activeElement as HTMLElement | null;
            if (active) {
              const rect = active.getBoundingClientRect();
              opts.onCursorMove?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
              await new Promise((r) => setTimeout(r, 400));
            }
            fillActive(action.text);
            break;
          }

          case 'fill_element': {
            const target = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(action.selector);
            if (target) {
              const rect = target.getBoundingClientRect();
              opts.onCursorMove?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
              await new Promise((r) => setTimeout(r, 500));
              opts.onCursorClick?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
              await new Promise((r) => setTimeout(r, 200));
              setNativeInputValue(target, action.text);
              target.focus();
            }
            break;
          }

          case 'highlight': {
            const result = highlightElement(action.selector);
            if (result) {
              const { rect, cleanup } = result;
              opts.onCursorMove?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
              await new Promise((r) => setTimeout(r, result.durationMs));
              cleanup();
            }
            break;
          }

          case 'scroll_to': {
            const el = document.querySelector(action.selector);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const rect = el.getBoundingClientRect();
              opts.onCursorMove?.(rect.left + rect.width / 2, window.innerHeight / 2);
            }
            break;
          }

          case 'click': {
            const el = document.querySelector<HTMLElement>(action.selector);
            if (el) {
              const rect = el.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              opts.onCursorMove?.(cx, cy);
              await new Promise((r) => setTimeout(r, 450));
              opts.onCursorClick?.(cx, cy);
              await new Promise((r) => setTimeout(r, 150));
              el.click();
            }
            break;
          }

          case 'speak': {
            if ('speechSynthesis' in window) {
              const utt = new SpeechSynthesisUtterance(action.text);
              utt.lang = 'it-IT';
              utt.rate = 1.05;
              window.speechSynthesis.speak(utt);
            }
            break;
          }
        }
      }
    },
    [navigate],
  );

  return { execute };
}
