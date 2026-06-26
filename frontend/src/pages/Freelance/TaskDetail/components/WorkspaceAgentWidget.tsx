import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle,
  Eye, Send, Square, Play, RotateCcw, ThumbsUp, Loader2,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { workspaceAgentsApi } from '../../../../api/workspaceAgents';
import { taskDetailAiApi } from '../../../../api/taskDetailAi';
import type { WorkspaceAgent, WorkspaceAgentStatus } from '../../../../types/workspace';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentLog {
  timestamp: string;
  step_key:  string;
  title:     string;
  message:   string;
  status:    string;
}

interface ChatMsg {
  id:   string;
  role: 'user' | 'assistant';
  text: string;
}

interface Props { projectId: number; taskId: number }

// ─── Status config ────────────────────────────────────────────────────────────

interface StatusCfg {
  label:    string;
  color:    string;
  bg:       string;
  icon:     React.ReactNode;
  pulse:    boolean;
}

const S: Record<WorkspaceAgentStatus, StatusCfg> = {
  running:   { label: 'In esecuzione', color: '#0A84FF', bg: 'rgba(10,132,255,0.14)',  icon: <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />, pulse: true  },
  pending:   { label: 'In coda',       color: '#FF9500', bg: 'rgba(255,149,0,0.14)',   icon: <Clock size={10} />,                                                              pulse: true  },
  review:    { label: 'In revisione',  color: '#BF5AF2', bg: 'rgba(191,90,242,0.14)',  icon: <Eye size={10} />,                                                                pulse: false },
  completed: { label: 'Completato',    color: '#30D158', bg: 'rgba(48,209,88,0.14)',   icon: <CheckCircle2 size={10} />,                                                       pulse: false },
  failed:    { label: 'Fallito',       color: '#FF453A', bg: 'rgba(255,69,58,0.14)',   icon: <XCircle size={10} />,                                                            pulse: false },
  stopped:   { label: 'Interrotto',   color: '#636366', bg: 'rgba(99,99,102,0.14)',   icon: <AlertTriangle size={10} />,                                                      pulse: false },
};

const LIVE: WorkspaceAgentStatus[] = ['running', 'pending', 'review'];
const POLL_MS = 4000;
const MAX_LOGS = 12;

// Actions available per status
const ACTIONS: Record<WorkspaceAgentStatus, string[]> = {
  pending:   ['stop'],
  running:   ['stop', 'request_review'],
  review:    ['complete', 'restart'],
  completed: ['restart'],
  failed:    ['restart'],
  stopped:   ['restart'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseLogs(raw: string | null): AgentLog[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p as AgentLog[];
  } catch {
    return raw.split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l) as AgentLog; } catch { return null; }
    }).filter((x): x is AgentLog => x !== null);
  }
  return [];
}

function elapsed(from: string | null): string {
  if (!from) return '';
  const ms  = Date.now() - new Date(from).getTime();
  const s   = Math.floor(ms / 1000);
  const m   = Math.floor(s / 60);
  const h   = Math.floor(m / 60);
  if (h > 0)  return `${h}h ${m % 60}m`;
  if (m > 0)  return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ─── Progress ring (SVG) ─────────────────────────────────────────────────────

const ProgressRing: React.FC<{ pct: number; color: string; indeterminate?: boolean }> = ({ pct, color, indeterminate }) => {
  const r   = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <svg width={56} height={56} viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
      {/* Fill */}
      <motion.circle
        cx={28} cy={28} r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={false}
        animate={{
          strokeDashoffset: indeterminate ? [circ * 0.75, 0, -(circ * 0.75)] : circ - dash,
          rotate:           indeterminate ? [0, 360] : 0,
        }}
        transition={indeterminate
          ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: '28px 28px', transform: 'rotate(-90deg)' }}
      />
      {/* Label */}
      <text x={28} y={32} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
        {indeterminate ? '…' : `${pct}%`}
      </text>
    </svg>
  );
};

// ─── Log row ─────────────────────────────────────────────────────────────────

