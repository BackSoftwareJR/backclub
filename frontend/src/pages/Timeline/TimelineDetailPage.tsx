import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Edit2, X, Check, Loader2,
  AlertCircle, CheckCircle2, Circle, ChevronDown, ChevronUp, Layers, SlidersHorizontal, Share2, Copy, Unlink, Minus, MoveRight, Undo2,
} from 'lucide-react';
import ContextMenu, { type ContextMenuItem } from '../../components/ContextMenu/ContextMenu';
import {
  timelineApi,
  type Timeline,
  type TimelinePhase,
  type TimelineStep,
  type TimelineChecklistItem,
} from '../../api/timeline';

// ── Constants ──────────────────────────────────────────────
const COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#ef4444',
];

const CANVAS_PAD_L = 80;
const CANVAS_PAD_R = 60;
const AXIS_H = 48;
const LANE_H = 100;
const NODE_R = 13;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_MONTHS_VISIBLE = 0.25;
const MAX_MONTHS_VISIBLE = 6;

// ── Date utils ─────────────────────────────────────────────
function toMs(d: string) { return new Date(d).getTime(); }
function fmt(iso: string | null | undefined, short = false) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', short
    ? { day: '2-digit', month: 'short' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCompletedAt(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `alle ore ${time} del ${date}`;
}

function buildAxisTicks(minMs: number, maxMs: number, totalPx: number): { label: string; x: number }[] {
  const msRange = maxMs - minMs;
  const dayRange = msRange / 86_400_000;
  const ticks: { label: string; x: number }[] = [];

  // Pick a nice interval
  let stepMs: number;
  if (dayRange <= 14) stepMs = 86_400_000 * 1;          // daily
  else if (dayRange <= 60) stepMs = 86_400_000 * 7;     // weekly
  else if (dayRange <= 365) stepMs = 86_400_000 * 30;   // monthly
  else stepMs = 86_400_000 * 90;                        // quarterly

  let cursor = minMs;
  while (cursor <= maxMs + stepMs) {
    const x = CANVAS_PAD_L + ((cursor - minMs) / msRange) * totalPx;
    const d = new Date(cursor);
    let label: string;
    if (dayRange <= 14) label = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    else if (dayRange <= 60) label = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('it-IT', { month: 'short' })}`;
    else if (dayRange <= 365) label = d.toLocaleString('it-IT', { month: 'short', year: '2-digit' });
    else label = d.toLocaleString('it-IT', { month: 'short', year: 'numeric' });
    ticks.push({ label, x });
    cursor += stepMs;
  }
  return ticks;
}

// ── Unified SVG Canvas (scala: monthsVisible mesi in vista, scroll orizzontale) ──
interface UnifiedCanvasProps {
  timeline: Timeline;
  monthsVisible: number;
  onStepClick: (step: TimelineStep, phase: TimelinePhase) => void;
  onPhaseContextMenu?: (phase: TimelinePhase, e: React.MouseEvent) => void;
  onStepContextMenu?: (step: TimelineStep, phase: TimelinePhase, e: React.MouseEvent) => void;
}

const UnifiedCanvas: React.FC<UnifiedCanvasProps> = ({ timeline, monthsVisible, onStepClick, onPhaseContextMenu, onStepContextMenu }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(900);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => setContainerW(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const phases = useMemo(() =>
    [...timeline.phases].sort((a, b) => a.sort_order - b.sort_order || a.start_date.localeCompare(b.start_date)),
    [timeline.phases]);

  // Global date range
  const { minMs, maxMs } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    phases.forEach(p => {
      mn = Math.min(mn, toMs(p.start_date));
      mx = Math.max(mx, toMs(p.end_date));
    });
    if (mn === Infinity) { mn = Date.now(); mx = mn + ONE_MONTH_MS; }
    const pad = (mx - mn) * 0.03;
    return { minMs: mn - pad, maxMs: mx + pad };
  }, [phases]);

  const msRange = maxMs - minMs;
  const canvasWidth = Math.max(containerW, (msRange / ONE_MONTH_MS) * (containerW / monthsVisible));
  const usablePx = Math.max(0, canvasWidth - CANVAS_PAD_L - CANVAS_PAD_R);
  const totalH = AXIS_H + phases.length * LANE_H + 20;

  const xFor = useCallback((iso: string | null | undefined) => {
    if (!iso || msRange <= 0) return CANVAS_PAD_L + usablePx / 2;
    const ms = toMs(iso);
    return CANVAS_PAD_L + ((ms - minMs) / msRange) * usablePx;
  }, [minMs, maxMs, usablePx, msRange]);

  const ticks = useMemo(() => buildAxisTicks(minMs, maxMs, usablePx), [minMs, maxMs, usablePx]);

  if (phases.length === 0) return null;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <svg
          viewBox={`0 0 ${canvasWidth} ${totalH}`}
          width={canvasWidth}
          height={totalH}
          style={{ display: 'block', userSelect: 'none' }}
        >
        <defs>
          {phases.map(p => (
            <filter key={p.id} id={`glow-d-${p.id}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>

        {/* Date axis background */}
        <rect x={0} y={0} width={canvasWidth} height={AXIS_H}
          fill="rgba(255,255,255,0.03)" rx={0} />

        {/* Axis ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={AXIS_H - 6} x2={t.x} y2={totalH - 10}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="3,4" />
            <text x={t.x} y={AXIS_H - 14} textAnchor="middle"
              fontSize="10" fill="rgba(255,255,255,0.35)" fontFamily="system-ui">
              {t.label}
            </text>
            <line x1={t.x} y1={AXIS_H - 8} x2={t.x} y2={AXIS_H}
              stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          </g>
        ))}

        {/* OGGI (today) vertical line */}
        {(() => {
          const todayIso = new Date().toISOString().slice(0, 10);
          const nowX = xFor(todayIso);
          if (nowX < CANVAS_PAD_L || nowX > canvasWidth - CANVAS_PAD_R) return null;
          return (
            <g>
              <line x1={nowX} y1={AXIS_H} x2={nowX} y2={totalH - 10}
                stroke="rgba(99,102,241,0.45)" strokeWidth={1.5} strokeDasharray="4,4" />
              <rect x={nowX - 16} y={2} width={32} height={18} rx={4} fill="rgba(99,102,241,0.65)" />
              <text x={nowX} y={14} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700" fontFamily="system-ui">OGGI</text>
            </g>
          );
        })()}

        {/* Phase lanes */}
        {phases.map((phase, pIdx) => {
          const color = phase.color;
          const laneY = AXIS_H + pIdx * LANE_H;
          const cy = laneY + LANE_H / 2;

          const sx = xFor(phase.start_date);
          const ex = xFor(phase.end_date);

          const sortedSteps = [...phase.steps]
            .sort((a, b) => {
              if (a.date_order && b.date_order) return a.date_order.localeCompare(b.date_order);
              return a.sort_order - b.sort_order;
            });

          // All X points: start → steps → end
          const allPts = [
            { x: sx, step: null as TimelineStep | null },
            ...sortedSteps.map(s => ({ x: xFor(s.date_order ?? phase.start_date), step: s })),
            { x: ex, step: null as TimelineStep | null },
          ];

          // Build bezier path e lunghezze approssimate per segmento (per colorare esattamente fino allo step)
          const arcDy = 28;
          let pathD = `M ${allPts[0].x} ${cy}`;
          const segmentLengths: number[] = [];
          for (let i = 1; i < allPts.length; i++) {
            const x0 = allPts[i - 1].x;
            const x1 = allPts[i].x;
            const dy = i % 2 === 0 ? -arcDy : arcDy;
            const cp1x = x0 + (x1 - x0) * 0.38;
            const cp2x = x0 + (x1 - x0) * 0.62;
            pathD += ` C ${cp1x} ${cy + dy}, ${cp2x} ${cy + dy}, ${x1} ${cy}`;
            const d01 = Math.hypot(cp1x - x0, dy);
            const d12 = Math.abs(cp2x - cp1x);
            const d23 = Math.hypot(x1 - cp2x, dy);
            segmentLengths.push((d01 + d12 + d23) / 2);
          }
          // Ultimo step completato in ordine (indice in allPts)
          let lastReached = 0;
          for (let i = 1; i < allPts.length - 1; i++) {
            if (allPts[i].step?.is_completed) lastReached = i;
          }
          if (lastReached === allPts.length - 2 && allPts[allPts.length - 2].step?.is_completed) lastReached = allPts.length - 1;
          const totalPathLen = segmentLengths.reduce((a, b) => a + b, 0);
          let cumLen = 0;
          for (let i = 0; i < lastReached; i++) cumLen += segmentLengths[i];
          const pathProgress = totalPathLen > 0 ? Math.min(1, cumLen / totalPathLen) : 0;

          const completedCount = phase.steps.filter(s => s.is_completed).length;
          const totalCount = phase.steps.length || 1;
          const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

          return (
            <g
              key={phase.id}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onPhaseContextMenu?.(phase, e); }}
              style={{ cursor: onPhaseContextMenu ? 'context-menu' : undefined }}
            >
              {/* Lane separator */}
              <line x1={0} y1={laneY} x2={canvasWidth} y2={laneY}
                stroke="rgba(255,255,255,0.04)" strokeWidth={1} />

              {/* Phase label (left) */}
              <text x={CANVAS_PAD_L - 10} y={cy + 4} textAnchor="end"
                fontSize="11.5" fontWeight="700" fill={color} fontFamily="system-ui">
                {phase.title.length > 11 ? phase.title.slice(0, 11) + '…' : phase.title}
              </text>
              <text x={CANVAS_PAD_L - 10} y={cy + 18} textAnchor="end"
                fontSize="9.5" fill="rgba(255,255,255,0.3)" fontFamily="system-ui">
                {pct}%
              </text>

              {/* Background track */}
              <path d={pathD} fill="none" stroke={color}
                strokeOpacity={0.12} strokeWidth={3} strokeLinecap="round" />

              {/* Arco colorato fino allo step raggiunto (in ordine) */}
              <motion.path
                d={pathD} fill="none" stroke={color}
                strokeWidth={3} strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: pathProgress, opacity: 1 }}
                transition={{ duration: 1.2, delay: pIdx * 0.15, ease: 'easeInOut' }}
              />

              {/* Start node */}
              <circle cx={sx} cy={cy} r={8} fill={color} opacity={0.9} />
              <text x={sx} y={cy + 22} textAnchor="middle"
                fontSize="9" fill={color} opacity={0.65} fontFamily="system-ui">
                {fmt(phase.start_date, true)}
              </text>

              {/* End node + flag */}
              <circle cx={ex} cy={cy} r={8} fill={color} opacity={0.9} />
              <polygon
                points={`${ex + 2},${cy - 24} ${ex + 14},${cy - 18} ${ex + 2},${cy - 12}`}
                fill={color} opacity={0.85}
              />
              <line x1={ex + 2} y1={cy - 26} x2={ex + 2} y2={cy - 10}
                stroke={color} strokeWidth={1.5} strokeLinecap="round" />
              <text x={ex} y={cy + 22} textAnchor="middle"
                fontSize="9" fill={color} opacity={0.65} fontFamily="system-ui">
                {fmt(phase.end_date, true)}
              </text>

              {/* Step nodes */}
              {sortedSteps.map((step, sIdx) => {
                const sx2 = xFor(step.date_order ?? undefined);
                const isCompleted = step.is_completed;
                const isAbove = sIdx % 2 === 0;
                const labelY = isAbove ? cy - NODE_R - 10 : cy + NODE_R + 20;
                const clTotal = step.checklist_items?.length ?? 0;
                const clDone = step.checklist_items?.filter(c => c.is_completed).length ?? 0;

                return (
                  <motion.g
                    key={step.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onStepClick(step, phase)}
                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onStepContextMenu?.(step, phase, e); }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + pIdx * 0.12 + sIdx * 0.07 }}
                  >
                    {isCompleted && (
                      <circle cx={sx2} cy={cy} r={NODE_R + 7}
                        fill={color} opacity={0.15}
                        filter={`url(#glow-d-${phase.id})`} />
                    )}
                    <circle cx={sx2} cy={cy} r={NODE_R}
                      fill={isCompleted ? color : '#1C1C1E'}
                      stroke={color} strokeWidth={2.5} />

                    {isCompleted ? (
                      <polyline
                        points={`${sx2 - 5},${cy} ${sx2 - 1},${cy + 4} ${sx2 + 6},${cy - 5}`}
                        fill="none" stroke="white" strokeWidth={2.5}
                        strokeLinecap="round" strokeLinejoin="round"
                      />
                    ) : (
                      <text x={sx2} y={cy + 4} textAnchor="middle"
                        fontSize="10" fontWeight="700" fill={color} fontFamily="system-ui">
                        {sIdx + 1}
                      </text>
                    )}

                    <text x={sx2} y={labelY} textAnchor="middle"
                      fontSize="10.5" fontWeight="600" fill="#E5E5EA" fontFamily="system-ui">
                      {step.title.length > 13 ? step.title.slice(0, 13) + '…' : step.title}
                    </text>
                    {clTotal > 0 && (
                      <text x={sx2} y={labelY + (isAbove ? -13 : 14)} textAnchor="middle"
                        fontSize="9" fill={color} opacity={0.65} fontFamily="system-ui">
                        {clDone}/{clTotal}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </g>
          );
        })}
        </svg>
      </div>
    </div>
  );
};

