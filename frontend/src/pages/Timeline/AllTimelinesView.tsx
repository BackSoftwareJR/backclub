import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, AlertCircle, GitBranch,
  CheckCircle2, Circle, ChevronRight, Layers,
  SlidersHorizontal, X, Check, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import { timelineApi, type Timeline, type TimelinePhase, type TimelineStep } from '../../api/timeline';

// ── Layout constants ───────────────────────────────────────
const PAD_L = 170;   // left margin for labels
const PAD_R = 40;
const AXIS_H = 44;
const TL_GAP = 14;   // gap between timeline groups
const TL_HEADER_H = 28;
const LANE_H = 90;
const NODE_R = 12;

function toMs(d: string) { return new Date(d).getTime(); }
function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function buildTicks(minMs: number, maxMs: number, usablePx: number) {
  const dayRange = (maxMs - minMs) / 86_400_000;
  let stepMs: number;
  if (dayRange <= 14) stepMs = 86_400_000;
  else if (dayRange <= 60) stepMs = 86_400_000 * 7;
  else if (dayRange <= 365) stepMs = 86_400_000 * 30;
  else stepMs = 86_400_000 * 90;

  const ticks: { label: string; x: number }[] = [];
  let cur = minMs;
  while (cur <= maxMs + stepMs) {
    const x = PAD_L + ((cur - minMs) / (maxMs - minMs)) * usablePx;
    const d = new Date(cur);
    let label: string;
    if (dayRange <= 14) label = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    else if (dayRange <= 60) label = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('it-IT', { month: 'short' })}`;
    else if (dayRange <= 365) label = d.toLocaleString('it-IT', { month: 'short', year: '2-digit' });
    else label = d.toLocaleString('it-IT', { month: 'short', year: 'numeric' });
    ticks.push({ label, x });
    cur += stepMs;
  }
  return ticks;
}

// ── Master Canvas ──────────────────────────────────────────
interface MasterCanvasProps {
  timelines: Timeline[];
  onStepClick: (step: TimelineStep, phase: TimelinePhase, timeline: Timeline) => void;
}

const MasterCanvas: React.FC<MasterCanvasProps> = ({ timelines, onStepClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(960);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => setContainerW(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute global min/max from all timelines' phases
  const { minMs, maxMs } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    timelines.forEach(tl =>
      tl.phases.forEach(p => {
        mn = Math.min(mn, toMs(p.start_date));
        mx = Math.max(mx, toMs(p.end_date));
      }),
    );
    if (mn === Infinity) { mn = Date.now(); mx = mn + 86_400_000 * 60; }
    const pad = (mx - mn) * 0.04;
    return { minMs: mn - pad, maxMs: mx + pad };
  }, [timelines]);

  const usablePx = Math.max(0, containerW - PAD_L - PAD_R);
  const xFor = useCallback((iso: string | null | undefined) => {
    if (!iso) return PAD_L + usablePx / 2;
    return PAD_L + ((toMs(iso) - minMs) / (maxMs - minMs)) * usablePx;
  }, [minMs, maxMs, usablePx]);

  const ticks = useMemo(() => buildTicks(minMs, maxMs, usablePx), [minMs, maxMs, usablePx]);

  // Compute total canvas height
  const totalH = useMemo(() => {
    let h = AXIS_H;
    timelines.forEach(tl => {
      h += TL_HEADER_H + tl.phases.length * LANE_H + TL_GAP;
    });
    return h + 20;
  }, [timelines]);

  // Y offsets per timeline
  const tlOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = AXIS_H;
    timelines.forEach(tl => {
      offsets.push(y);
      y += TL_HEADER_H + tl.phases.length * LANE_H + TL_GAP;
    });
    return offsets;
  }, [timelines]);

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
      <svg width={containerW} height={totalH} style={{ display: 'block', userSelect: 'none' }}>
        <defs>
          {timelines.flatMap(tl =>
            tl.phases.map(p => (
              <filter key={`glow-all-${p.id}`} id={`glow-all-${p.id}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))
          )}
        </defs>

        {/* Axis background */}
        <rect x={0} y={0} width={containerW} height={AXIS_H} fill="rgba(255,255,255,0.025)" />

        {/* Tick lines + labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={AXIS_H - 5} x2={t.x} y2={totalH - 10}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="3,5" />
            <text x={t.x} y={AXIS_H - 14} textAnchor="middle"
              fontSize="10" fill="rgba(255,255,255,0.3)" fontFamily="system-ui">
              {t.label}
            </text>
            <line x1={t.x} y1={AXIS_H - 6} x2={t.x} y2={AXIS_H}
              stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
          </g>
        ))}

        {/* Now line */}
        {(() => {
          const nowX = xFor(new Date().toISOString().slice(0, 10));
          if (nowX < PAD_L || nowX > containerW - PAD_R) return null;
          return (
            <g>
              <line x1={nowX} y1={AXIS_H} x2={nowX} y2={totalH - 10}
                stroke="rgba(99,102,241,0.4)" strokeWidth={1.5} strokeDasharray="4,4" />
              <rect x={nowX - 14} y={2} width={28} height={16} rx={4} fill="rgba(99,102,241,0.6)" />
              <text x={nowX} y={13} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700" fontFamily="system-ui">OGGI</text>
            </g>
          );
        })()}

        {/* Timelines */}
        {timelines.map((tl, tlIdx) => {
          const tlY = tlOffsets[tlIdx];
          const accent = tl.color;
          const sortedPhases = [...tl.phases].sort((a, b) => a.sort_order - b.sort_order || a.start_date.localeCompare(b.start_date));

          const tlCompleted = tl.phases.reduce((a, p) => a + p.steps.filter(s => s.is_completed).length, 0);
          const tlTotal = tl.phases.reduce((a, p) => a + p.steps.length, 0);
          const tlPct = tlTotal > 0 ? Math.round((tlCompleted / tlTotal) * 100) : 0;

          return (
            <g key={tl.id}>
              {/* Timeline group separator */}
              {tlIdx > 0 && (
                <line x1={0} y1={tlY - TL_GAP / 2} x2={containerW} y2={tlY - TL_GAP / 2}
                  stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              )}

              {/* Timeline header row */}
              <rect x={0} y={tlY} width={PAD_L - 10} height={TL_HEADER_H}
                fill={`${accent}12`} rx={4} />
              <circle cx={14} cy={tlY + TL_HEADER_H / 2} r={5} fill={accent} opacity={0.9} />
              <text x={24} y={tlY + TL_HEADER_H / 2 + 4} fontSize="12" fontWeight="800" fill={accent} fontFamily="system-ui">
                {tl.name.length > 18 ? tl.name.slice(0, 18) + '…' : tl.name}
              </text>
              <text x={PAD_L - 14} y={tlY + TL_HEADER_H / 2 + 4} textAnchor="end" fontSize="10" fill={accent} opacity={0.65} fontFamily="system-ui">
                {tlPct}%
              </text>

              {/* Phase lanes */}
              {sortedPhases.map((phase, pIdx) => {
                const color = phase.color;
                const laneY = tlY + TL_HEADER_H + pIdx * LANE_H;
                const cy = laneY + LANE_H / 2;
                const sx = xFor(phase.start_date);
                const ex = xFor(phase.end_date);

                const sortedSteps = [...phase.steps].sort((a, b) => {
                  if (a.date_order && b.date_order) return a.date_order.localeCompare(b.date_order);
                  return a.sort_order - b.sort_order;
                });

                const allPts = [
                  sx,
                  ...sortedSteps.map(s => xFor(s.date_order ?? undefined)),
                  ex,
                ];

                let pathD = `M ${allPts[0]} ${cy}`;
                for (let i = 1; i < allPts.length; i++) {
                  const x0 = allPts[i - 1];
                  const x1 = allPts[i];
                  const dy = i % 2 === 0 ? -22 : 22;
                  const cpx1 = x0 + (x1 - x0) * 0.38;
                  const cpx2 = x0 + (x1 - x0) * 0.62;
                  pathD += ` C ${cpx1} ${cy + dy}, ${cpx2} ${cy + dy}, ${x1} ${cy}`;
                }

                const cDone = phase.steps.filter(s => s.is_completed).length;
                const cTotal = phase.steps.length || 1;
                const pPct = cDone / cTotal;

                return (
                  <g key={phase.id}>
                    {/* Lane line */}
                    <line x1={0} y1={laneY} x2={containerW} y2={laneY}
                      stroke="rgba(255,255,255,0.03)" strokeWidth={1} />

                    {/* Phase label */}
                    <text x={PAD_L - 14} y={cy + 4} textAnchor="end"
                      fontSize="11" fontWeight="700" fill={color} fontFamily="system-ui">
                      {phase.title.length > 14 ? phase.title.slice(0, 14) + '…' : phase.title}
                    </text>

                    {/* Background track */}
                    <path d={pathD} fill="none" stroke={color}
                      strokeOpacity={0.12} strokeWidth={2.5} strokeLinecap="round" />

                    {/* Animated arc */}
                    <motion.path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: pPct, opacity: 1 }}
                      transition={{ duration: 1.1, delay: tlIdx * 0.1 + pIdx * 0.12, ease: 'easeInOut' }} />

                    {/* Start/end dots */}
                    <circle cx={sx} cy={cy} r={7} fill={color} opacity={0.9} />
                    <text x={sx} y={cy + 19} textAnchor="middle"
                      fontSize="8.5" fill={color} opacity={0.55} fontFamily="system-ui">
                      {fmt(phase.start_date)}
                    </text>

                    <circle cx={ex} cy={cy} r={7} fill={color} opacity={0.9} />
                    {/* Flag */}
                    <polygon points={`${ex + 1},${cy - 18} ${ex + 11},${cy - 13} ${ex + 1},${cy - 8}`} fill={color} opacity={0.8} />
                    <line x1={ex + 1} y1={cy - 20} x2={ex + 1} y2={cy - 6} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
                    <text x={ex} y={cy + 19} textAnchor="middle"
                      fontSize="8.5" fill={color} opacity={0.55} fontFamily="system-ui">
                      {fmt(phase.end_date)}
                    </text>

                    {/* Steps */}
                    {sortedSteps.map((step, sIdx) => {
                      const sx2 = xFor(step.date_order ?? undefined);
                      const isCompleted = step.is_completed;
                      const isAbove = sIdx % 2 === 0;
                      const labelY = isAbove ? cy - NODE_R - 8 : cy + NODE_R + 18;

                      return (
                        <motion.g key={step.id} style={{ cursor: 'pointer' }}
                          onClick={() => onStepClick(step, phase, tl)}
                          initial={{ opacity: 0, scale: 0.4 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.25 + tlIdx * 0.08 + pIdx * 0.08 + sIdx * 0.05 }}>
                          {isCompleted && (
                            <circle cx={sx2} cy={cy} r={NODE_R + 6}
                              fill={color} opacity={0.12} filter={`url(#glow-all-${phase.id})`} />
                          )}
                          <circle cx={sx2} cy={cy} r={NODE_R}
                            fill={isCompleted ? color : '#1C1C1E'} stroke={color} strokeWidth={2} />
                          {isCompleted ? (
                            <polyline points={`${sx2 - 5},${cy} ${sx2 - 1},${cy + 4} ${sx2 + 6},${cy - 5}`}
                              fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                          ) : (
                            <text x={sx2} y={cy + 4} textAnchor="middle"
                              fontSize="9.5" fontWeight="700" fill={color} fontFamily="system-ui">
                              {sIdx + 1}
                            </text>
                          )}
                          <text x={sx2} y={labelY} textAnchor="middle"
                            fontSize="10" fontWeight="600" fill="#E5E5EA" fontFamily="system-ui">
                            {step.title.length > 12 ? step.title.slice(0, 12) + '…' : step.title}
                          </text>
                        </motion.g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Stat Card ──────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({ label, value, sub, color = '#6366f1' }) => (
  <div className="glass-card" style={{ borderRadius: 16, padding: '16px 20px', flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--color-text-quaternary)', marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{sub}</div>}
  </div>
);

// ── Filter Panel ───────────────────────────────────────────
interface FilterPanelProps {
  timelines: Timeline[];
  visibleTlIds: Set<number>;
  hiddenPhaseIds: Set<number>;
  onToggleTl: (id: number) => void;
  onTogglePhase: (id: number) => void;
  onResetAll: () => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  timelines, visibleTlIds, hiddenPhaseIds, onToggleTl, onTogglePhase, onResetAll, onClose,
}) => {
  const [expandedTls, setExpandedTls] = useState<Set<number>>(new Set(timelines.map(t => t.id)));

  const toggleExpand = (id: number) =>
    setExpandedTls(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalHidden = timelines.length - visibleTlIds.size +
    timelines.flatMap(tl => tl.phases).filter(p => hiddenPhaseIds.has(p.id)).length;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        style={{ position: 'fixed', inset: 0, zIndex: 45 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        style={{
          position: 'fixed', right: 0, top: 0, zIndex: 46,
          height: '100%', width: 320,
          background: 'var(--color-bg-secondary)',
          borderLeft: '1px solid var(--color-border-primary)',
          boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 14px', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={16} style={{ color: '#6366f1' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Filtri</span>
            {totalHidden > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 20, padding: '2px 9px' }}>
                {totalHidden} nascost{totalHidden === 1 ? 'o' : 'i'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onResetAll}
              style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px' }}>
              Reset
            </button>
            <button onClick={onClose}
              style={{ padding: '6px 8px', borderRadius: 10, background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-secondary)', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {timelines.map(tl => {
            const tlVisible = visibleTlIds.has(tl.id);
            const tlExpanded = expandedTls.has(tl.id);
            const hiddenPhasesInTl = tl.phases.filter(p => hiddenPhaseIds.has(p.id)).length;

            return (
              <div key={tl.id}
                style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${tlVisible ? tl.color + '33' : 'var(--color-border-secondary)'}`, transition: 'border-color 0.2s' }}>

                {/* Timeline row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: tlVisible ? `${tl.color}0C` : 'transparent' }}>
                  {/* Toggle switch */}
                  <button
                    onClick={() => onToggleTl(tl.id)}
                    style={{
                      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: tlVisible ? tl.color : 'rgba(255,255,255,0.12)',
                      position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: tlVisible ? 18 : 3,
                      width: 14, height: 14, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                  </button>

                  {/* Color dot + name */}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: tl.color, flexShrink: 0, boxShadow: tlVisible ? `0 0 7px ${tl.color}` : 'none', transition: 'box-shadow 0.2s' }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: tlVisible ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', transition: 'color 0.2s' }}>
                    {tl.name}
                  </span>

                  {/* Badge + expand */}
                  {tlVisible && tl.phases.length > 0 && (
                    <>
                      {hiddenPhasesInTl > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 7px', color: 'var(--color-text-tertiary)' }}>
                          {hiddenPhasesInTl} nascost{hiddenPhasesInTl === 1 ? 'a' : 'e'}
                        </span>
                      )}
                      <button onClick={() => toggleExpand(tl.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', padding: 0 }}>
                        {tlExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </>
                  )}
                </div>

                {/* Phases sub-list */}
                <AnimatePresence>
                  {tlVisible && tlExpanded && tl.phases.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
                    >
                      {tl.phases.map(phase => {
                        const phaseVisible = !hiddenPhaseIds.has(phase.id);
                        return (
                          <div key={phase.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px 9px 36px', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-bg-light)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            {/* Phase toggle */}
                            <button
                              onClick={() => onTogglePhase(phase.id)}
                              style={{
                                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                border: `2px solid ${phaseVisible ? phase.color : 'rgba(255,255,255,0.2)'}`,
                                background: phaseVisible ? phase.color : 'transparent',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}
                            >
                              {phaseVisible && <Check size={11} color="#fff" strokeWidth={3} />}
                            </button>

                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: phase.color, flexShrink: 0, opacity: phaseVisible ? 1 : 0.3 }} />
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: phaseVisible ? 'var(--color-text-secondary)' : 'var(--color-text-quaternary)', transition: 'color 0.15s', textDecoration: phaseVisible ? 'none' : 'line-through' }}>
                              {phase.title}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>
                              {phase.steps.length} step
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer summary */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--color-border-secondary)', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{visibleTlIds.size}</span>/{timelines.length} timeline ·{' '}
            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {timelines.filter(tl => visibleTlIds.has(tl.id)).flatMap(tl => tl.phases).filter(p => !hiddenPhaseIds.has(p.id)).length}
            </span> fasi visibili
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ── Main Component ─────────────────────────────────────────
const AllTimelinesView: React.FC = () => {
  const navigate = useNavigate();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState<{ step: TimelineStep; phase: TimelinePhase; tl: Timeline } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleTlIds, setVisibleTlIds] = useState<Set<number>>(new Set());
  const [hiddenPhaseIds, setHiddenPhaseIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await timelineApi.getAll();
      setTimelines(data);
      // Initialize: all visible by default
      setVisibleTlIds(new Set(data.map(tl => tl.id)));
      setHiddenPhaseIds(new Set());
    } catch { setError('Impossibile caricare le timeline'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter helpers
  const toggleTl = (id: number) =>
    setVisibleTlIds(prev => {
      const n = new Set(prev);
      if (n.has(id) && n.size > 1) n.delete(id); else n.add(id);
      return n;
    });

  const togglePhase = (id: number) =>
    setHiddenPhaseIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const resetFilters = () => {
    setVisibleTlIds(new Set(timelines.map(tl => tl.id)));
    setHiddenPhaseIds(new Set());
  };

  // Build filtered data for canvas
  const filteredTimelines = useMemo(() =>
    timelines
      .filter(tl => visibleTlIds.has(tl.id))
      .map(tl => ({ ...tl, phases: tl.phases.filter(p => !hiddenPhaseIds.has(p.id)) })),
    [timelines, visibleTlIds, hiddenPhaseIds],
  );

  // Global stats (from raw data, not filtered)
  const totalPhases = timelines.reduce((a, tl) => a + tl.phases.length, 0);
  const totalSteps = timelines.reduce((a, tl) => a + tl.total_steps, 0);
  const completedSteps = timelines.reduce((a, tl) => a + tl.completed_steps, 0);
  const overallPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Active filters badge count
  const activeFilterCount = (timelines.length - visibleTlIds.size) + hiddenPhaseIds.size;

  if (loading) return (
    <div data-context-menu="timeline" style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={40} className="animate-spin" style={{ color: '#6366f1' }} />
    </div>
  );

  if (error) return (
    <div data-context-menu="timeline" style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <AlertCircle size={44} style={{ color: 'var(--color-error)' }} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>{error}</p>
    </div>
  );

  return (
    <div data-context-menu="timeline" style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 28px 60px' }}>

      {/* Back */}
      <button onClick={() => navigate('/timeline')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 13, fontWeight: 500, marginBottom: 24, padding: 0 }}>
        <ArrowLeft size={15} /> Tutte le Timeline
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(99,102,241,0.4)' }}>
            <Layers size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: -0.5 }}>
              Panoramica Generale
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '3px 0 0' }}>
              Tutte le timeline su un unico canvas temporale
            </p>
          </div>
        </div>

        {/* Filter button */}
        {timelines.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowFilters(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 14, cursor: 'pointer',
              border: `1px solid ${activeFilterCount > 0 ? 'rgba(99,102,241,0.5)' : 'var(--color-border-primary)'}`,
              background: activeFilterCount > 0 ? 'rgba(99,102,241,0.12)' : 'var(--glass-bg-light)',
              color: activeFilterCount > 0 ? '#a5b4fc' : 'var(--color-text-secondary)',
              fontWeight: 600, fontSize: 14,
            }}
          >
            <SlidersHorizontal size={16} />
            Filtri
            {activeFilterCount > 0 && (
              <span style={{ background: '#6366f1', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 800, padding: '1px 7px', marginLeft: 2 }}>
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Timeline" value={timelines.length} sub="progetti attivi" color="#6366f1" />
        <StatCard label="Fasi totali" value={totalPhases} sub="su tutte le TL" color="#8b5cf6" />
        <StatCard label="Step completati" value={`${completedSteps}/${totalSteps}`} sub="milestones" color="#10b981" />
        <StatCard label="Avanzamento" value={`${overallPct}%`} sub="progresso globale" color={overallPct >= 80 ? '#10b981' : overallPct >= 40 ? '#f59e0b' : '#6366f1'} />
      </div>

      {/* Empty state */}
      {timelines.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ borderRadius: 24, padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={38} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Nessuna timeline ancora</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', margin: '8px 0 0' }}>Crea prima alcune timeline con fasi e step</p>
          </div>
          <button onClick={() => navigate('/timeline')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', marginTop: 8 }}>
            Vai alle Timeline <ChevronRight size={15} />
          </button>
        </motion.div>
      ) : (
        <>
          {/* Legend + filter summary */}
          <div className="glass-card" style={{ borderRadius: 16, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-quaternary)', letterSpacing: 0.8, textTransform: 'uppercase', flexShrink: 0 }}>Visibili</span>

            {timelines.map(tl => {
              const isTlVisible = visibleTlIds.has(tl.id);
              const visiblePhases = tl.phases.filter(p => !hiddenPhaseIds.has(p.id));
              return (
                <div key={tl.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '3px 10px', borderRadius: 20, border: `1px solid ${isTlVisible ? tl.color + '44' : 'rgba(255,255,255,0.06)'}`, background: isTlVisible ? `${tl.color}10` : 'transparent', opacity: isTlVisible ? 1 : 0.4, transition: 'all 0.15s' }}
                  onClick={() => navigate(`/timeline/${tl.id}`)}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: tl.color, boxShadow: isTlVisible ? `0 0 6px ${tl.color}` : 'none' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: isTlVisible ? tl.color : 'var(--color-text-quaternary)' }}>{tl.name}</span>
                  {isTlVisible && tl.phases.length > 0 && (
                    <span style={{ fontSize: 10, color: tl.color, opacity: 0.7 }}>{visiblePhases.length}/{tl.phases.length}</span>
                  )}
                  {isTlVisible && <ChevronRight size={10} style={{ color: tl.color, opacity: 0.6 }} />}
                </div>
              );
            })}

            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-quaternary)', flexShrink: 0 }}>
              Clicca uno step · OGGI = linea tratteggiata
            </span>
          </div>

          {/* Master Canvas */}
          <div className="glass-card" style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 28 }}>
            {filteredTimelines.length > 0 && filteredTimelines.some(tl => tl.phases.length > 0) ? (
              <MasterCanvas
                timelines={filteredTimelines}
                onStepClick={(step, phase, tl) => setActiveStep({ step, phase, tl })}
              />
            ) : (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Eye size={32} style={{ color: 'var(--color-text-quaternary)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'var(--color-text-quaternary)', margin: 0 }}>
                  Nessuna fase visibile — modifica i filtri per visualizzare il canvas
                </p>
                <button onClick={() => setShowFilters(true)}
                  style={{ marginTop: 14, padding: '8px 20px', borderRadius: 12, background: '#6366f1', border: 'none', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Apri Filtri
                </button>
              </div>
            )}
          </div>

          {/* Timeline list (compact) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {timelines.map(tl => {
              const pct = tl.total_steps > 0 ? Math.round((tl.completed_steps / tl.total_steps) * 100) : 0;
              return (
                <motion.div key={tl.id} className="glass-card"
                  style={{ borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', borderLeft: `4px solid ${tl.color}` }}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/timeline/${tl.id}`)}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: `${tl.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GitBranch size={18} style={{ color: tl.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', marginBottom: 6 }}>{tl.name}</div>
                    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <motion.div style={{ height: '100%', borderRadius: 99, background: pct === 100 ? '#10b981' : tl.color }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: tl.color }}>{pct}%</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>{tl.completed_steps}/{tl.total_steps} step</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {tl.phases.slice(0, 3).map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                          <span style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>{p.title.slice(0, 12)}</span>
                          {p.steps.filter(s => s.is_completed).length === p.steps.length && p.steps.length > 0
                            ? <CheckCircle2 size={9} style={{ color: '#10b981' }} />
                            : <Circle size={9} style={{ color: 'var(--color-text-quaternary)' }} />}
                        </div>
                      ))}
                      {tl.phases.length > 3 && (
                        <span style={{ fontSize: 10, color: 'var(--color-text-quaternary)', paddingLeft: 11 }}>+{tl.phases.length - 3} fasi</span>
                      )}
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            timelines={timelines}
            visibleTlIds={visibleTlIds}
            hiddenPhaseIds={hiddenPhaseIds}
            onToggleTl={toggleTl}
            onTogglePhase={togglePhase}
            onResetAll={resetFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {/* Mini step detail panel (no full drawer for this view) */}
      <AnimatePresence>
        {activeStep && (
          <>
            <motion.div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveStep(null)} />
            <motion.div className="glass-card"
              style={{
                position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
                zIndex: 50, width: '90%', maxWidth: 480, borderRadius: 20, overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 40, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 40, x: '-50%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${activeStep.phase.color}, ${activeStep.phase.color}66)` }} />
              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {activeStep.step.is_completed
                      ? <CheckCircle2 size={18} style={{ color: activeStep.phase.color }} />
                      : <Circle size={18} style={{ color: activeStep.phase.color }} />}
                    <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)', textDecoration: activeStep.step.is_completed ? 'line-through' : 'none', opacity: activeStep.step.is_completed ? 0.6 : 1 }}>
                      {activeStep.step.title}
                    </span>
                  </div>
                  <button onClick={() => setActiveStep(null)}
                    style={{ background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-secondary)', borderRadius: 10, padding: '6px 8px', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex' }}>
                    <ArrowLeft size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: activeStep.step.description ? 12 : 0 }}>
                  <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${activeStep.tl.color}18`, color: activeStep.tl.color }}>{activeStep.tl.name}</span>
                  <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${activeStep.phase.color}18`, color: activeStep.phase.color }}>{activeStep.phase.title}</span>
                  {activeStep.step.date_order && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>📅 {activeStep.step.date_order}</span>
                  )}
                </div>
                {activeStep.step.description && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>{activeStep.step.description}</p>
                )}
                <button onClick={() => { setActiveStep(null); navigate(`/timeline/${activeStep.tl.id}`); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: 'none', background: activeStep.phase.color, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Apri Timeline <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllTimelinesView;