const LogRow: React.FC<{ entry: AgentLog; isLatest: boolean }> = ({ entry, isLatest }) => {
  const dotColor = entry.status === 'completed' ? '#30D158'
    : entry.status === 'error'    ? '#FF453A'
    : entry.status === 'running'  ? '#0A84FF'
    : 'rgba(255,255,255,0.25)';

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: 'flex', gap: 8, padding: '5px 12px', alignItems: 'flex-start' }}
    >
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0 }}>
        <motion.div
          animate={isLatest && entry.status !== 'completed' ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, boxShadow: isLatest ? `0 0 6px ${dotColor}` : 'none' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: isLatest ? 600 : 400, color: isLatest ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.title || entry.step_key}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {fmtTime(entry.timestamp)}
          </span>
        </div>
        {entry.message && (
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {entry.message}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ─── Action button ────────────────────────────────────────────────────────────

interface ActionBtnProps {
  actionKey: string;
  loading:   boolean;
  onClick:   () => void;
}

const ACTION_CFG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string; confirm?: string }> = {
  stop:           { label: 'Ferma',    icon: <Square size={11} />,      color: '#FF453A', bg: 'rgba(255,69,58,0.14)',   border: 'rgba(255,69,58,0.3)',   confirm: 'Fermare l\'agente in esecuzione?' },
  restart:        { label: 'Riavvia',  icon: <RotateCcw size={11} />,   color: '#FF9500', bg: 'rgba(255,149,0,0.14)',   border: 'rgba(255,149,0,0.3)',   confirm: 'Riavviare l\'agente dall\'inizio?' },
  request_review: { label: 'Review',   icon: <Eye size={11} />,          color: '#BF5AF2', bg: 'rgba(191,90,242,0.14)', border: 'rgba(191,90,242,0.3)' },
  complete:       { label: 'Completa', icon: <ThumbsUp size={11} />,     color: '#30D158', bg: 'rgba(48,209,88,0.14)',  border: 'rgba(48,209,88,0.3)',   confirm: 'Segnare l\'agente come completato?' },
  start:          { label: 'Avvia',    icon: <Play size={11} />,         color: '#0A84FF', bg: 'rgba(10,132,255,0.14)', border: 'rgba(10,132,255,0.3)' },
};

const ActionBtn: React.FC<ActionBtnProps> = ({ actionKey, loading, onClick }) => {
  const cfg = ACTION_CFG[actionKey];
  if (!cfg) return null;

  const handleClick = () => {
    if (cfg.confirm && !window.confirm(cfg.confirm)) return;
    onClick();
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 11px', borderRadius: 8,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        color: cfg.color, fontSize: 10.5, fontWeight: 600,
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.55 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {loading ? <Loader2 size={10} style={{ animation: 'spin 0.9s linear infinite' }} /> : cfg.icon}
      {cfg.label}
    </motion.button>
  );
};

// ─── Main widget ──────────────────────────────────────────────────────────────

const WorkspaceAgentWidget: React.FC<Props> = ({ projectId, taskId }) => {
  const [agent, setAgent]       = useState<WorkspaceAgent | null>(null);
  const [logs,  setLogs]        = useState<AgentLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [actionLoading, setAL]  = useState<string | null>(null);
  const [tab, setTab]           = useState<'log' | 'chat'>('log');
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatIn, setChatIn]     = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [elapsed_, setElapsed]  = useState('');

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAgent = useCallback(async () => {
    try {
      const agents = await workspaceAgentsApi.getProjectAgents(projectId);
      const found  = agents.find((a) => a.crm_task_id === taskId) ?? null;
      setAgent(found);
      if (found) {
        const parsed = parseLogs(found.logs).slice(-MAX_LOGS);
        setLogs(parsed);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => { fetchAgent(); }, [fetchAgent]);

  // Polling when live
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (agent && LIVE.includes(agent.status)) {
      pollRef.current = setInterval(fetchAgent, POLL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [agent?.status, fetchAgent]);

  // Elapsed timer
  useEffect(() => {
    if (!agent?.started_at || !LIVE.includes(agent.status)) return;
    setElapsed(elapsed(agent.started_at));
    const t = setInterval(() => setElapsed(elapsed(agent.started_at)), 1000);
    return () => clearInterval(t);
  }, [agent?.started_at, agent?.status]);

  // Auto-scroll logs
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs.length]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs.length, chatBusy]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const doAction = useCallback(async (action: string) => {
    if (!agent || actionLoading) return;
    setAL(action);
    try {
      const updated = await workspaceAgentsApi.agentAction(
        projectId, agent.id,
        action as 'start' | 'stop' | 'restart' | 'complete' | 'request_review',
      );
      setAgent(updated);
      setLogs(parseLogs(updated.logs).slice(-MAX_LOGS));
    } catch (e) {
      alert(`Errore: ${(e as Error).message}`);
    } finally {
      setAL(null);
    }
  }, [agent, projectId, actionLoading]);

  // ── Chat ──────────────────────────────────────────────────────────────────

  const sendChat = async () => {
    const txt = chatIn.trim();
    if (!txt || chatBusy || !agent) return;
    setChatIn('');
    setChatMsgs((p) => [...p, { id: `${Date.now()}`, role: 'user', text: txt }]);
    setChatBusy(true);
    try {
      const ctx = logs.slice(-3).map((l) => `- ${l.title}: ${l.message}`).join('\n');
      const enriched = `[Agente: "${agent.title}" — ${agent.status}]\n${ctx ? `Log:\n${ctx}\n\n` : ''}Domanda: ${txt}`;
      const res = await taskDetailAiApi.ask(projectId, taskId, enriched);
      setChatMsgs((p) => [...p, { id: `${Date.now()}-r`, role: 'assistant', text: res.data?.answer ?? 'Nessuna risposta.' }]);
    } catch {
      setChatMsgs((p) => [...p, { id: `${Date.now()}-e`, role: 'assistant', text: 'Errore di connessione.' }]);
    } finally { setChatBusy(false); }
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const cfg     = agent ? (S[agent.status] ?? S.stopped) : null;
  const isLive  = agent ? LIVE.includes(agent.status) : false;
  const pct     = agent?.crm_task?.progress ?? (agent?.status === 'completed' ? 100 : 0);
  const indet   = isLive && pct === 0;
  const actions = agent ? (ACTIONS[agent.status] ?? []) : [];

  // ── Loading / empty states ─────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
      Caricamento…
    </div>
  );

  if (!agent) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, padding: 20, textAlign: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Bot size={20} color="rgba(255,255,255,0.18)" />
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '0 0 4px' }}>Nessun agente collegato</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: 0 }}>Crea un agente nel WorkSpace e collegalo a questa task</p>
      </div>
      <a href="/workspace" style={{ fontSize: 11, color: '#0A84FF', textDecoration: 'none', padding: '5px 12px', borderRadius: 8, background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.22)' }}>
        Vai a WorkSpace
      </a>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Hero: status + progress + meta ── */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${cfg!.bg}, transparent)`,
      }}>
        {/* Row 1: title + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <ProgressRing pct={pct} color={cfg!.color} indeterminate={indet} />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 5,
                background: cfg!.bg, border: `1px solid ${cfg!.color}44`,
              }}>
                <span style={{ color: cfg!.color }}>{cfg!.icon}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: cfg!.color, letterSpacing: '0.04em' }}>
                  {cfg!.label}
                </span>
                {isLive && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ width: 5, height: 5, borderRadius: '50%', background: cfg!.color, boxShadow: `0 0 5px ${cfg!.color}` }}
                  />
                )}
              </div>
              {agent.queue_position != null && agent.queue_position > 0 && (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
                  Posizione #{agent.queue_position}
                </span>
              )}
              <button
                type="button"
                onClick={() => fetchAgent()}
                title="Aggiorna"
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.22)', display: 'flex', padding: 2, transition: 'color 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}
              >
                <RefreshCw size={11} />
              </button>
            </div>

            {/* Title */}
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent.title}
            </div>

            {/* Timestamps */}
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, display: 'flex', gap: 8 }}>
              {agent.started_at && (
                <span>Avviato {fmtTime(agent.started_at)}</span>
              )}
              {elapsed_ && isLive && (
                <span style={{ color: cfg!.color, fontWeight: 600 }}>· {elapsed_}</span>
              )}
              {agent.completed_at && (
                <span>Completato {fmtTime(agent.completed_at)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Avanzamento</span>
            <span style={{ fontSize: 9.5, color: cfg!.color, fontWeight: 700 }}>{indet ? '…' : `${pct}%`}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
            <motion.div
              initial={false}
              animate={{ width: indet ? '40%' : `${pct}%` }}
              transition={{ duration: indet ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: '100%', borderRadius: 2,
                background: `linear-gradient(90deg, ${cfg!.color}aa, ${cfg!.color})`,
                boxShadow: `0 0 8px ${cfg!.color}66`,
                position: 'absolute', left: 0, top: 0,
              }}
            />
            {indet && (
              <motion.div
                animate={{ left: ['-40%', '140%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', top: 0, width: '40%', height: '100%', background: `linear-gradient(90deg, transparent, ${cfg!.color}88, transparent)`, borderRadius: 2 }}
              />
            )}
          </div>
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {actions.map((act) => (
              <ActionBtn
                key={act}
                actionKey={act}
                loading={actionLoading === act}
                onClick={() => doAction(act)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 2, padding: '5px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        {(['log', 'chat'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); if (t === 'chat') setTimeout(() => inputRef.current?.focus(), 80); }}
            style={{
              fontSize: 10, padding: '2px 9px', borderRadius: 5, border: 'none', cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              background: tab === t ? `${cfg!.color}1a` : 'transparent',
              color: tab === t ? cfg!.color : 'rgba(255,255,255,0.3)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'log' ? '📋 Log' : '💬 Chiedi'}
          </button>
        ))}
        {logs.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.2)', alignSelf: 'center' }}>
            {logs.length} step
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {tab === 'log' ? (
            <motion.div
              key="log"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingTop: 4 }}
            >
              {logs.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                  <ChevronRight size={18} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.25 }} />
                  Nessun log disponibile
                </div>
              ) : (
                logs.map((entry, i) => (
                  <LogRow key={`${entry.timestamp}-${i}`} entry={entry} isLatest={i === logs.length - 1} />
                ))
              )}

              {/* Result box */}
              {agent.status === 'completed' && agent.result && (
                <div style={{ margin: '8px 12px', padding: '8px 10px', borderRadius: 8, background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#30D158', margin: '0 0 3px' }}>✓ Risultato</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.45 }}>
                    {typeof agent.result === 'string'
                      ? agent.result.slice(0, 300) + (agent.result.length > 300 ? '…' : '')
                      : JSON.stringify(agent.result).slice(0, 300)}
                  </p>
                </div>
              )}

              {/* Review message */}
              {agent.status === 'review' && agent.review_message && (
                <div style={{ margin: '8px 12px', padding: '8px 10px', borderRadius: 8, background: 'rgba(191,90,242,0.08)', border: '1px solid rgba(191,90,242,0.2)' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#BF5AF2', margin: '0 0 3px' }}>👁 Messaggio revisione</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.45 }}>{agent.review_message}</p>
                </div>
              )}

              <div ref={logEndRef} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '8px 0 4px' }}>
                {chatMsgs.length === 0 && (
                  <div style={{ padding: '16px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>
                    Fai una domanda all'AI sull'agente…
                  </div>
                )}
                {chatMsgs.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', padding: '3px 12px' }}>
                    <div style={{
                      maxWidth: '85%', padding: '6px 10px',
                      borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '3px 12px 12px 12px',
                      background: m.role === 'user' ? 'rgba(10,132,255,0.18)' : 'rgba(255,255,255,0.055)',
                      border: `1px solid ${m.role === 'user' ? 'rgba(10,132,255,0.28)' : 'rgba(255,255,255,0.07)'}`,
                      fontSize: 11, color: 'rgba(255,255,255,0.84)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatBusy && (
                  <div style={{ padding: '4px 12px', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }}
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: '6px 10px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', gap: 6 }}>
                <input
                  ref={inputRef}
                  value={chatIn}
                  onChange={(e) => setChatIn(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Chiedi sull'agente…"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 8, padding: '5px 9px', fontSize: 11, color: 'rgba(255,255,255,0.85)', outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = `${cfg!.color}66`; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                />
                <button
                  type="button"
                  onClick={sendChat}
                  disabled={!chatIn.trim() || chatBusy}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: 'none',
                    background: chatIn.trim() && !chatBusy ? cfg!.color : 'rgba(255,255,255,0.06)',
                    color: '#fff', cursor: chatIn.trim() && !chatBusy ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                  }}
                >
                  <Send size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorkspaceAgentWidget;
