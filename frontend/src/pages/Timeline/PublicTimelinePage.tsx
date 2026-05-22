import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertCircle, CheckCircle2, Circle, Check, Layers, MoveHorizontal, Minus, Plus } from 'lucide-react';
import { timelineApi, type Timeline, type TimelinePhase, type TimelineStep } from '../../api/timeline';

// Dark theme tokens (page is always dark)
const DARK = {
  bg: '#0a0a0c',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f2f2f7',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  accent: '#6366f1',
  success: '#10b981',
};

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Layout: responsive padding and lane height
const CANVAS_PAD_L = 72;
const CANVAS_PAD_R = 48;
const AXIS_H_MOBILE = 40;
const AXIS_H_DESKTOP = 48;
const LANE_H_MOBILE = 72;
const LANE_H_DESKTOP = 96;
const NODE_R_MOBILE = 10;
const NODE_R_DESKTOP = 13;
const MOBILE_BREAK = 640;

function toMs(d: string) { return new Date(d).getTime(); }
function fmt(iso: string | null | undefined, short = false) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', short ? { day: '2-digit', month: 'short' } : { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildAxisTicks(minMs: number, maxMs: number, totalPx: number, padL: number): { label: string; x: number }[] {
  const msRange = maxMs - minMs;
  if (msRange <= 0) return [];
  const dayRange = msRange / 86_400_000;
  const ticks: { label: string; x: number }[] = [];
  let stepMs: number;
  if (dayRange <= 14) stepMs = 86_400_000 * 1;
  else if (dayRange <= 60) stepMs = 86_400_000 * 7;
  else if (dayRange <= 365) stepMs = 86_400_000 * 30;
  else stepMs = 86_400_000 * 90;
  let cursor = minMs;
  while (cursor <= maxMs + stepMs) {
    const x = padL + ((cursor - minMs) / msRange) * totalPx;
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

// Zoom limits: months visible in viewport (0.25 = zoom in, 4 = zoom out)
const MIN_MONTHS_VISIBLE = 0.25;
const MAX_MONTHS_VISIBLE = 6;

// ── Read-only Unified Canvas: scale by monthsVisible, horizontal scroll ──
const UnifiedCanvasReadOnly: React.FC<{
  timeline: Timeline;
  monthsVisible: number;
  onStepClick: (step: TimelineStep, phase: TimelinePhase) => void;
}> = ({ timeline, monthsVisible, onStepClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(800);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => setContainerW(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isMobile = containerW < MOBILE_BREAK;
  const AXIS_H = isMobile ? AXIS_H_MOBILE : AXIS_H_DESKTOP;
  const LANE_H = isMobile ? LANE_H_MOBILE : LANE_H_DESKTOP;
  const NODE_R = isMobile ? NODE_R_MOBILE : NODE_R_DESKTOP;
  const padL = isMobile ? 56 : CANVAS_PAD_L;
  const padR = isMobile ? 32 : CANVAS_PAD_R;

  const phases = useMemo(() =>
    [...timeline.phases].sort((a, b) => a.sort_order - b.sort_order || a.start_date.localeCompare(b.start_date)),
    [timeline.phases]);

  const { minMs, maxMs } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    phases.forEach(p => { mn = Math.min(mn, toMs(p.start_date)); mx = Math.max(mx, toMs(p.end_date)); });
    if (mn === Infinity) { mn = Date.now(); mx = mn + ONE_MONTH_MS; }
    const pad = (mx - mn) * 0.03;
    return { minMs: mn - pad, maxMs: mx + pad };
  }, [phases]);

  // monthsVisible = how many months fit in viewport; higher = more compressed (allunga), lower = more spread (restringi)
  const msRange = maxMs - minMs;
  const canvasWidth = Math.max(containerW, (msRange / ONE_MONTH_MS) * (containerW / monthsVisible));
  const usablePx = Math.max(0, canvasWidth - padL - padR);
  const totalH = AXIS_H + phases.length * LANE_H + (isMobile ? 12 : 20);
  const xFor = useCallback((iso: string | null | undefined) => {
    if (!iso || msRange <= 0) return padL + usablePx / 2;
    return padL + ((toMs(iso) - minMs) / msRange) * usablePx;
  }, [minMs, maxMs, usablePx, padL, msRange]);

  const ticks = useMemo(() => buildAxisTicks(minMs, maxMs, usablePx, padL), [minMs, maxMs, usablePx, padL]);
  if (phases.length === 0) return null;

  const arcDy = isMobile ? 20 : 28;
  const titleLen = isMobile ? 8 : 11;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarGutter: 'stable',
        }}
      >
        <svg
          viewBox={`0 0 ${canvasWidth} ${totalH}`}
          width={canvasWidth}
          height={totalH}
          style={{ display: 'block', userSelect: 'none' }}
        >
        <defs>
          {phases.map(p => (
            <filter key={p.id} id={`glow-pub-${p.id}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>
        <rect x={0} y={0} width={canvasWidth} height={AXIS_H} fill={DARK.bgCard} />
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={AXIS_H - 6} x2={t.x} y2={totalH - 10} stroke={DARK.border} strokeWidth={1} strokeDasharray="3,4" />
            <text x={t.x} y={AXIS_H - 14} textAnchor="middle" fontSize={isMobile ? 9 : 10} fill={DARK.textMuted} fontFamily="system-ui">{t.label}</text>
            <line x1={t.x} y1={AXIS_H - 8} x2={t.x} y2={AXIS_H} stroke={DARK.border} strokeWidth={1} />
          </g>
        ))}
        {/* OGGI */}
        {(() => {
          const nowX = xFor(new Date().toISOString().slice(0, 10));
          if (nowX < padL || nowX > canvasWidth - padR) return null;
          return (
            <g>
              <line x1={nowX} y1={AXIS_H} x2={nowX} y2={totalH - 10} stroke="rgba(99,102,241,0.5)" strokeWidth={1.5} strokeDasharray="4,4" />
              <rect x={nowX - (isMobile ? 14 : 16)} y={2} width={isMobile ? 28 : 32} height={16} rx={4} fill="rgba(99,102,241,0.7)" />
              <text x={nowX} y={isMobile ? 12 : 14} textAnchor="middle" fontSize={isMobile ? 9 : 10} fill="#fff" fontWeight="700" fontFamily="system-ui">OGGI</text>
            </g>
          );
        })()}
        {phases.map((phase, pIdx) => {
          const color = phase.color;
          const laneY = AXIS_H + pIdx * LANE_H;
          const cy = laneY + LANE_H / 2;
          const sx = xFor(phase.start_date);
          const ex = xFor(phase.end_date);
          const sortedSteps = [...phase.steps].sort((a, b) => {
            if (a.date_order && b.date_order) return a.date_order.localeCompare(b.date_order);
            return a.sort_order - b.sort_order;
          });
          const allPts = [{ x: sx, step: null }, ...sortedSteps.map(s => ({ x: xFor(s.date_order ?? phase.start_date), step: s })), { x: ex, step: null }];
          let pathD = `M ${allPts[0].x} ${cy}`;
          const segmentLengths: number[] = [];
          for (let i = 1; i < allPts.length; i++) {
            const x0 = allPts[i - 1].x, x1 = allPts[i].x, dy = i % 2 === 0 ? -arcDy : arcDy;
            const cp1x = x0 + (x1 - x0) * 0.38, cp2x = x0 + (x1 - x0) * 0.62;
            pathD += ` C ${cp1x} ${cy + dy}, ${cp2x} ${cy + dy}, ${x1} ${cy}`;
            const d01 = Math.hypot(cp1x - x0, dy);
            const d12 = Math.abs(cp2x - cp1x);
            const d23 = Math.hypot(x1 - cp2x, dy);
            segmentLengths.push((d01 + d12 + d23) / 2);
          }
          let lastReached = 0;
          for (let i = 1; i < allPts.length - 1; i++) {
            if (allPts[i].step?.is_completed) lastReached = i;
          }
          if (lastReached === allPts.length - 2 && allPts[allPts.length - 2].step?.is_completed) lastReached = allPts.length - 1;
          const totalPathLen = segmentLengths.reduce((a, b) => a + b, 0);
          let cumLen = 0;
          for (let i = 0; i < lastReached; i++) cumLen += segmentLengths[i];
          const pathProgress = totalPathLen > 0 ? Math.min(1, cumLen / totalPathLen) : 0;
          const pct = phase.steps.length ? Math.round((phase.steps.filter(s => s.is_completed).length / phase.steps.length) * 100) : 0;
          return (
            <g key={phase.id}>
              <line x1={0} y1={laneY} x2={canvasWidth} y2={laneY} stroke={DARK.border} strokeWidth={1} />
              <text x={padL - 8} y={cy + 4} textAnchor="end" fontSize={isMobile ? 10 : 11.5} fontWeight="700" fill={color} fontFamily="system-ui">{phase.title.length > titleLen ? phase.title.slice(0, titleLen) + '…' : phase.title}</text>
              <text x={padL - 8} y={cy + 18} textAnchor="end" fontSize={isMobile ? 8.5 : 9.5} fill={DARK.textMuted} fontFamily="system-ui">{pct}%</text>
              <path d={pathD} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={isMobile ? 2.5 : 3} strokeLinecap="round" />
              <motion.path d={pathD} fill="none" stroke={color} strokeWidth={isMobile ? 2.5 : 3} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: pathProgress }} transition={{ duration: 1.2, delay: pIdx * 0.15 }} />
              <circle cx={sx} cy={cy} r={isMobile ? 6 : 8} fill={color} opacity={0.9} />
              <text x={sx} y={cy + (isMobile ? 18 : 22)} textAnchor="middle" fontSize={isMobile ? 8 : 9} fill={color} opacity={0.8} fontFamily="system-ui">{fmt(phase.start_date, true)}</text>
              <circle cx={ex} cy={cy} r={isMobile ? 6 : 8} fill={color} opacity={0.9} />
              <polygon points={`${ex + 2},${cy - (isMobile ? 18 : 24)} ${ex + (isMobile ? 10 : 14)},${cy - (isMobile ? 14 : 18)} ${ex + 2},${cy - (isMobile ? 10 : 12)}`} fill={color} opacity={0.85} />
              <line x1={ex + 2} y1={cy - (isMobile ? 20 : 26)} x2={ex + 2} y2={cy - (isMobile ? 8 : 10)} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
              <text x={ex} y={cy + (isMobile ? 18 : 22)} textAnchor="middle" fontSize={isMobile ? 8 : 9} fill={color} opacity={0.8} fontFamily="system-ui">{fmt(phase.end_date, true)}</text>
              {sortedSteps.map((step, sIdx) => {
                const sx2 = xFor(step.date_order ?? undefined);
                const isAbove = sIdx % 2 === 0;
                const labelY = isAbove ? cy - NODE_R - (isMobile ? 8 : 10) : cy + NODE_R + (isMobile ? 16 : 20);
                const clTotal = step.checklist_items?.length ?? 0;
                const clDone = step.checklist_items?.filter(c => c.is_completed).length ?? 0;
                return (
                  <motion.g key={step.id} style={{ cursor: 'pointer' }} onClick={() => onStepClick(step, phase)}
                    initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + pIdx * 0.12 + sIdx * 0.07 }}>
                    {step.is_completed && <circle cx={sx2} cy={cy} r={NODE_R + (isMobile ? 5 : 7)} fill={color} opacity={0.15} filter={`url(#glow-pub-${phase.id})`} />}
                    <circle cx={sx2} cy={cy} r={NODE_R} fill={step.is_completed ? color : DARK.bg} stroke={color} strokeWidth={isMobile ? 2 : 2.5} />
                    {step.is_completed ? (
                      <polyline points={`${sx2 - 5},${cy} ${sx2 - 1},${cy + 4} ${sx2 + 6},${cy - 5}`} fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <text x={sx2} y={cy + 4} textAnchor="middle" fontSize={isMobile ? 9 : 10} fontWeight="700" fill={color} fontFamily="system-ui">{sIdx + 1}</text>
                    )}
                    <text x={sx2} y={labelY} textAnchor="middle" fontSize={isMobile ? 9.5 : 10.5} fontWeight="600" fill={DARK.text} fontFamily="system-ui">{step.title.length > (isMobile ? 10 : 13) ? step.title.slice(0, isMobile ? 10 : 13) + '…' : step.title}</text>
                    {clTotal > 0 && <text x={sx2} y={labelY + (isAbove ? -12 : 14)} textAnchor="middle" fontSize={isMobile ? 8 : 9} fill={color} opacity={0.7} fontFamily="system-ui">{clDone}/{clTotal}</text>}
                  </motion.g>
                );
              })}
            </g>
          );
        })}
        </svg>
      </div>
      <div style={{ padding: '8px 4px 0', display: 'flex', alignItems: 'center', gap: 6, color: DARK.textMuted, fontSize: 11 }}>
        <MoveHorizontal size={12} />
        <span>Scorri per vedere tutto il periodo</span>
      </div>
    </div>
  );
};

