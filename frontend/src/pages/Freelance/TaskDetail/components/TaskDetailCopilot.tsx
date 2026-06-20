import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles, Send, RefreshCw, ChevronDown, Mic, MicOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { taskDetailAiApi, type TaskAiBrief } from '../../../../api/taskDetailAi';
import { useVoiceInput } from '../../../../hooks/useVoiceInput';

interface TaskDetailCopilotProps {
  projectId: number;
  taskId: number;
  expanded: boolean;
  onToggle: () => void;
  brief: TaskAiBrief | null;
  onBriefLoaded: (brief: TaskAiBrief) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TaskDetailCopilot: React.FC<TaskDetailCopilotProps> = ({
  projectId,
  taskId,
  expanded,
  onToggle,
  brief,
  onBriefLoaded,
}) => {
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchBrief = useCallback(async () => {
    setLoadingBrief(true);
    try {
      const response = await taskDetailAiApi.getBrief(projectId, taskId);
      if (response.data) {
        onBriefLoaded(response.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error loading AI brief:', error);
    } finally {
      setLoadingBrief(false);
    }
  }, [projectId, taskId, onBriefLoaded]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingBrief(true);
      try {
        const response = await taskDetailAiApi.getBrief(projectId, taskId);
        if (!cancelled && response.data) {
          onBriefLoaded(response.data);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error('Error loading AI brief:', error);
      } finally {
        if (!cancelled) setLoadingBrief(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [projectId, taskId, onBriefLoaded]);

  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setQuestion('');
    setAsking(true);

    try {
      const response = await taskDetailAiApi.ask(projectId, taskId, trimmed);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error) {
      console.error('Error asking AI:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Non riesco a rispondere in questo momento.' }]);
    } finally {
      setAsking(false);
    }
  };

  const handleVoiceResult = useCallback((transcript: string, append?: boolean) => {
    setQuestion((prev) => (append && prev ? prev + ' ' + transcript : transcript));
  }, []);

  const { isListening, isSupported: voiceSupported, toggle: toggleVoice } = useVoiceInput({
    lang: 'it-IT',
    onResult: handleVoiceResult,
  });

  const formatTime = (d: Date) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  const chatPanel = (
    <div className="copilot-panel-inner">
      <div className="copilot-panel-header">
        <div className="copilot-panel-title">
          <Sparkles size={14} />
          <span>AI Assistant</span>
          {brief?.confidence && (
            <span className={`copilot-confidence-badge copilot-confidence-${brief.confidence}`}>
              {brief.confidence}
            </span>
          )}
        </div>
        <div className="copilot-panel-actions">
          <button
            type="button"
            className={`copilot-refresh-btn${loadingBrief ? ' loading' : ''}`}
            onClick={fetchBrief}
            disabled={loadingBrief}
            title="Aggiorna analisi"
            aria-label="Aggiorna analisi AI"
          >
            <RefreshCw size={13} className={loadingBrief ? 'copilot-spin' : ''} />
          </button>
          {lastUpdated && !loadingBrief && (
            <span className="copilot-last-updated">{formatTime(lastUpdated)}</span>
          )}
          <button type="button" className="copilot-mobile-close" onClick={onToggle} aria-label="Chiudi assistente">
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {brief?.hint && (
        <div className="copilot-hint-bar">
          <Sparkles size={11} />
          <span>{brief.hint}</span>
        </div>
      )}

      <div className="copilot-tab-content" style={{ padding: 0 }}>
        <div className="copilot-chat" style={{ height: '100%' }}>
          <div className="copilot-chat-messages">
            {messages.length === 0 && (
              <div className="copilot-chat-welcome">
                <div className="copilot-chat-welcome-icon">
                  <Sparkles size={20} />
                </div>
                <p className="copilot-chat-welcome-text">
                  Chiedi qualcosa sulla task, sul progetto o su come procedere
                </p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`copilot-msg copilot-msg-${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {asking && (
              <div className="copilot-msg copilot-msg-assistant copilot-msg-typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      <form className="copilot-chat-input-row" onSubmit={handleAsk}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Chiedi qualcosa sulla task..."
          disabled={asking}
          className="copilot-chat-input"
        />
        {voiceSupported && (
          <button
            type="button"
            className={`copilot-chat-voice-btn${isListening ? ' active' : ''}`}
            onClick={toggleVoice}
            disabled={asking}
            aria-label={isListening ? 'Ferma dettatura' : 'Dettatura vocale'}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}
        <button
          type="submit"
          disabled={!question.trim() || asking}
          className="copilot-chat-send-btn"
          aria-label="Invia domanda"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: always-visible inline panel */}
      <div className="copilot-desktop-panel">
        {chatPanel}
      </div>

      {/* Mobile: FAB + bottom sheet */}
      <button
        type="button"
        className={`task-copilot-fab${expanded ? ' active' : ''}${brief ? ' has-hint' : ''}`}
        onClick={onToggle}
        aria-label="Apri assistente AI"
        aria-expanded={expanded}
      >
        <Sparkles size={18} />
      </button>

      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              className="task-copilot-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={onToggle}
            />
            <motion.div
              className="task-copilot-panel copilot-mobile-sheet"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {chatPanel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default TaskDetailCopilot;
