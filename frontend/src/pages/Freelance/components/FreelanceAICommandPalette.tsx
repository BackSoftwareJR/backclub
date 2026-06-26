import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence, useDragControls, useMotionValue } from 'framer-motion';
import {
  Bot, Send, Mic, MicOff, X, Trash2, Sparkles, Loader2,
  Minimize2, Maximize2, Navigation, Hash, ChevronRight,
} from 'lucide-react';
import { useFreelanceAIStore } from '../../../stores/useFreelanceAIStore';
import type { AIAction } from '../../../stores/useFreelanceAIStore';
import { useFreelanceAIContext } from '../../../hooks/useFreelanceAIContext';
import { useFreelanceAIActions } from '../../../hooks/useFreelanceAIActions';
import { usePageSnapshot } from '../../../hooks/usePageSnapshot';
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { FreelanceAICursor } from './FreelanceAICursor';
import { apiClient } from '../../../api/client';

// ─── TTS ─────────────────────────────────────────────────────────────────────

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'it-IT';
  utt.rate = 1.08;
  window.speechSynthesis.speak(utt);
}

// ─── Slash commands ───────────────────────────────────────────────────────────

interface SlashCommand {
  cmd:         string;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  /** If handler is present, execute directly without hitting the AI */
  handler?:    (arg: string, navigate: (path: string) => void) => AIAction[] | void;
}

const NAV_MAP: Record<string, string> = {
  dashboard: '/freelance',
  home:      '/freelance',
  progetti:  '/freelance/progetti',
  progetto:  '/freelance/progetti',
  task:      '/freelance/task',
  focus:     '/freelance/focus',
  chat:      '/freelance/chat',
  calendario:'/freelance/calendario',
  impostazioni: '/freelance/impostazioni',
  notifiche: '/freelance/notifiche',
  supporto:  '/freelance/supporto',
};

const SLASH_COMMANDS: SlashCommand[] = [
  {
    cmd: 'vai',
    label: '/vai [pagina]',
    description: 'Naviga a una sezione del CRM',
    icon: <Navigation size={11} />,
    handler: (arg) => {
      const key = arg.trim().toLowerCase();
      const path = NAV_MAP[key] ?? (key.startsWith('/') ? key : null);
      if (path) return [{ type: 'navigate', path }];
    },
  },
  {
    cmd: 'scrivi',
    label: '/scrivi [testo]',
    description: 'Inserisce testo nel campo attivo',
    icon: <Hash size={11} />,
    handler: (arg) => {
      if (arg.trim()) return [{ type: 'fill_active', text: arg.trim() }];
    },
  },
  {
    cmd: 'cerca',
    label: '/cerca [termine]',
    description: 'Cerca nel CRM (chiede all\'AI)',
    icon: <Sparkles size={11} />,
  },
  {
    cmd: 'brief',
    label: '/brief',
    description: 'Genera il brief AI della pagina corrente',
    icon: <Sparkles size={11} />,
  },
  {
    cmd: 'riassumi',
    label: '/riassumi',
    description: 'Riassumi il contenuto visibile',
    icon: <Sparkles size={11} />,
  },
  {
    cmd: 'aiuta',
    label: '/aiuta',
    description: 'Mostra cosa posso fare',
    icon: <Bot size={11} />,
  },
];

function parseSlash(value: string): { cmd: string; arg: string } | null {
  if (!value.startsWith('/')) return null;
  const [rawCmd, ...rest] = value.slice(1).split(' ');
  return { cmd: rawCmd.toLowerCase(), arg: rest.join(' ') };
}

function matchingCmds(partial: string): SlashCommand[] {
  if (!partial) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => c.cmd.startsWith(partial.toLowerCase()));
}

// ─── Action badge ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  navigate:     '⟶ Naviga',
  fill_active:  '✎ Compila',
  fill_element: '✎ Campo',
  highlight:    '◎ Evidenzia',
  scroll_to:    '↓ Scorri',
  click:        '↗ Clicca',
  speak:        '♪ Legge',
};

function ActionChip({ action }: { action: AIAction }) {
  const label  = ACTION_LABELS[action.type] ?? action.type;
  const detail = action.type === 'navigate' ? action.path
    : action.type === 'fill_active' ? action.text.slice(0, 22) + (action.text.length > 22 ? '…' : '')
    : '';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9.5, fontWeight: 600, letterSpacing: 0.3,
      padding: '2px 7px', borderRadius: 5,
      background: 'rgba(94,92,230,0.18)',
      border: '1px solid rgba(94,92,230,0.32)',
      color: '#a78bfa', whiteSpace: 'nowrap',
    }}>
      <Navigation size={8} />
      {label}{detail ? `: ${detail}` : ''}
    </span>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