// ── Read-only Step Drawer (dark, responsive, full width on mobile) ──
const StepDrawerReadOnly: React.FC<{
  step: TimelineStep;
  phase: TimelinePhase;
  timeline: Timeline;
  onClose: () => void;
}> = ({ step, phase, timeline, onClose }) => {
  const accent = phase.color || timeline.color;
  const clTotal = step.checklist_items.length;
  const clDone = step.checklist_items.filter(c => c.is_completed).length;
  const clPct = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0;

  return (
    <>
      <motion.div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        style={{
          position: 'fixed', right: 0, top: 0, zIndex: 50, height: '100%', width: '100%', maxWidth: 440,
          background: DARK.bg, borderLeft: `1px solid ${DARK.border}`,
          boxShadow: '-24px 0 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: `1px solid ${DARK.border}`, flexShrink: 0, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2.5px solid ${accent}`, background: step.is_completed ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {step.is_completed ? <Check size={16} color="#fff" strokeWidth={3} /> : <Circle size={16} style={{ color: accent }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: DARK.textMuted, fontWeight: 500 }}>{fmt(step.date_order)}</div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${accent}22`, color: accent }}>{phase.title}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '10px', borderRadius: 12, cursor: 'pointer', background: DARK.bgCard, border: `1px solid ${DARK.border}`, color: DARK.textSecondary, display: 'flex', flexShrink: 0 }} aria-label="Chiudi"><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20, WebkitOverflowScrolling: 'touch' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: DARK.text, margin: 0, lineHeight: 1.35, textDecoration: step.is_completed ? 'line-through' : 'none', opacity: step.is_completed ? 0.6 : 1 }}>{step.title}</h2>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: DARK.textMuted, marginBottom: 6 }}>Descrizione</div>
            <p style={{ fontSize: 14, color: step.description ? DARK.textSecondary : DARK.textMuted, margin: 0, lineHeight: 1.6 }}>{step.description || '—'}</p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: DARK.textMuted }}>Checklist</div>
              {clTotal > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: clPct === 100 ? DARK.success : accent }}>{clDone}/{clTotal} · {clPct}%</span>}
            </div>
            {clTotal > 0 && (
              <div style={{ height: 5, borderRadius: 99, background: DARK.bgCard, overflow: 'hidden', marginBottom: 10 }}>
                <motion.div style={{ height: '100%', width: `${clPct}%`, borderRadius: 99, background: clPct === 100 ? DARK.success : accent }} initial={{ width: 0 }} animate={{ width: `${clPct}%` }} transition={{ duration: 0.4 }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {step.checklist_items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: DARK.bgCard, border: `1px solid ${DARK.border}` }}>
                  {item.is_completed ? <CheckCircle2 size={20} style={{ color: accent, flexShrink: 0 }} /> : <Circle size={20} style={{ color: DARK.textMuted, flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontSize: 14, color: item.is_completed ? DARK.textMuted : DARK.text, textDecoration: item.is_completed ? 'line-through' : 'none' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ── Main public page ────────────────────────────────────────
const PublicTimelinePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState<{ step: TimelineStep; phase: TimelinePhase } | null>(null);
  const [monthsVisible, setMonthsVisible] = useState(1);

  useEffect(() => {
    if (!token) return;
    timelineApi.getPublicByToken(token).then(setTimeline).catch(() => setError('Link non valido o scaduto')).finally(() => setLoading(false));
  }, [token]);

  const sortedPhases = useMemo(() =>
    timeline ? [...timeline.phases].sort((a, b) => a.sort_order - b.sort_order || a.start_date.localeCompare(b.start_date)) : [],
    [timeline]);

  const totalSteps = timeline?.phases.reduce((a, p) => a + p.steps.length, 0) ?? 0;
  const completedSteps = timeline?.phases.reduce((a, p) => a + p.steps.filter(s => s.is_completed).length, 0) ?? 0;
  const overallPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const accent = timeline?.color ?? '#6366f1';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: DARK.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={44} className="animate-spin" style={{ color: DARK.accent }} />
    </div>
  );

  if (error || !timeline) return (
    <div style={{ minHeight: '100vh', background: DARK.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <AlertCircle size={48} style={{ color: '#ef4444' }} />
      <p style={{ color: DARK.textSecondary, fontSize: 16, textAlign: 'center' }}>{error || 'Timeline non disponibile'}</p>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: DARK.bg,
        padding: 'clamp(12px, 3vw, 24px) clamp(16px, 4vw, 28px) clamp(24px, 6vw, 48px)',
        color: DARK.text,
      }}
    >
      {/* Minimal header: responsive, dark */}
      <div style={{ marginBottom: 'clamp(16px, 4vw, 24px)' }}>
        <div style={{ display: 'inline-block', marginBottom: 10, padding: '5px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', fontSize: 12, fontWeight: 700 }}>
          Visualizzazione pubblica
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 3vw, 14px)', flexWrap: 'wrap' }}>
          <div style={{ width: 'clamp(44px, 10vw, 52px)', height: 'clamp(44px, 10vw, 52px)', borderRadius: 14, flexShrink: 0, background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 24px ${accent}40` }}>
            <Layers size={24} color="#fff" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 800, color: DARK.text, margin: 0, letterSpacing: -0.5, lineHeight: 1.2 }}>{timeline.name}</h1>
            {timeline.description && <p style={{ fontSize: 13, color: DARK.textSecondary, margin: '2px 0 0', lineHeight: 1.4 }}>{timeline.description}</p>}
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ height: 6, width: 100, minWidth: 80, borderRadius: 99, background: DARK.bgCard, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', borderRadius: 99, background: overallPct === 100 ? DARK.success : accent }} initial={{ width: 0 }} animate={{ width: `${overallPct}%` }} transition={{ duration: 0.8 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: overallPct === 100 ? DARK.success : accent }}>{overallPct}%</span>
          <span style={{ fontSize: 12, color: DARK.textMuted }}>{completedSteps}/{totalSteps} step</span>
        </div>
      </div>

      {/* Canvas: scrollable, 1 month = viewport width */}
      {sortedPhases.length > 0 && (
        <div style={{ borderRadius: 16, overflow: 'hidden', background: DARK.bgCard, border: `1px solid ${DARK.border}`, marginBottom: 'clamp(16px, 4vw, 24px)' }}>
          {/* Controlli: Allunga (−) = timeline più lunga, step distanziati | Accorcia (+) = periodo più lungo in vista */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px', borderBottom: `1px solid ${DARK.border}`, gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: DARK.textMuted, fontWeight: 600 }}>Scala orizzontale</span>
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
                    width: 40, height: 40, borderRadius: 12, border: `1px solid ${DARK.border}`, background: monthsVisible <= MIN_MONTHS_VISIBLE ? DARK.bg : DARK.bgCard,
                    color: monthsVisible <= MIN_MONTHS_VISIBLE ? DARK.textMuted : DARK.text, cursor: monthsVisible <= MIN_MONTHS_VISIBLE ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
                  }}
                >
                  <Minus size={18} strokeWidth={2.5} />
                </button>
                <span style={{ fontSize: 10, color: DARK.textMuted }}>Allunga</span>
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
                    width: 40, height: 40, borderRadius: 12, border: `1px solid ${DARK.border}`, background: monthsVisible >= MAX_MONTHS_VISIBLE ? DARK.bg : DARK.bgCard,
                    color: monthsVisible >= MAX_MONTHS_VISIBLE ? DARK.textMuted : DARK.text, cursor: monthsVisible >= MAX_MONTHS_VISIBLE ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
                  }}
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
                <span style={{ fontSize: 10, color: DARK.textMuted }}>Accorcia</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: DARK.textMuted }}>{monthsVisible <= 0.5 ? `~${Math.round(monthsVisible * 30)} gg` : `${monthsVisible} mese${monthsVisible !== 1 ? 'i' : ''}`} in vista</span>
          </div>
          <div style={{ padding: '12px 0 0' }}>
            <UnifiedCanvasReadOnly timeline={timeline} monthsVisible={monthsVisible} onStepClick={(s, p) => setActiveStep({ step: s, phase: p })} />
          </div>
          <p style={{ padding: '0 16px 12px', margin: 0, fontSize: 11, color: DARK.textMuted, textAlign: 'right' }}>Tocca uno step per i dettagli</p>
        </div>
      )}

      {/* Phase list (read-only, touch-friendly) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sortedPhases.map(phase => (
          <div key={phase.id} style={{ borderLeft: `3px solid ${phase.color}`, borderRadius: '0 12px 12px 0', background: DARK.bgCard, border: `1px solid ${DARK.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: phase.color, boxShadow: `0 0 8px ${phase.color}88`, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: DARK.text }}>{phase.title}</span>
              <span style={{ fontSize: 11, color: DARK.textMuted }}>{fmt(phase.start_date, true)} → {fmt(phase.end_date, true)} · {phase.steps.filter(s => s.is_completed).length}/{phase.steps.length}</span>
            </div>
            <div style={{ padding: '0 16px 14px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[...phase.steps].sort((a, b) => a.sort_order - b.sort_order).map(step => (
                <button
                  key={step.id}
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', color: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = DARK.bgCardHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setActiveStep({ step, phase })}
                >
                  {step.is_completed ? <CheckCircle2 size={18} style={{ color: phase.color, flexShrink: 0 }} /> : <Circle size={18} style={{ color: DARK.textMuted, flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontSize: 14, color: step.is_completed ? DARK.textMuted : DARK.text, textDecoration: step.is_completed ? 'line-through' : 'none' }}>{step.title}</span>
                  {step.checklist_items.length > 0 && <span style={{ fontSize: 12, color: DARK.textMuted }}>{step.checklist_items.filter(c => c.is_completed).length}/{step.checklist_items.length}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeStep && (
          <StepDrawerReadOnly
            key={activeStep.step.id}
            step={activeStep.step}
            phase={activeStep.phase}
            timeline={timeline}
            onClose={() => setActiveStep(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicTimelinePage;
