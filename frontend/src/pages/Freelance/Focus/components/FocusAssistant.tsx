import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, FileText, X } from 'lucide-react';
import type { AnalysisResult, ChatMessage } from '../../../../types/focus';

interface FocusAssistantProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onAnalyzeText?: (text: string, question?: string) => Promise<AnalysisResult>;
  loading: boolean;
  sessionId: number | null;
  onSuggestedReply?: (reply: string) => void;
}

const STARTER_CHIPS = [
  'Organizza la mia giornata 📅',
  'Quante ore ho lavorato? ⏱',
  'Cosa ho in scadenza? ⚠️',
  'Dammi task veloci 🚀',
];

const LOADING_LABELS = [
  'Leggo le tue task…',
  'Analizzo i tuoi progetti…',
  'Preparo i suggerimenti…',
];

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const FocusAssistant: React.FC<FocusAssistantProps> = ({
  messages,
  onSendMessage,
  onAnalyzeText,
  loading,
  onSuggestedReply,
}) => {
  const [input, setInput] = useState('');
  const [respondedTo, setRespondedTo] = useState<Set<string>>(new Set());
  const [showAnalyzePane, setShowAnalyzePane] = useState(false);
  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzeQuestion, setAnalyzeQuestion] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingLabelIdx, setLoadingLabelIdx] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }, [input]);

  // Rotate loading label while loading
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoadingLabelIdx(i => (i + 1) % LOADING_LABELS.length);
    }, 1200);
    return () => clearInterval(id);
  }, [loading]);

  // Mark last assistant message as responded when user sends
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;
    for (let i = messages.length - 2; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        setRespondedTo(prev => new Set([...prev, messages[i].id]));
        break;
      }
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSendMessage(trimmed);
    setInput('');
  }, [input, loading, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = useCallback((chip: string, fromMsgId?: string) => {
    if (loading) return;
    if (fromMsgId) setRespondedTo(prev => new Set([...prev, fromMsgId]));
    const handler = onSuggestedReply ?? onSendMessage;
    handler(chip);
  }, [loading, onSuggestedReply, onSendMessage]);

  const handleAnalyze = useCallback(async () => {
    if (!analyzeText.trim() || !onAnalyzeText || analyzing) return;
    setAnalyzing(true);
    try {
      const result = await onAnalyzeText(analyzeText.trim(), analyzeQuestion.trim() || undefined);
      // Push analysis as assistant message via parent's send handler
      onSendMessage(`[Analisi testo]\n${result.analysis}`);
      setShowAnalyzePane(false);
      setAnalyzeText('');
      setAnalyzeQuestion('');
    } catch {
      // error handled by parent
    } finally {
      setAnalyzing(false);
    }
  }, [analyzeText, analyzeQuestion, onAnalyzeText, onSendMessage, analyzing]);

  const isEmpty = messages.length === 0;

  return (
    <div className="focus-assistant">
      {/* Header */}
      <div className="focus-assistant__header">
        <div className="focus-assistant__header-icon">
          <Sparkles size={13} color="white" />
        </div>
        <div>
          <div className="focus-assistant__title">Focus Assistant</div>
          <div className="focus-assistant__sub">
            {loading ? LOADING_LABELS[loadingLabelIdx] : 'Migliora la tua routine'}
          </div>
        </div>
      </div>

      {/* Messages / Empty state */}
      <div className="focus-assistant__messages">
        {isEmpty && !loading ? (
          <motion.div
            className="focus-chat-empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              className="focus-chat-empty__icon"
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles size={28} />
            </motion.div>
            <div className="focus-chat-empty__title">Migliora la tua routine</div>
            <div className="focus-chat-empty__sub">
              Il tuo assistente conosce tutte le tue task e progetti per ottimizzare ogni giornata.
            </div>
            <div className="focus-chat-empty-chips">
              {STARTER_CHIPS.map((chip, i) => (
                <motion.button
                  key={chip}
                  className="focus-chip"
                  onClick={() => handleChipClick(chip)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.22 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                >
                  {chip}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map(msg => {
                const chipsVisible =
                  msg.role === 'assistant' &&
                  Array.isArray(msg.suggested_replies) &&
                  msg.suggested_replies.length > 0 &&
                  !respondedTo.has(msg.id);

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`focus-bubble-row focus-bubble-row--${msg.role}`}>
                      {msg.role === 'assistant' && (
                        <div className="focus-bubble-avatar">
                          <Sparkles size={11} color="white" />
                        </div>
                      )}
                      <div>
                        <div className={`focus-bubble focus-bubble--${msg.role}`}>
                          {msg.content}
                        </div>
                        <div className="focus-bubble__time">{formatTime(msg.timestamp)}</div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {chipsVisible && (
                        <motion.div
                          className="focus-chips-row"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {msg.suggested_replies!.map((chip, i) => (
                            <motion.button
                              key={chip}
                              className="focus-chip"
                              onClick={() => handleChipClick(chip, msg.id)}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.08, duration: 0.18 }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              type="button"
                            >
                              {chip}
                            </motion.button>
                          ))}
                          <span className="focus-chips-hint">o scrivi liberamente ↓</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            {loading && (
              <motion.div
                className="focus-bubble-row focus-bubble-row--assistant"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="focus-bubble-avatar">
                  <Sparkles size={11} color="white" />
                </div>
                <div className="focus-bubble focus-bubble--assistant">
                  <motion.span
                    key={loadingLabelIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ fontSize: 12, opacity: 0.8 }}
                  >
                    {LOADING_LABELS[loadingLabelIdx]}
                  </motion.span>
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Analyze text pane */}
      <AnimatePresence>
        {showAnalyzePane && (
          <motion.div
            className="focus-analyze-pane"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="focus-analyze-pane__header">
              <span>Incolla testo da analizzare</span>
              <button type="button" onClick={() => setShowAnalyzePane(false)}>
                <X size={13} />
              </button>
            </div>
            <textarea
              className="focus-analyze-pane__text"
              placeholder="Incolla email, brief, spec, documento…"
              value={analyzeText}
              onChange={e => setAnalyzeText(e.target.value)}
              rows={4}
              maxLength={10000}
            />
            <input
              type="text"
              className="focus-analyze-pane__question"
              placeholder="Domanda opzionale (es. quali sono le scadenze?)"
              value={analyzeQuestion}
              onChange={e => setAnalyzeQuestion(e.target.value)}
              maxLength={500}
            />
            <button
              type="button"
              className="focus-btn focus-btn--primary focus-analyze-pane__btn"
              onClick={handleAnalyze}
              disabled={!analyzeText.trim() || analyzing}
            >
              {analyzing ? 'Analizzando…' : 'Analizza'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="focus-assistant__input-area">
        <div className="focus-assistant__input-row">
          {onAnalyzeText && (
            <button
              type="button"
              className={`focus-assistant__analyze-btn${showAnalyzePane ? ' focus-assistant__analyze-btn--active' : ''}`}
              onClick={() => setShowAnalyzePane(p => !p)}
              title="Analizza testo"
              aria-label="Analizza testo"
            >
              <FileText size={14} />
            </button>
          )}
          <textarea
            ref={textareaRef}
            className="focus-assistant__textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi o scegli una risposta…"
            rows={1}
            disabled={loading}
          />
          <button
            className="focus-assistant__send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            title="Invia (Enter)"
            type="button"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusAssistant;