const Bubble: React.FC<{ role: 'user' | 'assistant'; content: string; actions?: AIAction[] }> = ({
  role, content, actions,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 4, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.16 }}
    style={{ display: 'flex', flexDirection: 'column', alignItems: role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}
  >
    <div style={{ display: 'flex', gap: 7, maxWidth: '90%', alignItems: 'flex-start' }}>
      {role === 'assistant' && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: 'linear-gradient(135deg, #5e5ce6, #0a84ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={9} color="#fff" />
        </div>
      )}
      <div style={{
        padding: '7px 11px',
        borderRadius: role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        background: role === 'user' ? 'rgba(10,132,255,0.18)' : 'rgba(255,255,255,0.055)',
        border: `1px solid ${role === 'user' ? 'rgba(10,132,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
        fontSize: 12.5, lineHeight: 1.6,
        color: role === 'user' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.84)',
        whiteSpace: 'pre-wrap',
      }}>
        {content}
      </div>
    </div>
    {actions && actions.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5, paddingLeft: 27 }}>
        {actions.map((a, i) => <ActionChip key={i} action={a} />)}
      </div>
    )}
  </motion.div>
);

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0 6px' }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'linear-gradient(135deg, #5e5ce6, #0a84ff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Sparkles size={9} color="#fff" />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(167,139,250,0.7)' }}
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Slash suggestion dropdown ────────────────────────────────────────────────

const SlashDropdown: React.FC<{ cmds: SlashCommand[]; onSelect: (cmd: SlashCommand) => void }> = ({
  cmds, onSelect,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 4 }}
    transition={{ duration: 0.12 }}
    style={{
      position: 'absolute',
      bottom: '100%',
      left: 0, right: 0,
      marginBottom: 6,
      background: 'rgba(14,14,22,0.96)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
    }}
  >
    {cmds.map((c) => (
      <button
        key={c.cmd}
        onMouseDown={(e) => { e.preventDefault(); onSelect(c); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 12px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: 'rgba(94,92,230,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#a78bfa',
        }}>
          {c.icon}
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
            {c.label}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
            {c.description}
          </div>
        </div>
      </button>
    ))}
  </motion.div>
);

// ─── Quick commands ───────────────────────────────────────────────────────────

const QUICK_CMDS = [
  'Riassumi questa task',
  '/vai progetti',
  'Cosa devo fare oggi?',
  '/scrivi ',
];

// ─── Constants ────────────────────────────────────────────────────────────────

const PANEL_W = 340;
const PANEL_H = 480;

// ─── Main component ───────────────────────────────────────────────────────────

function PaletteInner() {
  const store         = useFreelanceAIStore();
  const { contextLabel, contextPayload } = useFreelanceAIContext();
  const { execute }   = useFreelanceAIActions();
  const { capture }   = usePageSnapshot();

  const [input, setInput]         = useState('');
  const [ttsOn, setTtsOn]         = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Virtual cursor
  const [cursorPos,     setCursorPos]     = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorClick,   setCursorClick]   = useState(false);

  const msgEndRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const dragControls = useDragControls();

  // Default: centre of viewport; clamp any persisted position to ensure it's on-screen
  const clampX = (x: number) => Math.min(Math.max(12, x), window.innerWidth  - PANEL_W - 12);
  const clampY = (y: number) => Math.min(Math.max(12, y), window.innerHeight - 120);
  const defaultX = Math.round((window.innerWidth  - PANEL_W) / 2);
  const defaultY = Math.round((window.innerHeight - PANEL_H) / 2 - 40);
  const initX = clampX(store.panelX >= 0 ? store.panelX : defaultX);
  const initY = clampY(store.panelY >= 0 ? store.panelY : defaultY);
  const mx = useMotionValue(initX);
  const my = useMotionValue(initY);

  const { isListening, startListening, stopListening } = useVoiceInput({
    onResult: (t) => { setInput(t); inputRef.current?.focus(); },
  });

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.messages, store.isLoading]);

  useEffect(() => {
    if (store.isOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [store.isOpen]);

  // ── Slash command state ─────────────────────────────────────────────────────

  const slashParsed = useMemo(() => parseSlash(input), [input]);
  const showDropdown = Boolean(slashParsed && input.endsWith('/') === false);
  const dropdownCmds = useMemo(
    () => slashParsed ? matchingCmds(slashParsed.cmd) : [],
    [slashParsed],
  );

  // ── Cursor helpers ──────────────────────────────────────────────────────────

  const moveCursorTo = useCallback((x: number, y: number) => {
    setCursorVisible(true);
    setCursorPos({ x, y });
  }, []);

  const triggerCursorClick = useCallback((x: number, y: number) => {
    setCursorPos({ x, y });
    setCursorClick(true);
    setTimeout(() => setCursorClick(false), 400);
  }, []);

  const hideCursor = useCallback(() => setTimeout(() => setCursorVisible(false), 900), []);

  // ── Send / slash execute ────────────────────────────────────────────────────

  const send = useCallback(async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || store.isLoading) return;
    setInput('');

    // Slash command direct execution
    const parsed = parseSlash(raw);
    if (parsed) {
      const def = SLASH_COMMANDS.find((c) => c.cmd === parsed.cmd);
      if (def?.handler) {
        store.addMessage({ role: 'user', content: raw });
        const actions = def.handler(parsed.arg, () => {}) ?? [];
        if (actions.length > 0) {
          store.addMessage({
            role: 'assistant',
            content: `Eseguo: ${def.label}${parsed.arg ? ` → ${parsed.arg}` : ''}`,
            actions: actions as AIAction[],
          });
          setCursorVisible(true);
          await execute(actions as AIAction[], { onCursorMove: moveCursorTo, onCursorClick: triggerCursorClick });
          hideCursor();
        }
        return;
      }
      // /cerca, /brief, /riassumi, /aiuta → enrich and pass to AI
    }

    // ── AI chat ──
    store.addMessage({ role: 'user', content: raw });
    store.setLoading(true);

    // Capture live screen context
    const snapshot = capture();

    try {
      const history = store.messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiClient.post<{ answer: string; actions?: AIAction[] }>(
        '/freelance/ai-assistant/chat',
        {
          message: raw,
          context: { ...contextPayload, label: contextLabel },
          history,
          pageSnapshot: snapshot.summary,
          activeElement: snapshot.activeElement,
        },
      );

      const { answer, actions = [] } = res.data;
      store.addMessage({ role: 'assistant', content: answer, actions });
      if (ttsOn) speak(answer);

      if (actions.length > 0) {
        setCursorVisible(true);
        await execute(actions, { onCursorMove: moveCursorTo, onCursorClick: triggerCursorClick });
        hideCursor();
      }
    } catch {
      store.addMessage({ role: 'assistant', content: 'Errore di rete. Riprova tra poco.' });
    } finally {
      store.setLoading(false);
    }
  }, [input, store, contextLabel, contextPayload, ttsOn, execute, capture, moveCursorTo, triggerCursorClick, hideCursor]);

  // ── Keyboard ────────────────────────────────────────────────────────────────

  const onKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') useFreelanceAIStore.getState().close();
    if (e.key === 'Tab' && dropdownCmds.length > 0) {
      e.preventDefault();
      const c = dropdownCmds[0];
      setInput(`/${c.cmd} `);
    }
  }, [send, dropdownCmds]);

  // ── Drag ────────────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(() => {
    store.setPanelPosition(mx.get(), my.get());
  }, [store, mx, my]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <FreelanceAICursor x={cursorPos.x} y={cursorPos.y} visible={cursorVisible} clicking={cursorClick} />

      <motion.div
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.14 } }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ position: 'fixed', zIndex: 99990, width: PANEL_W, userSelect: 'none', x: mx, y: my }}
      >
        <div style={{
          background: 'rgba(10, 10, 18, 0.9)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 18,
          boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* ── Header drag handle ── */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            style={{
              cursor: 'grab',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 10px 9px 13px',
              borderBottom: '1px solid rgba(255,255,255,0.055)',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #5e5ce6 0%, #0a84ff 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(94,92,230,0.5)',
            }}>
              <Bot size={11} color="#fff" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>
                BackClub AI
              </div>
              <div style={{
                fontSize: 9.5, color: 'rgba(167,139,250,0.8)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {contextLabel || 'Freelance CRM'} · ⌘K
              </div>
            </div>

            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <button onClick={() => setTtsOn((v) => !v)} title={ttsOn ? 'Disattiva voce' : 'Attiva voce'} style={iconBtn(ttsOn ? 'rgba(10,132,255,0.22)' : 'transparent')}>
                <span style={{ fontSize: 12 }}>{ttsOn ? '🔊' : '🔇'}</span>
              </button>
              <button onClick={() => store.clearHistory()} title="Cancella storia" style={iconBtn()}>
                <Trash2 size={11} color="rgba(255,255,255,0.38)" />
              </button>
              <button onClick={() => setIsExpanded((v) => !v)} title={isExpanded ? 'Comprimi' : 'Espandi'} style={iconBtn()}>
                {isExpanded
                  ? <Minimize2 size={11} color="rgba(255,255,255,0.42)" />
                  : <Maximize2 size={11} color="rgba(255,255,255,0.42)" />}
              </button>
              <button onClick={() => store.close()} title="Chiudi  Esc" style={iconBtn('rgba(255,59,48,0.13)')}>
                <X size={12} color="rgba(255,80,70,0.9)" />
              </button>
            </div>
          </div>

          {/* ── Message list ── */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 320, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden', flexShrink: 0 }}
              >
                <div style={{ height: 320, overflowY: 'auto', padding: '12px 13px 8px', scrollbarWidth: 'none' }}>

                  {store.messages.length === 0 && (
                    <div style={{ textAlign: 'center', paddingTop: 28 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', margin: '0 auto 10px',
                        background: 'linear-gradient(135deg, rgba(94,92,230,0.25), rgba(10,132,255,0.25))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Sparkles size={17} color="#a78bfa" />
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', marginBottom: 3 }}>
                        Come posso aiutarti?
                      </div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.24)', marginBottom: 16 }}>
                        Scrivi o usa <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>/comando</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
                        {QUICK_CMDS.map((cmd) => (
                          <button
                            key={cmd}
                            onClick={() => send(cmd)}
                            style={{
                              fontSize: 10.5, padding: '4px 9px', borderRadius: 7,
                              background: 'rgba(255,255,255,0.055)',
                              border: '1px solid rgba(255,255,255,0.09)',
                              color: 'rgba(255,255,255,0.6)',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                              fontFamily: cmd.startsWith('/') ? 'monospace' : 'inherit',
                            }}
                          >
                            <ChevronRight size={8} />
                            {cmd}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {store.messages.map((m) => (
                    <Bubble key={m.id} role={m.role} content={m.content} actions={m.actions} />
                  ))}

                  {store.isLoading && <TypingDots />}
                  <div ref={msgEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input area with slash dropdown ── */}
          <div style={{
            padding: '7px 9px 9px',
            borderTop: isExpanded ? '1px solid rgba(255,255,255,0.055)' : 'none',
            position: 'relative',
          }}>
            {/* Slash suggestions */}
            <AnimatePresence>
              {showDropdown && dropdownCmds.length > 0 && (
                <SlashDropdown cmds={dropdownCmds} onSelect={(c) => {
                  setInput(`/${c.cmd} `);
                  inputRef.current?.focus();
                }} />
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Chiedi o /comando…"
                rows={1}
                style={{
                  flex: 1, resize: 'none',
                  background: 'rgba(255,255,255,0.055)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.9)',
                  outline: 'none',
                  fontFamily: input.startsWith('/') ? 'monospace' : 'inherit',
                  lineHeight: 1.5,
                  maxHeight: 80,
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(94,92,230,0.45)';
                  e.target.style.boxShadow = '0 0 0 2px rgba(94,92,230,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.09)';
                  e.target.style.boxShadow = 'none';
                }}
              />

              <button
                onClick={() => isListening ? stopListening() : startListening()}
                title={isListening ? 'Ferma registrazione' : 'Input vocale'}
                style={{
                  ...iconBtn(isListening ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.05)'),
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  border: `1px solid ${isListening ? 'rgba(255,59,48,0.3)' : 'rgba(255,255,255,0.09)'}`,
                }}
              >
                {isListening
                  ? <MicOff size={12} color="#ff3b30" />
                  : <Mic    size={12} color="rgba(255,255,255,0.5)" />}
              </button>

              <button
                onClick={() => send()}
                disabled={!input.trim() || store.isLoading}
                style={{
                  ...iconBtn(),
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: input.trim() && !store.isLoading
                    ? 'linear-gradient(135deg, #5e5ce6, #0a84ff)'
                    : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  opacity: !input.trim() || store.isLoading ? 0.4 : 1,
                  cursor: !input.trim() || store.isLoading ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {store.isLoading
                  ? <Loader2 size={12} color="#fff" style={{ animation: 'spin 0.9s linear infinite' }} />
                  : <Send size={12} color="#fff" />}
              </button>
            </div>

            {/* Hint bar */}
            <div style={{ marginTop: 5, fontSize: 9.5, color: 'rgba(255,255,255,0.2)', display: 'flex', gap: 10 }}>
              <span>↵ invia</span>
              <span>⇧↵ nuova riga</span>
              <span style={{ color: '#a78bfa' }}>/</span>
              <span>comandi</span>
              <span>Tab completamento</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Icon button helper ───────────────────────────────────────────────────────

function iconBtn(bg = 'transparent'): React.CSSProperties {
  return {
    background: bg, border: 'none', cursor: 'pointer', borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, padding: 0, flexShrink: 0,
    transition: 'background 0.13s ease', fontSize: 12,
  };
}

// ─── Portal wrapper ───────────────────────────────────────────────────────────

export function FreelanceAICommandPalette() {
  const { isOpen } = useFreelanceAIStore();
  return ReactDOM.createPortal(
    <AnimatePresence>{isOpen && <PaletteInner />}</AnimatePresence>,
    document.body,
  );
}

export default FreelanceAICommandPalette;