// ── Step Drawer ────────────────────────────────────────────
interface StepDrawerProps {
  step: TimelineStep;
  phase: TimelinePhase;
  timeline: Timeline;
  onClose: () => void;
  onUpdate: (updated: TimelineStep) => void;
}

const StepDrawer: React.FC<StepDrawerProps> = ({ step, phase, timeline, onClose, onUpdate }) => {
  const [localStep, setLocalStep] = useState<TimelineStep>(step);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [titleSavedFeedback, setTitleSavedFeedback] = useState(false);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newItemRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalStep(step);
    setEditingTitle(false);
    setEditingDesc(false);
    setEditingDate(false);
  }, [step.id]);

  useEffect(() => {
    return () => { if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current); };
  }, []);

  const syncStep = (patch: Partial<TimelineStep>) => {
    setLocalStep(prev => { const u = { ...prev, ...patch }; onUpdate(u); return u; });
  };

  const handleToggleComplete = async () => {
    setSaving(true);
    try {
      const u = await timelineApi.updateStep(timeline.id, phase.id, localStep.id, { is_completed: !localStep.is_completed });
      syncStep({ is_completed: u.is_completed, completed_at: u.completed_at ?? null });
    } finally { setSaving(false); }
  };

  const saveTitle = useCallback(async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const u = await timelineApi.updateStep(timeline.id, phase.id, localStep.id, { title: trimmed });
      syncStep({ title: u.title });
      setTitleSavedFeedback(true);
      setTimeout(() => setTitleSavedFeedback(false), 2200);
    } finally { setSaving(false); }
  }, [timeline.id, phase.id, localStep.id]);

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) { clearTimeout(titleDebounceRef.current); titleDebounceRef.current = null; }
    if (localStep.title.trim() && localStep.title.trim() !== step.title) {
      saveTitle(localStep.title);
    }
    setEditingTitle(false);
  };

  const handleTitleChange = (value: string) => {
    setLocalStep(prev => ({ ...prev, title: value }));
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      titleDebounceRef.current = null;
      if (value.trim() && value.trim() !== step.title) saveTitle(value.trim());
    }, 700);
  };

  const handleSaveDesc = async () => {
    setSaving(true);
    try { await timelineApi.updateStep(timeline.id, phase.id, localStep.id, { description: localStep.description ?? undefined }); }
    finally { setSaving(false); setEditingDesc(false); }
  };

  const handleToggleCl = async (item: TimelineChecklistItem) => {
    const u = await timelineApi.updateChecklistItem(timeline.id, phase.id, localStep.id, item.id, { is_completed: !item.is_completed });
    syncStep({ checklist_items: localStep.checklist_items.map(c => c.id === u.id ? u : c) });
  };

  const handleAddCl = async () => {
    const text = newItemText.trim();
    if (!text) return;
    setAddingItem(true);
    try {
      const item = await timelineApi.createChecklistItem(timeline.id, phase.id, localStep.id, { text });
      syncStep({ checklist_items: [...localStep.checklist_items, item] });
      setNewItemText('');
    } finally { setAddingItem(false); }
  };

  const handleDeleteCl = async (itemId: number) => {
    await timelineApi.deleteChecklistItem(timeline.id, phase.id, localStep.id, itemId);
    syncStep({ checklist_items: localStep.checklist_items.filter(c => c.id !== itemId) });
  };

  const handleSaveDate = async () => {
    const v = localStep.date_order;
    if (!v) return;
    setSavingDate(true);
    try {
      const u = await timelineApi.updateStep(timeline.id, phase.id, localStep.id, { date_order: v });
      syncStep({ date_order: u.date_order });
      setEditingDate(false);
    } finally {
      setSavingDate(false);
    }
  };

  const clTotal = localStep.checklist_items.length;
  const clDone = localStep.checklist_items.filter(c => c.is_completed).length;
  const clPct = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0;
  const accent = phase.color || timeline.color;

  return (
    <>
      <motion.div
        style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        style={{
          position: 'fixed', right: 0, top: 0, zIndex: 50,
          height: '100%', width: '100%', maxWidth: 440,
          background: 'var(--color-bg-secondary)',
          borderLeft: '1px solid var(--color-border-primary)',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.55)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}66)` }} />

        {/* Header: fase + chiudi */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: `${accent}22`, color: accent }}>
            {phase.title}
          </span>
          <button onClick={onClose}
            style={{ padding: '8px 10px', borderRadius: 10, cursor: 'pointer', background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-tertiary)', display: 'flex' }}
            aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Data: card in evidenza, modificabile */}
          <div style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-secondary)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 10 }}>Data</div>
            {editingDate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="date"
                  value={localStep.date_order ?? ''}
                  onChange={e => setLocalStep(prev => ({ ...prev, date_order: e.target.value || null }))}
                  min={phase.start_date}
                  max={phase.end_date}
                  autoFocus
                  style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--color-bg-secondary)', border: `2px solid ${accent}`, color: 'var(--color-text-primary)', fontSize: 15, outline: 'none', fontWeight: 600 }}
                />
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
                  Periodo della fase: {fmt(phase.start_date, true)} → {fmt(phase.end_date, true)}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveDate} disabled={savingDate} style={{ padding: '10px 18px', borderRadius: 10, background: accent, border: 'none', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: savingDate ? 0.7 : 1 }}>
                    {savingDate ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salva data
                  </button>
                  <button onClick={() => { setEditingDate(false); setLocalStep(prev => ({ ...prev, date_order: step.date_order ?? null })); }} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--glass-bg-medium)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-tertiary)', fontSize: 13, cursor: 'pointer' }}>
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingDate(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {localStep.date_order ? fmt(localStep.date_order) : '— Nessuna data'}
                </span>
                <Edit2 size={16} style={{ color: 'var(--color-text-quaternary)' }} />
              </div>
            )}
          </div>

          {/* Titolo step - modifica automatica con feedback "Salvato automaticamente" */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--color-text-quaternary)' }}>Titolo</span>
              {titleSavedFeedback && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}
                >
                  Salvato automaticamente
                </motion.span>
              )}
            </div>
            {editingTitle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  value={localStep.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setLocalStep(p => ({ ...p, title: step.title })); setEditingTitle(false); } }}
                  autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--glass-bg-light)', border: `1px solid ${accent}`, color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>La modifica viene salvata in automatico. Premi Invio per chiudere.</p>
              </div>
            ) : (
              <div onClick={() => setEditingTitle(true)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '2px 0' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, flex: 1, lineHeight: 1.3, textDecoration: localStep.is_completed ? 'line-through' : 'none', opacity: localStep.is_completed ? 0.5 : 1 }}>
                  {localStep.title}
                </h2>
                <Edit2 size={14} style={{ color: 'var(--color-text-quaternary)', marginTop: 4, flexShrink: 0 }} />
              </div>
            )}
          </div>

          {/* Segna come completato */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: localStep.is_completed ? 'rgba(16,185,129,0.12)' : 'var(--glass-bg-light)', border: `1px solid ${localStep.is_completed ? 'rgba(16,185,129,0.3)' : 'var(--color-border-secondary)'}` }}>
            {localStep.is_completed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={20} style={{ color: '#10b981', flexShrink: 0 }} strokeWidth={2.5} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>
                    Completato {fmtCompletedAt(localStep.completed_at || localStep.updated_at)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  disabled={saving}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: saving ? 'wait' : 'pointer', padding: 0, textAlign: 'left', alignSelf: 'flex-start' }}
                >
                  Segna come non completato
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleToggleComplete}
                disabled={saving}
                style={{
                  width: '100%', padding: '12px 18px', borderRadius: 12, border: 'none', cursor: saving ? 'wait' : 'pointer',
                  background: accent, color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: `0 4px 16px ${accent}50`,
                }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={2.5} />}
                Segna come completato
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 8 }}>Descrizione</div>
            {editingDesc ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea rows={4} value={localStep.description ?? ''} onChange={e => setLocalStep(p => ({ ...p, description: e.target.value }))} autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, resize: 'vertical', background: 'var(--glass-bg-light)', border: `1px solid ${accent}`, color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveDesc} style={{ padding: '8px 18px', borderRadius: 10, background: accent, border: 'none', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Salva</button>
                  <button onClick={() => setEditingDesc(false)} style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-tertiary)', fontSize: 13, cursor: 'pointer' }}>Annulla</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingDesc(true)} style={{ padding: '12px 14px', borderRadius: 12, cursor: 'pointer', background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-secondary)', minHeight: 56 }}>
                <p style={{ fontSize: 14, color: localStep.description ? 'var(--color-text-secondary)' : 'var(--color-text-quaternary)', margin: 0, lineHeight: 1.6 }}>
                  {localStep.description || 'Aggiungi una descrizione…'}
                </p>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--color-text-quaternary)' }}>Checklist</div>
              {clTotal > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: clPct === 100 ? '#10b981' : accent }}>{clDone}/{clTotal} · {clPct}%</span>}
            </div>
            {clTotal > 0 && (
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 12 }}>
                <motion.div style={{ height: '100%', borderRadius: 99, background: clPct === 100 ? '#10b981' : accent }}
                  animate={{ width: `${clPct}%` }} transition={{ duration: 0.4 }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <AnimatePresence>
                {localStep.checklist_items.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-secondary)' }}>
                    <button onClick={() => handleToggleCl(item)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      {item.is_completed ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                          style={{ width: 22, height: 22, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </motion.div>
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${accent}` }} />
                      )}
                    </button>
                    <span style={{ flex: 1, fontSize: 14, color: item.is_completed ? 'var(--color-text-quaternary)' : 'var(--color-text-primary)', textDecoration: item.is_completed ? 'line-through' : 'none' }}>
                      {item.text}
                    </span>
                    <button onClick={() => handleDeleteCl(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-quaternary)', display: 'flex', padding: 0 }}>
                      <X size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input ref={newItemRef} type="text" value={newItemText} onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCl(); }}
                placeholder="Aggiungi un item…"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none' }} />
              <button onClick={handleAddCl} disabled={!newItemText.trim() || addingItem}
                style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: accent, color: '#fff', cursor: 'pointer', opacity: !newItemText.trim() || addingItem ? 0.5 : 1, display: 'flex', alignItems: 'center' }}>
                {addingItem ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ── Add Phase Modal ────────────────────────────────────────
interface AddPhaseModalProps {
  timelineColor: string;
  onClose: () => void;
  onSave: (data: { title: string; description?: string; start_date: string; end_date: string; color: string }) => Promise<void>;
}

const AddPhaseModal: React.FC<AddPhaseModalProps> = ({ timelineColor, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState(timelineColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Il titolo è obbligatorio'); return; }
    if (!startDate || !endDate) { setError('Le date sono obbligatorie'); return; }
    if (endDate < startDate) { setError('La data fine deve essere dopo quella di inizio'); return; }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() || undefined, start_date: startDate, end_date: endDate, color });
      onClose();
    } catch { setError('Errore durante il salvataggio'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <motion.div className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 480, borderRadius: 20, overflow: 'hidden' }}
        initial={{ opacity: 0, y: 28, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 28, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Nuova Fase</h2>
          <button onClick={onClose} style={{ padding: '6px 8px', borderRadius: 10, background: 'var(--glass-bg-medium)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)', borderRadius: 12, padding: '10px 14px', color: 'var(--color-error)', fontSize: 13 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
            {/* Title */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Titolo *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Fase 1 - Ricerca" autoFocus
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {/* Desc */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Descrizione</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, resize: 'none', background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Inizio *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Fine *</label>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            {/* Color */}
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Colore</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {COLOR_PRESETS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', position: 'relative', outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 3, transform: color === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s' }}>
                    {color === c && <Check size={12} strokeWidth={3} style={{ color: '#fff', position: 'absolute', inset: 0, margin: 'auto' }} />}
                  </button>
                ))}
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={onClose}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 600, fontSize: 14, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                Annulla
              </button>
              <button type="submit" disabled={saving}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 600, fontSize: 14, background: color, border: 'none', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 20px ${color}55` }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Crea Fase
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Edit Phase Modal ────────────────────────────────────────
interface EditPhaseModalProps {
  phase: TimelinePhase;
  timelineColor: string;
  onClose: () => void;
  onSave: (phaseId: number, data: { title: string; description?: string; start_date: string; end_date: string; color: string }) => Promise<void>;
}

const EditPhaseModal: React.FC<EditPhaseModalProps> = ({ phase, timelineColor, onClose, onSave }) => {
  const [title, setTitle] = useState(phase.title);
  const [description, setDescription] = useState(phase.description ?? '');
  const [startDate, setStartDate] = useState(phase.start_date);
  const [endDate, setEndDate] = useState(phase.end_date);
  const [color, setColor] = useState(phase.color || timelineColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Il titolo è obbligatorio'); return; }
    if (!startDate || !endDate) { setError('Le date sono obbligatorie'); return; }
    if (endDate < startDate) { setError('La data fine deve essere dopo quella di inizio'); return; }
    setSaving(true);
    try {
      await onSave(phase.id, { title: title.trim(), description: description.trim() || undefined, start_date: startDate, end_date: endDate, color });
      onClose();
    } catch { setError('Errore durante il salvataggio'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <motion.div className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 480, borderRadius: 20, overflow: 'hidden' }}
        initial={{ opacity: 0, y: 28, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 28, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Modifica Fase</h2>
          <button onClick={onClose} style={{ padding: '6px 8px', borderRadius: 10, background: 'var(--glass-bg-medium)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)', borderRadius: 12, padding: '10px 14px', color: 'var(--color-error)', fontSize: 13 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Titolo *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Fase 1" autoFocus
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Descrizione</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, resize: 'none', background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Data inizio *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Data fine *</label>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Colore</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {COLOR_PRESETS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', position: 'relative', outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 3, transform: color === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s' }}>
                    {color === c && <Check size={12} strokeWidth={3} style={{ color: '#fff', position: 'absolute', inset: 0, margin: 'auto' }} />}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={onClose}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 600, fontSize: 14, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                Annulla
              </button>
              <button type="submit" disabled={saving}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 600, fontSize: 14, background: color, border: 'none', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 20px ${color}55` }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Salva modifiche
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Compact Phase Step List ────────────────────────────────
interface PhaseStepListProps {
  phase: TimelinePhase;
  timeline: Timeline;
  onUpdate: (p: TimelinePhase) => void;
  onStepClick: (s: TimelineStep, p: TimelinePhase) => void;
  onPhaseContextMenu?: (phase: TimelinePhase, e: React.MouseEvent) => void;
  onStepContextMenu?: (step: TimelineStep, phase: TimelinePhase, e: React.MouseEvent) => void;
}

const PhaseStepList: React.FC<PhaseStepListProps> = ({ phase, timeline, onUpdate, onStepClick, onPhaseContextMenu, onStepContextMenu }) => {
  const [open, setOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const accent = phase.color;
  const completedCount = phase.steps.filter(s => s.is_completed).length;

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const s = await timelineApi.createStep(timeline.id, phase.id, { title: newTitle.trim(), date_order: newDate || undefined });
      onUpdate({ ...phase, steps: [...phase.steps, s] });
      setNewTitle(''); setNewDate(''); setShowAdd(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (stepId: number) => {
    if (!window.confirm('Eliminare questo step?')) return;
    await timelineApi.deleteStep(timeline.id, phase.id, stepId);
    onUpdate({ ...phase, steps: phase.steps.filter(s => s.id !== stepId) });
  };

  return (
    <div style={{
      borderLeft: `3px solid ${accent}`,
      borderRadius: '0 12px 12px 0',
      background: 'var(--glass-bg-light)',
      overflow: 'hidden',
    }}>
      {/* Phase header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
        onContextMenu={e => { e.preventDefault(); onPhaseContextMenu?.(phase, e); }}
      >
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: accent, flexShrink: 0,
          boxShadow: `0 0 8px ${accent}88`,
        }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{phase.title}</span>
          <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--color-text-quaternary)' }}>
            {fmt(phase.start_date, true)} → {fmt(phase.end_date, true)} · {completedCount}/{phase.steps.length}
          </span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'var(--color-text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[...phase.steps].sort((a, b) => a.sort_order - b.sort_order).map(step => {
                const clTotal = step.checklist_items?.length ?? 0;
                const clDone = step.checklist_items?.filter(c => c.is_completed).length ?? 0;
                return (
                  <div key={step.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-bg-medium)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => onStepClick(step, phase)}
                    onContextMenu={e => { e.preventDefault(); onStepContextMenu?.(step, phase, e); }}
                  >
                    {step.is_completed
                      ? <CheckCircle2 size={15} style={{ color: accent, flexShrink: 0 }} />
                      : <Circle size={15} style={{ color: 'var(--color-text-quaternary)', flexShrink: 0 }} />}
                    <span style={{ flex: 1, fontSize: 13, color: step.is_completed ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', textDecoration: step.is_completed ? 'line-through' : 'none' }}>
                      {step.title}
                    </span>
                    {clTotal > 0 && <span style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>{clDone}/{clTotal}</span>}
                    {step.date_order && <span style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>{fmt(step.date_order, true)}</span>}
                    <button onClick={e => { e.stopPropagation(); handleDelete(step.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-quaternary)', display: 'flex', padding: 0, opacity: 0.6 }}>
                      <X size={12} />
                    </button>
                  </div>
                );
              })}

              {/* Add step inline */}
              <AnimatePresence>
                {showAdd ? (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
                      placeholder="Titolo step…" autoFocus
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={phase.start_date} max={phase.end_date}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none' }} />
                      <button onClick={handleAdd} disabled={!newTitle.trim() || saving}
                        style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: accent, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: !newTitle.trim() || saving ? 0.5 : 1 }}>
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} OK
                      </button>
                      <button onClick={() => setShowAdd(false)}
                        style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>
                    </div>
                  </motion.div>
                ) : (
                  <button onClick={() => setShowAdd(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: accent, padding: '6px 10px', opacity: 0.75 }}>
                    <Plus size={13} /> Aggiungi step
                  </button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Phase Filter Bar ───────────────────────────────────────
interface PhaseFilterBarProps {
  phases: TimelinePhase[];
  visibleIds: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
}

const PhaseFilterBar: React.FC<PhaseFilterBarProps> = ({ phases, visibleIds, onToggle, onSelectAll }) => {
  const allVisible = phases.every(p => visibleIds.has(p.id));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
        <SlidersHorizontal size={13} style={{ color: 'var(--color-text-quaternary)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--color-text-quaternary)' }}>Fasi visibili</span>
      </div>

      {/* All toggle */}
      <button
        onClick={onSelectAll}
        style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          border: '1px solid',
          borderColor: allVisible ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
          background: allVisible ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: allVisible ? 'var(--color-text-primary)' : 'var(--color-text-quaternary)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        Tutte
      </button>

      {/* Per-phase pills */}
      {phases.map(phase => {
        const active = visibleIds.has(phase.id);
        return (
          <motion.button
            key={phase.id}
            onClick={() => onToggle(phase.id)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1px solid ${active ? phase.color + '55' : 'rgba(255,255,255,0.06)'}`,
              background: active ? `${phase.color}18` : 'transparent',
              color: active ? phase.color : 'var(--color-text-quaternary)',
              cursor: 'pointer', transition: 'all 0.15s',
              opacity: active ? 1 : 0.55,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? phase.color : 'var(--color-text-quaternary)', transition: 'all 0.15s', boxShadow: active ? `0 0 6px ${phase.color}` : 'none' }} />
            {phase.title}
            {active && (
              <span style={{ fontSize: 10, background: `${phase.color}30`, borderRadius: 4, padding: '0 4px', marginLeft: 2 }}>
                {phase.steps.length}
              </span>
            )}
          </motion.button>
        );
      })}

      {/* Hidden count badge */}
      {!allVisible && (
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-quaternary)', background: 'var(--glass-bg-light)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--color-border-secondary)' }}>
          {phases.length - visibleIds.size} nascosta{phases.length - visibleIds.size !== 1 ? 'e' : ''}
        </span>
      )}
    </div>
  );
};

// ── Main Detail Page ────────────────────────────────────────
const TimelineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [activeStep, setActiveStep] = useState<{ step: TimelineStep; phase: TimelinePhase } | null>(null);
  const [visiblePhaseIds, setVisiblePhaseIds] = useState<Set<number>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [monthsVisible, setMonthsVisible] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'phase'; phase: TimelinePhase } | { x: number; y: number; type: 'step'; step: TimelineStep; phase: TimelinePhase } | null>(null);
  const [editPhaseModal, setEditPhaseModal] = useState<TimelinePhase | null>(null);
  const [movePhaseTarget, setMovePhaseTarget] = useState<TimelinePhase | null>(null);
  const [moveStepTarget, setMoveStepTarget] = useState<{ step: TimelineStep; phase: TimelinePhase } | null>(null);
  const [duplicateStepTarget, setDuplicateStepTarget] = useState<{ step: TimelineStep; phase: TimelinePhase } | null>(null);
  const [undoStack, setUndoStack] = useState<Array<() => Promise<void>>>([]);
  const [otherTimelines, setOtherTimelines] = useState<Timeline[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setTimeline(await timelineApi.getById(Number(id)));
    } catch { setError('Timeline non trovata'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (movePhaseTarget && id) {
      timelineApi.getAll().then(list => setOtherTimelines(list.filter(t => t.id !== Number(id))));
    }
  }, [movePhaseTarget, id]);

  // Sync visible phases when timeline first loads (show all by default)
  useEffect(() => {
    if (timeline) {
      setVisiblePhaseIds(prev => {
        // Keep existing visibility, just add any new phases
        const next = new Set(prev);
        timeline.phases.forEach(p => { if (!next.has(p.id)) next.add(p.id); });
        // Remove IDs that no longer exist
        next.forEach(id => { if (!timeline.phases.find(p => p.id === id)) next.delete(id); });
        return next.size === 0 ? new Set(timeline.phases.map(p => p.id)) : next;
      });
    }
  }, [timeline]);

  const togglePhaseVisibility = (phaseId: number) => {
    setVisiblePhaseIds(prev => {
      const next = new Set(prev);
      if (next.has(phaseId) && next.size > 1) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const showAllPhases = () => {
    if (timeline) setVisiblePhaseIds(new Set(timeline.phases.map(p => p.id)));
  };

  const handleAddPhase = async (data: { title: string; description?: string; start_date: string; end_date: string; color: string }) => {
    if (!timeline) return;
    const phase = await timelineApi.createPhase(timeline.id, data);
    setTimeline(prev => prev ? { ...prev, phases: [...prev.phases, phase] } : prev);
    setVisiblePhaseIds(prev => new Set([...prev, phase.id]));
  };

  const handleEditPhaseSave = async (phaseId: number, data: { title: string; description?: string; start_date: string; end_date: string; color: string }) => {
    if (!timeline) return;
    const updated = await timelineApi.updatePhase(timeline.id, phaseId, data);
    setTimeline(prev => prev ? { ...prev, phases: prev.phases.map(p => p.id === phaseId ? updated : p) } : prev);
    setEditPhaseModal(null);
  };

  const handleDuplicatePhase = async (phase: TimelinePhase) => {
    if (!timeline) return;
    setContextMenu(null);
    const newPhase = await timelineApi.duplicatePhase(timeline.id, phase.id);
    setTimeline(prev => prev ? { ...prev, phases: [...prev.phases, newPhase] } : prev);
    setVisiblePhaseIds(prev => new Set([...prev, newPhase.id]));
  };

  const handleMovePhaseConfirm = async (phase: TimelinePhase, targetTimelineId: number) => {
    if (!timeline || targetTimelineId === timeline.id) return;
    await timelineApi.movePhase(timeline.id, phase.id, targetTimelineId);
    setTimeline(prev => prev ? { ...prev, phases: prev.phases.filter(p => p.id !== phase.id) } : prev);
    setMovePhaseTarget(null);
    load();
  };

  const handleDuplicateStep = async (step: TimelineStep, phase: TimelinePhase) => {
    if (!timeline) return;
    setContextMenu(null);
    const newStep = await timelineApi.duplicateStep(timeline.id, phase.id, step.id);
    setTimeline(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map(p => p.id === phase.id ? { ...p, steps: [...p.steps, newStep] } : p),
      };
    });
    setActiveStep({ step: newStep, phase });
  };

  const handleDuplicateStepToPhase = async (step: TimelineStep, phase: TimelinePhase, targetPhaseId: number) => {
    if (!timeline) return;
    setContextMenu(null);
    setDuplicateStepTarget(null);
    const newStep = await timelineApi.duplicateStep(timeline.id, phase.id, step.id, { target_phase_id: targetPhaseId });
    setTimeline(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        phases: prev.phases.map(p => p.id === targetPhaseId ? { ...p, steps: [...p.steps, newStep] } : p),
      };
      const targetPhase = next.phases.find(p => p.id === targetPhaseId);
      if (targetPhase) setActiveStep({ step: newStep, phase: targetPhase });
      return next;
    });
  };

  const handleMoveStepConfirm = async (step: TimelineStep, phase: TimelinePhase, targetPhaseId: number) => {
    if (!timeline || targetPhaseId === phase.id) return;
    setMoveStepTarget(null);
    const updated = await timelineApi.moveStep(timeline.id, phase.id, step.id, targetPhaseId);
    setTimeline(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        phases: prev.phases.map(p => {
          if (p.id === phase.id) return { ...p, steps: p.steps.filter(s => s.id !== step.id) };
          if (p.id === targetPhaseId) return { ...p, steps: [...p.steps, updated] };
          return p;
        }),
      };
      const targetPhase = next.phases.find(p => p.id === targetPhaseId);
      if (targetPhase) setActiveStep({ step: updated, phase: targetPhase });
      return next;
    });
  };

  const pushUndo = useCallback((revert: () => Promise<void>) => {
    setUndoStack(prev => [...prev.slice(-19), revert]);
  }, []);

  const handleUndo = useCallback(async () => {
    const fn = undoStack[undoStack.length - 1];
    if (!fn) return;
    setUndoStack(prev => prev.slice(0, -1));
    try {
      await fn();
      await load();
    } catch {
      // restore undo on error
      setUndoStack(prev => [...prev, fn]);
    }
  }, [undoStack, load]);

  const handleDeleteStep = async (phaseId: number, stepId: number) => {
    if (!timeline || !window.confirm('Eliminare questo step?')) return;
    const phase = timeline.phases.find(p => p.id === phaseId);
    const step = phase?.steps.find(s => s.id === stepId);
    if (phase && step) {
      pushUndo(async () => {
        const newStep = await timelineApi.createStep(timeline.id, phaseId, {
          title: step.title,
          description: step.description ?? undefined,
          date_order: step.date_order ?? undefined,
          is_completed: step.is_completed,
        });
        for (const item of step.checklist_items || []) {
          await timelineApi.createChecklistItem(timeline.id, phaseId, newStep.id, { text: item.text, is_completed: item.is_completed });
        }
      });
    }
    await timelineApi.deleteStep(timeline.id, phaseId, stepId);
    setTimeline(prev => prev ? { ...prev, phases: prev.phases.map(p => p.id === phaseId ? { ...p, steps: p.steps.filter(s => s.id !== stepId) } : p) } : prev);
  };

  const handleDeletePhase = async (phaseId: number) => {
    if (!timeline || !window.confirm('Eliminare questa fase e tutti i suoi step?')) return;
    const phase = timeline.phases.find(p => p.id === phaseId);
    if (phase) {
      pushUndo(async () => {
        const newPhase = await timelineApi.createPhase(timeline.id, {
          title: phase.title,
          description: phase.description ?? undefined,
          start_date: phase.start_date,
          end_date: phase.end_date,
          color: phase.color,
        });
        for (const step of phase.steps || []) {
          const newStep = await timelineApi.createStep(timeline.id, newPhase.id, {
            title: step.title,
            description: step.description ?? undefined,
            date_order: step.date_order ?? undefined,
            is_completed: step.is_completed,
          });
          for (const item of step.checklist_items || []) {
            await timelineApi.createChecklistItem(timeline.id, newPhase.id, newStep.id, { text: item.text, is_completed: item.is_completed });
          }
        }
      });
    }
    await timelineApi.deletePhase(timeline.id, phaseId);
    setTimeline(prev => prev ? { ...prev, phases: prev.phases.filter(p => p.id !== phaseId) } : prev);
  };

  const handleUpdatePhase = (up: TimelinePhase) =>
    setTimeline(prev => prev ? { ...prev, phases: prev.phases.map(p => p.id === up.id ? up : p) } : prev);

  const handleUpdateStep = (updated: TimelineStep) => {
    setTimeline(prev => {
      if (!prev) return prev;
      return { ...prev, phases: prev.phases.map(p => ({ ...p, steps: p.steps.map(s => s.id === updated.id ? updated : s) })) };
    });
    setActiveStep(prev => prev && prev.step.id === updated.id ? { ...prev, step: updated } : prev);
  };

  const handleOpenShare = async () => {
    if (!timeline) return;
    if (timeline.share_token) {
      setShareModalOpen(true);
      return;
    }
    setShareGenerating(true);
    try {
      const data = await timelineApi.share(timeline.id);
      setTimeline(prev => prev ? { ...prev, share_token: data.share_token } : prev);
      setShareModalOpen(true);
    } finally {
      setShareGenerating(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!timeline?.share_token) return;
    await timelineApi.unshare(timeline.id);
    setTimeline(prev => prev ? { ...prev, share_token: null } : prev);
    setShareModalOpen(false);
  };

  const publicUrl = timeline?.share_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/timeline/public/${timeline.share_token}`
    : '';

  const totalSteps = timeline?.phases.reduce((a, p) => a + p.steps.length, 0) ?? 0;
  const completedSteps = timeline?.phases.reduce((a, p) => a + p.steps.filter(s => s.is_completed).length, 0) ?? 0;
  const overallPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const accent = timeline?.color ?? '#6366f1';

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? contextMenu.type === 'phase'
      ? [
          { id: 'edit-phase', label: 'Modifica fase (date, titolo)', icon: <Edit2 size={14} />, action: () => { setEditPhaseModal(contextMenu.phase); setContextMenu(null); } },
          { id: 'dup-phase', label: 'Duplica fase', icon: <Copy size={14} />, action: () => handleDuplicatePhase(contextMenu.phase) },
          { id: 'move-phase', label: 'Sposta in altra timeline', icon: <MoveRight size={14} />, action: () => { setMovePhaseTarget(contextMenu.phase); setContextMenu(null); } },
          { id: 'div1', label: '', divider: true, action: () => {} },
          { id: 'del-phase', label: 'Elimina fase', icon: <Trash2 size={14} />, action: () => { handleDeletePhase(contextMenu.phase.id); setContextMenu(null); }, danger: true },
        ]
      : [
          { id: 'open-step', label: 'Apri dettaglio', icon: <Layers size={14} />, action: () => { setActiveStep({ step: contextMenu.step, phase: contextMenu.phase }); setContextMenu(null); } },
          { id: 'div0', label: '', divider: true, action: () => {} },
          { id: 'dup-step', label: 'Duplica step (stessa fase)', icon: <Copy size={14} />, action: () => handleDuplicateStep(contextMenu.step, contextMenu.phase) },
          { id: 'dup-step-other', label: 'Duplica in altra fase', icon: <Copy size={14} />, action: () => { setDuplicateStepTarget({ step: contextMenu.step, phase: contextMenu.phase }); setContextMenu(null); } },
          { id: 'move-step', label: 'Sposta in altra fase', icon: <MoveRight size={14} />, action: () => { setMoveStepTarget({ step: contextMenu.step, phase: contextMenu.phase }); setContextMenu(null); } },
          { id: 'div1', label: '', divider: true, action: () => {} },
          { id: 'del-step', label: 'Elimina step', icon: <Trash2 size={14} />, action: () => { timeline && handleDeleteStep(contextMenu.phase.id, contextMenu.step.id); setContextMenu(null); }, danger: true },
        ]
    : [];

  if (loading) return (
    <div data-context-menu="timeline" style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={40} className="animate-spin" style={{ color: '#6366f1' }} />
    </div>
  );

  if (error || !timeline) return (
    <div data-context-menu="timeline" style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <AlertCircle size={44} style={{ color: 'var(--color-error)' }} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>{error || 'Timeline non trovata'}</p>
      <button onClick={() => navigate('/timeline')}
        style={{ padding: '11px 24px', borderRadius: 12, background: '#6366f1', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
        Torna alle Timeline
      </button>
    </div>
  );

  const sortedPhases = [...timeline.phases].sort((a, b) => a.sort_order - b.sort_order || a.start_date.localeCompare(b.start_date));
  const filteredPhases = sortedPhases.filter(p => visiblePhaseIds.has(p.id));
  const filteredTimeline = { ...timeline, phases: filteredPhases };

  return (
    <div data-context-menu="timeline" style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 28px 60px' }}>

      {/* Back + Undo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <button onClick={() => navigate('/timeline')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 13, fontWeight: 500, padding: 0 }}>
          <ArrowLeft size={15} /> Tutte le Timeline
        </button>
        {undoStack.length > 0 && (
          <button
            onClick={handleUndo}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border-primary)', background: 'var(--glass-bg-light)', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Undo2 size={14} /> Torna indietro {undoStack.length > 1 ? `(${undoStack.length})` : ''}
          </button>
        )}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 28px ${accent}40` }}>
            <Layers size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: -0.5 }}>{timeline.name}</h1>
            {timeline.description && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '3px 0 0' }}>{timeline.description}</p>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Progress pill */}
          <div className="glass-card" style={{ borderRadius: 14, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 90, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div style={{ height: '100%', borderRadius: 99, background: overallPct === 100 ? '#10b981' : accent }}
                animate={{ width: `${overallPct}%` }} transition={{ duration: 0.8 }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: overallPct === 100 ? '#10b981' : accent }}>{overallPct}%</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{completedSteps}/{totalSteps} step</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenShare}
            disabled={shareGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 14,
              border: '1px solid var(--color-border-primary)', background: 'var(--glass-bg-light)', color: 'var(--color-text-primary)',
              fontWeight: 700, fontSize: 14, cursor: shareGenerating ? 'wait' : 'pointer', opacity: shareGenerating ? 0.7 : 1,
            }}
          >
            {shareGenerating ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
            Condividi timeline
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddPhase(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 20px ${accent}45` }}>
            <Plus size={16} strokeWidth={2.5} /> Nuova Fase
          </motion.button>
        </div>
      </div>

      {/* ── Unified Master Canvas ── */}
      {sortedPhases.length > 0 ? (
        <>
          <div className="glass-card" style={{ borderRadius: 20, marginBottom: 28, overflow: 'hidden' }}>
            {/* Controlli scala orizzontale (come pagina pubblica): Allunga (−) / Accorcia (+) */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px',
              borderBottom: '1px solid var(--color-border-primary)', gap: 12, flexWrap: 'wrap',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 700 }}>Scala orizzontale</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <button
                    type="button"
                    title="Allunga: timeline più lunga, step più distanziati"
                    aria-label="Allunga timeline"
                    onClick={() => setMonthsVisible(m => {
                      const next = Math.round((m - 0.25) * 4) / 4;
                      return Math.max(MIN_MONTHS_VISIBLE, next <= 0 ? MIN_MONTHS_VISIBLE : next);
                    })}
                    disabled={monthsVisible <= MIN_MONTHS_VISIBLE}
                    style={{
                      width: 42, height: 42, borderRadius: 12, border: `2px solid ${monthsVisible <= MIN_MONTHS_VISIBLE ? 'var(--color-border-secondary)' : accent}`,
                      background: monthsVisible <= MIN_MONTHS_VISIBLE ? 'var(--glass-bg-light)' : 'rgba(255,255,255,0.06)', color: monthsVisible <= MIN_MONTHS_VISIBLE ? 'var(--color-text-quaternary)' : 'var(--color-text-primary)',
                      cursor: monthsVisible <= MIN_MONTHS_VISIBLE ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}
                  >
                    <Minus size={18} strokeWidth={2.5} />
                  </button>
                  <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Allunga</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <button
                    type="button"
                    title="Accorcia: vedi un periodo più lungo nella schermata"
                    aria-label="Accorcia timeline"
                    onClick={() => setMonthsVisible(m => {
                      const next = Math.round((m + 0.25) * 4) / 4;
                      return Math.min(MAX_MONTHS_VISIBLE, next);
                    })}
                    disabled={monthsVisible >= MAX_MONTHS_VISIBLE}
                    style={{
                      width: 42, height: 42, borderRadius: 12, border: `2px solid ${monthsVisible >= MAX_MONTHS_VISIBLE ? 'var(--color-border-secondary)' : accent}`,
                      background: monthsVisible >= MAX_MONTHS_VISIBLE ? 'var(--glass-bg-light)' : 'rgba(255,255,255,0.06)', color: monthsVisible >= MAX_MONTHS_VISIBLE ? 'var(--color-text-quaternary)' : 'var(--color-text-primary)',
                      cursor: monthsVisible >= MAX_MONTHS_VISIBLE ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                  <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Accorcia</span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{monthsVisible <= 0.5 ? `~${Math.round(monthsVisible * 30)} gg` : `${monthsVisible} mese${monthsVisible !== 1 ? 'i' : ''}`} in vista</span>
            </div>

            {/* Filtri fasi */}
            <PhaseFilterBar
              phases={sortedPhases}
              visibleIds={visiblePhaseIds}
              onToggle={togglePhaseVisibility}
              onSelectAll={showAllPhases}
            />

            {filteredPhases.length > 0 ? (
              <div style={{ padding: '12px 0 8px' }}>
                <UnifiedCanvas
                  timeline={filteredTimeline}
                  monthsVisible={monthsVisible}
                  onStepClick={(s, p) => setActiveStep({ step: s, phase: p })}
                  onPhaseContextMenu={(ph, e) => setContextMenu({ x: e.clientX, y: e.clientY, type: 'phase', phase: ph })}
                  onStepContextMenu={(st, ph, e) => setContextMenu({ x: e.clientX, y: e.clientY, type: 'step', step: st, phase: ph })}
                />
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--color-text-quaternary)', margin: 0 }}>
                  Seleziona almeno una fase per visualizzare il canvas
                </p>
              </div>
            )}

            {/* Hint */}
            <div style={{ padding: '0 20px 14px', textAlign: 'right' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>
                {filteredPhases.length}/{sortedPhases.length} {filteredPhases.length === 1 ? 'fase' : 'fasi'} · Clicca uno step per i dettagli
              </span>
            </div>
          </div>

          {/* ── Phase Step Lists (always show all phases) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedPhases.map(phase => {
              const isVisible = visiblePhaseIds.has(phase.id);
              return (
                <div key={phase.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: isVisible ? 1 : 0.45, transition: 'opacity 0.2s' }}>
                  <div style={{ flex: 1 }}>
                    <PhaseStepList
                      phase={phase}
                      timeline={timeline}
                      onUpdate={handleUpdatePhase}
                      onStepClick={(s, p) => setActiveStep({ step: s, phase: p })}
                      onPhaseContextMenu={(ph, e) => setContextMenu({ x: e.clientX, y: e.clientY, type: 'phase', phase: ph })}
                      onStepContextMenu={(st, ph, e) => setContextMenu({ x: e.clientX, y: e.clientY, type: 'step', step: st, phase: ph })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, marginTop: 2 }}>
                    {/* Visibility toggle */}
                    <button
                      onClick={() => togglePhaseVisibility(phase.id)}
                      title={isVisible ? 'Nascondi dal canvas' : 'Mostra nel canvas'}
                      style={{
                        padding: '8px 10px', borderRadius: 10, cursor: 'pointer', display: 'flex',
                        background: isVisible ? `${phase.color}18` : 'var(--glass-bg-light)',
                        border: `1px solid ${isVisible ? phase.color + '44' : 'var(--color-border-secondary)'}`,
                        color: isVisible ? phase.color : 'var(--color-text-quaternary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isVisible
                        ? <Check size={14} strokeWidth={2.5} />
                        : <X size={14} />}
                    </button>
                    {/* Delete */}
                    <button onClick={() => handleDeletePhase(phase.id)}
                      style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ borderRadius: 24, padding: '64px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${accent}18` }}>
            <Layers size={34} style={{ color: accent }} />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Nessuna fase ancora</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>Crea la prima fase per visualizzare la timeline</p>
          </div>
          <button onClick={() => setShowAddPhase(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 26px', borderRadius: 14, border: 'none', background: accent, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 20px ${accent}40`, marginTop: 6 }}>
            <Plus size={16} /> Crea la prima Fase
          </button>
        </motion.div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Edit phase modal */}
      {editPhaseModal && (
        <EditPhaseModal
          phase={editPhaseModal}
          timelineColor={accent}
          onClose={() => setEditPhaseModal(null)}
          onSave={handleEditPhaseSave}
        />
      )}

      {/* Move phase modal */}
      {movePhaseTarget && (
        <motion.div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }} onClick={() => setMovePhaseTarget(null)} />
          <motion.div className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 400, borderRadius: 20, overflow: 'hidden' }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-primary)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Sposta fase in un'altra timeline</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>Seleziona la timeline di destinazione</p>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', padding: 12 }}>
              {otherTimelines.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>Nessun’altra timeline disponibile.</p>}
              {otherTimelines.map(t => (
                <button key={t.id} type="button"
                  onClick={() => handleMovePhaseConfirm(movePhaseTarget, t.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--glass-bg-light)', color: 'var(--color-text-primary)', cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: t.color }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: 12 }}>
              <button type="button" onClick={() => setMovePhaseTarget(null)}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid var(--color-border-primary)', background: 'var(--glass-bg-light)', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Annulla
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Duplicate step to phase modal */}
      {duplicateStepTarget && timeline && (
        <motion.div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }} onClick={() => setDuplicateStepTarget(null)} />
          <motion.div className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 400, borderRadius: 20, overflow: 'hidden' }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-primary)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Duplica step in un'altra fase</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>Seleziona la fase di destinazione</p>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', padding: 12 }}>
              {timeline.phases.filter(p => p.id !== duplicateStepTarget.phase.id).map(p => (
                <button key={p.id} type="button"
                  onClick={() => handleDuplicateStepToPhase(duplicateStepTarget.step, duplicateStepTarget.phase, p.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--glass-bg-light)', color: 'var(--color-text-primary)', cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: p.color }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: 12 }}>
              <button type="button" onClick={() => setDuplicateStepTarget(null)}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid var(--color-border-primary)', background: 'var(--glass-bg-light)', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Annulla
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Move step modal */}
      {moveStepTarget && timeline && (
        <motion.div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }} onClick={() => setMoveStepTarget(null)} />
          <motion.div className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 400, borderRadius: 20, overflow: 'hidden' }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-primary)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Sposta step in un'altra fase</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>Seleziona la fase di destinazione</p>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', padding: 12 }}>
              {timeline.phases.filter(p => p.id !== moveStepTarget.phase.id).map(p => (
                <button key={p.id} type="button"
                  onClick={() => handleMoveStepConfirm(moveStepTarget.step, moveStepTarget.phase, p.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--glass-bg-light)', color: 'var(--color-text-primary)', cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: p.color }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: 12 }}>
              <button type="button" onClick={() => setMoveStepTarget(null)}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid var(--color-border-primary)', background: 'var(--glass-bg-light)', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Annulla
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddPhase && <AddPhaseModal timelineColor={accent} onClose={() => setShowAddPhase(false)} onSave={handleAddPhase} />}
      </AnimatePresence>
      <AnimatePresence>
        {shareModalOpen && publicUrl && (
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }} onClick={() => setShareModalOpen(false)} />
            <motion.div
              className="glass-card"
              style={{ position: 'relative', width: '100%', maxWidth: 480, borderRadius: 20, overflow: 'hidden' }}
              initial={{ opacity: 0, y: 28, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 28, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Share2 size={20} style={{ color: accent }} /> Condividi timeline
                </h2>
                <button onClick={() => setShareModalOpen(false)} style={{ padding: '6px 8px', borderRadius: 10, background: 'var(--glass-bg-medium)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
              </div>
              <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>
                  Chi riceve questo link può vedere la timeline in sola lettura (senza login).
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={publicUrl} style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none' }} />
                  <button
                    onClick={() => { navigator.clipboard.writeText(publicUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                    style={{ padding: '12px 18px', borderRadius: 12, border: 'none', background: accent, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                  >
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />} {copiedLink ? 'Copiato!' : 'Copia'}
                  </button>
                </div>
                {timeline?.share_token && (
                  <button onClick={handleRevokeShare} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    <Unlink size={14} /> Revoca link
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeStep && (
          <StepDrawer key={activeStep.step.id} step={activeStep.step} phase={activeStep.phase}
            timeline={timeline} onClose={() => setActiveStep(null)} onUpdate={handleUpdateStep} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimelineDetailPage;
