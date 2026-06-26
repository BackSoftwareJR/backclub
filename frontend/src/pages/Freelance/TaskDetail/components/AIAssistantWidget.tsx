import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, User, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { taskDetailAiApi } from '../../../../api/taskDetailAi';
import { useVoiceInput } from '../../../../hooks/useVoiceInput';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantWidgetProps {
  projectId: number;
  taskId: number;
}

const SESSION_KEY = (taskId: number) => `bento_assistant_${taskId}`;

const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({ projectId, taskId }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY(taskId));
      return raw ? (JSON.parse(raw) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages to sessionStorage (cleared on tab close)
  const persist = (msgs: Message[]) => {
    setMessages(msgs);
    try { sessionStorage.setItem(SESSION_KEY(taskId), JSON.stringify(msgs)); } catch { /* quota */ }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const next = [...messages, userMsg];
    persist(next);
    setInput('');
    setSending(true);

    try {
      const res = await taskDetailAiApi.ask(projectId, taskId, text);
      const answer = res.data?.answer ?? 'Risposta non disponibile.';
      persist([...next, { id: `${Date.now()}-r`, role: 'assistant', content: answer }]);
    } catch {
      persist([...next, { id: `${Date.now()}-e`, role: 'assistant', content: 'Errore di connessione. Riprova.' }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, projectId, taskId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // Voice input
  const { isListening, isSupported: voiceSupported, toggle: toggleVoice } = useVoiceInput({
    lang: 'it-IT',
    onResult: (transcript, append) => {
      setInput((prev) => (append ? prev + ' ' + transcript : transcript).trimStart());
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header actions ── */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 10px 0', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => persist([])}
            title="Cancella conversazione"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.2)', display: 'flex', padding: 2,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,59,48,0.7)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* ── Message list ── */}
      <div
        className="flex-1 min-h-0"
        style={{ overflowY: 'auto', scrollbarWidth: 'none', padding: '8px 10px 4px' }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'rgba(10,132,255,0.12)',
              border: '1px solid rgba(10,132,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <Sparkles size={16} color="#0A84FF" />
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 12px', fontWeight: 500 }}>
              Conosco questa task in dettaglio
            </p>
            {/* Quick prompts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '0 4px' }}>
              {[
                'Cosa devo fare prima?',
                'Ci sono blocchi o dipendenze?',
                'Come consegno al meglio?',
                'Dammi un piano d\'azione',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInput(q)}
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(10,132,255,0.12)';
                    (e.currentTarget as HTMLElement).style.color = '#0A84FF';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                display: 'flex',
                gap: 7,
                marginBottom: 8,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'assistant' ? 'rgba(10,132,255,0.18)' : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 1,
              }}>
                {msg.role === 'assistant'
                  ? <Sparkles size={10} color="#0A84FF" />
                  : <User size={10} color="rgba(255,255,255,0.5)" />}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '82%',
                padding: '7px 10px',
                borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                background: msg.role === 'user' ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: msg.role === 'user'
                  ? '1px solid rgba(10,132,255,0.3)'
                  : '1px solid rgba(255,255,255,0.07)',
                fontSize: 12,
                lineHeight: 1.5,
                color: msg.role === 'user' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.82)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {sending && (
          <div style={{ display: 'flex', gap: 7, marginBottom: 8, alignItems: 'center' }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(10,132,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Loader2 size={10} color="#0A84FF" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{
              padding: '7px 10px', borderRadius: '12px 12px 12px 3px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0, 0.2, 0.4].map((d) => (
                <span key={d} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.35)',
                  animation: `bounce 1.2s ${d}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={{
        flexShrink: 0,
        padding: '6px 10px 10px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 6,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${isListening ? 'rgba(10,132,255,0.5)' : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 11,
          padding: '6px 6px 6px 10px',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chiedi sulla task…"
            style={{
              flex: 1, resize: 'none', background: 'transparent', border: 'none',
              outline: 'none', fontSize: 12, color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.5, maxHeight: 72, overflowY: 'auto', scrollbarWidth: 'none',
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 72) + 'px';
            }}
          />

          {/* Voice */}
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              title={isListening ? 'Stop' : 'Parla'}
              style={{
                width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isListening ? 'rgba(10,132,255,0.25)' : 'rgba(255,255,255,0.05)',
                color: isListening ? '#0A84FF' : 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 13, transition: 'all 0.15s',
                animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}
            >
              🎤
            </button>
          )}

          {/* Send */}
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            style={{
              width: 26, height: 26, borderRadius: 8, border: 'none',
              cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
              background: input.trim() && !sending ? '#0A84FF' : 'rgba(255,255,255,0.05)',
              color: input.trim() && !sending ? '#fff' : 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
              boxShadow: input.trim() && !sending ? '0 2px 8px rgba(10,132,255,0.4)' : 'none',
            }}
          >
            <Send size={12} />
          </button>
        </div>
      </div>

      {/* Keyframe styles (injected once) */}
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0.5);opacity:0.3} 40%{transform:scale(1);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
};

export default AIAssistantWidget;
