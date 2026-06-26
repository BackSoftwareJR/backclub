import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { taskDetailAiApi, type RoadmapStep } from '../../../../api/taskDetailAi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PersonalItem {
  id: string;
  text: string;
  done: boolean;
  color: string;
}

type TabId = 'ai' | 'personal';

interface ChecklistWidgetProps {
  projectId: number;
  taskId: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLOR_OPTS = [
  { key: 'blue',   hex: '#0A84FF' },
  { key: 'green',  hex: '#34C759' },
  { key: 'orange', hex: '#FF9500' },
  { key: 'red',    hex: '#FF3B30' },
  { key: 'purple', hex: '#BF5AF2' },
  { key: 'teal',   hex: '#5AC8FA' },
];

const EFFORT_CFG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Facile',  color: '#34C759' },
  medium: { label: 'Medio',   color: '#FF9500' },
  high:   { label: 'Intenso', color: '#FF3B30' },
};

const storageKey = (taskId: number) => `bento_checklist_${taskId}`;

// ─── Component ───────────────────────────────────────────────────────────────

const ChecklistWidget: React.FC<ChecklistWidgetProps> = ({ projectId, taskId }) => {
  const [tab, setTab] = useState<TabId>('ai');

  // AI state
  const [aiSteps, setAiSteps] = useState<(RoadmapStep & { done: boolean })[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  // Personal state
  const [items, setItems] = useState<PersonalItem[]>([]);
  const [newText, setNewText] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load personal from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(taskId));
      if (raw) setItems(JSON.parse(raw) as PersonalItem[]);
    } catch {
      /* ignore */
    }
  }, [taskId]);

  const persistItems = (next: PersonalItem[]) => {
    setItems(next);
    localStorage.setItem(storageKey(taskId), JSON.stringify(next));
  };

  // Lazy-load AI steps on first AI tab visit
  useEffect(() => {
    if (tab !== 'ai' || aiLoaded) return;
    setAiLoading(true);
    taskDetailAiApi
      .getBrief(projectId, taskId)
      .then((res) => {
        const steps = (res.data?.steps ?? res.data?.roadmap ?? []) as RoadmapStep[];
        setAiSteps(steps.map((s) => ({ ...s, done: false })));
        setAiLoaded(true);
      })
      .catch(() => setAiLoaded(true))
      .finally(() => setAiLoading(false));
  }, [tab, aiLoaded, projectId, taskId]);

  // Counts / progress
  const aiDone = aiSteps.filter((s) => s.done).length;
  const persDone = items.filter((i) => i.done).length;
  const listLen = tab === 'ai' ? aiSteps.length : items.length;
  const done = tab === 'ai' ? aiDone : persDone;
  const pct = listLen > 0 ? Math.round((done / listLen) * 100) : 0;

  // Handlers
  const toggleAi = (step: number) =>
    setAiSteps((prev) => prev.map((s) => s.step === step ? { ...s, done: !s.done } : s));

  const togglePersonal = (id: string) =>
    persistItems(items.map((i) => i.id === id ? { ...i, done: !i.done } : i));

  const addPersonal = () => {
    if (!newText.trim()) return;
    const next = [
      ...items,
      { id: `${Date.now()}`, text: newText.trim(), done: false, color: newColor },
    ];
    persistItems(next);
    setNewText('');
  };

  const removePersonal = (id: string) =>
    persistItems(items.filter((i) => i.id !== id));

  return (
    <div className="flex flex-col h-full">
      {/* ── Tabs ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 10px 6px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}
      >
        {(['ai', 'personal'] as TabId[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              fontSize: 10,
              padding: '3px 9px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              background: tab === t
                ? t === 'ai' ? 'rgba(10,132,255,0.18)' : 'rgba(52,199,89,0.15)'
                : 'transparent',
              color: tab === t
                ? t === 'ai' ? '#0A84FF' : '#34C759'
                : 'rgba(255,255,255,0.3)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {t === 'ai' ? <Sparkles size={9} /> : <span>✏️</span>}
            {t === 'ai' ? 'AI Roadmap' : 'Personale'}
          </button>
        ))}

        {/* Progress summary */}
        {listLen > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 48,
              height: 3,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.07)',
              overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: pct === 100 ? '#34C759' : tab === 'ai' ? '#0A84FF' : '#34C759',
                }}
              />
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', minWidth: 24 }}>
              {done}/{listLen}
            </span>
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '4px 0' }}>
        {/* AI tab */}
        {tab === 'ai' && (
          <>
            {aiLoading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: 6, color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                Caricamento roadmap AI...
              </div>
            )}
            <AnimatePresence>
              {aiSteps.map((step) => {
                const eff = EFFORT_CFG[step.effort] ?? EFFORT_CFG.medium;
                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '5px 10px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {/* Step number + checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleAi(step.step)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `1.5px solid ${step.done ? '#34C759' : 'rgba(255,255,255,0.18)'}`,
                        background: step.done ? 'rgba(52,199,89,0.18)' : 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginTop: 1,
                        transition: 'all 0.2s',
                        color: step.done ? '#34C759' : 'rgba(255,255,255,0.3)',
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    >
                      {step.done ? <CheckCircle2 size={11} /> : step.step}
                    </button>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: step.done ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
                        textDecoration: step.done ? 'line-through' : 'none',
                        display: 'block',
                        lineHeight: 1.4,
                      }}>
                        {step.action}
                      </span>
                      {step.why && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', lineHeight: 1.3, display: 'block' }}>
                          {step.why}
                        </span>
                      )}
                    </div>

                    {/* Effort badge */}
                    <span style={{
                      fontSize: 9,
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: `${eff.color}15`,
                      color: eff.color,
                      border: `1px solid ${eff.color}25`,
                      flexShrink: 0,
                      alignSelf: 'center',
                      whiteSpace: 'nowrap',
                    }}>
                      {eff.label}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {aiLoaded && aiSteps.length === 0 && !aiLoading && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                Nessun roadmap disponibile
              </div>
            )}
          </>
        )}

        {/* Personal tab */}
        {tab === 'personal' && (
          <AnimatePresence>
            {items.map((item) => {
              const colorHex = COLOR_OPTS.find((c) => c.key === item.color)?.hex ?? '#0A84FF';
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4, height: 0, padding: 0 }}
                  className="group"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Color dot */}
                  <div style={{
                    width: 3,
                    height: 20,
                    borderRadius: 2,
                    background: colorHex,
                    flexShrink: 0,
                    opacity: item.done ? 0.3 : 0.8,
                  }} />

                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => togglePersonal(item.id)}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1.5px solid ${item.done ? colorHex : 'rgba(255,255,255,0.18)'}`,
                      background: item.done ? `${colorHex}22` : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.18s',
                    }}
                  >
                    {item.done && <CheckCircle2 size={9} color={colorHex} />}
                  </button>

                  {/* Text */}
                  <span style={{
                    flex: 1,
                    fontSize: 11,
                    color: item.done ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.82)',
                    textDecoration: item.done ? 'line-through' : 'none',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.text}
                  </span>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removePersonal(item.id)}
                    className="opacity-0 group-hover:opacity-100"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(255,59,48,0.5)',
                      padding: 2,
                      display: 'flex',
                      flexShrink: 0,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Add personal item ── */}
      {tab === 'personal' && (
        <div
          style={{
            padding: '7px 10px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          {/* Color picker row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginRight: 2 }}>Colore:</span>
            {COLOR_OPTS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setNewColor(c.key)}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: c.hex,
                  border: newColor === c.key
                    ? `2px solid rgba(255,255,255,0.7)`
                    : `2px solid transparent`,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.12s',
                  boxShadow: newColor === c.key ? `0 0 0 1px ${c.hex}` : 'none',
                }}
              />
            ))}
          </div>

          {/* Input + add */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              ref={inputRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPersonal()}
              placeholder="Nuova voce checklist..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 7,
                padding: '5px 9px',
                fontSize: 11,
                color: 'rgba(255,255,255,0.85)',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(10,132,255,0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
            <button
              type="button"
              onClick={addPersonal}
              disabled={!newText.trim()}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: newText.trim() ? '#0A84FF' : 'rgba(255,255,255,0.06)',
                border: 'none',
                color: newText.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                cursor: newText.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistWidget;
