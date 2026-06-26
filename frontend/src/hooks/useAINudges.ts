import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useFreelanceAIStore } from '../stores/useFreelanceAIStore';
import { apiClient } from '../api/client';

export interface AINudge {
  id:       string;
  icon:     string;
  message:  string;
  cta?:     string;
  action?:  () => void;
  color:    string;    // CSS color for the accent
  priority: 'low' | 'medium' | 'high';
  ttl:      number;   // auto-dismiss ms (0 = manual only)
}

const DWELL_THRESHOLD_MS = 90_000;   // 90s on same page → offer help
const CHECK_INTERVAL_MS  =  15_000;  // evaluate nudges every 15s
const MAX_SIMULTANEOUS   = 2;

// Track dismissed ids in memory (per session)
const dismissed = new Set<string>();

export function useAINudges() {
  const [nudges, setNudges] = useState<AINudge[]>([]);
  const location            = useLocation();
  const aiStore             = useFreelanceAIStore();
  const dwellStart          = useRef(Date.now());
  const dwellFired          = useRef(false);
  const prevPath            = useRef(location.pathname);

  // ── Reset dwell timer on navigation ──────────────────────────────────────

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      dwellStart.current  = Date.now();
      dwellFired.current  = false;
      prevPath.current    = location.pathname;
    }
  }, [location.pathname]);

  // ── Helper: add a nudge (de-duplicate, respect cap) ──────────────────────

  const push = useCallback((nudge: AINudge) => {
    if (dismissed.has(nudge.id)) return;
    setNudges((prev) => {
      if (prev.find((n) => n.id === nudge.id)) return prev;
      const next = [...prev, nudge].slice(-MAX_SIMULTANEOUS);
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissed.add(id);
    setNudges((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Rule engine: runs on interval ────────────────────────────────────────

  useEffect(() => {
    const evaluate = async () => {
      const path    = location.pathname;
      const dwellMs = Date.now() - dwellStart.current;

      // ── Rule 1: Dwell nudge ─────────────────────────────────────────────
      if (dwellMs > DWELL_THRESHOLD_MS && !dwellFired.current && !aiStore.isOpen) {
        dwellFired.current = true;
        const section =
          path.includes('/task/')  ? 'questa task'      :
          path.includes('/focus')  ? 'la sezione Focus' :
          path.includes('/chat')   ? 'la chat'          :
          'questa pagina';
        push({
          id:       `dwell-${path}`,
          icon:     '💡',
          message:  `Sei su ${section} da un po'. Posso aiutarti?`,
          cta:      'Chiedi all\'AI',
          action:   () => aiStore.open(),
          color:    '#5e5ce6',
          priority: 'low',
          ttl:      12_000,
        });
      }

      // ── Rule 2: Overdue tasks (only on dashboard / task list) ───────────
      if (
        (path === '/freelance' || path === '/freelance/task') &&
        !dismissed.has('overdue-check')
      ) {
        try {
          const res = await apiClient.get<{ data?: { total?: number }; total?: number }>('/freelance/tasks?status=overdue&per_page=1');
          const count = res.data?.data?.total ?? res.data?.total ?? 0;
          if (count > 0) {
            push({
              id:       'overdue-tasks',
              icon:     '⚠️',
              message:  `Hai ${count} task scadut${count === 1 ? 'a' : 'e'}`,
              cta:      'Gestiscile',
              action:   () => aiStore.open('Ho task scadute, cosa dovrei fare?'),
              color:    '#ff9f0a',
              priority: 'high',
              ttl:      0,
            });
            dismissed.add('overdue-check'); // only check once per session
          }
        } catch { /* silent */ }
      }

      // ── Rule 3: Task delivery nudge (on task detail) ────────────────────
      const taskMatch = path.match(/\/freelance\/task\/(\d+)/);
      if (taskMatch) {
        const statusEl = document.querySelector('[data-task-status]');
        const status   = statusEl?.getAttribute('data-task-status') ?? '';
        if (status === 'in_progress' && !dismissed.has(`deliver-nudge-${taskMatch[1]}`)) {
          // Only fire after 3 min on the task detail page
          if (dwellMs > 180_000) {
            push({
              id:       `deliver-nudge-${taskMatch[1]}`,
              icon:     '🚀',
              message:  'Stai lavorando a questa task. Pronto a consegnarla?',
              cta:      'Consegna ora',
              color:    '#30d158',
              priority: 'medium',
              ttl:      15_000,
            });
          }
        }
      }
    };

    const interval = setInterval(evaluate, CHECK_INTERVAL_MS);
    // Run once immediately
    evaluate();
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return { nudges, dismiss };
}
