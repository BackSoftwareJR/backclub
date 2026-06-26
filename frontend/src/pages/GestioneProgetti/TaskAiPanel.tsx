import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Check, RotateCcw, AlertCircle, Type } from 'lucide-react';
import { aiTaskImproveApi, type AiTaskSuggestion, type AiImproveMode } from '../../api/aiTaskImprove';
import './TaskAiPanel.css';

const DEBOUNCE_MS = 1400;
const MIN_TITLE_LENGTH = 3;
const MIN_DESC_LENGTH = 10;

interface HistoryEntry {
  mode: AiImproveMode;
  suggestions: AiTaskSuggestion[];
  inputSnapshot: { title: string; description: string };
}

interface TaskAiPanelProps {
  title: string;
  description: string;
  onApply: (title: string, description: string) => void;
  /** Called when AI suggests a provisional title (description-only mode) */
  onProvisionalTitle: (title: string | null) => void;
  /** Override idle placeholder copy */
  idleHint?: string;
  /** Override panel header label */
  panelTitle?: string;
  /** Keep visible on narrow screens (embedded in workspace composer) */
  embedded?: boolean;
}

const TaskAiPanel: React.FC<TaskAiPanelProps> = ({
  title,
  description,
  onApply,
  onProvisionalTitle,
  idleHint,
  panelTitle = 'Migliora con AI',
  embedded = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [applied, setApplied] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef({ title: '', description: '' });

  const currentEntry = historyIndex >= 0 ? history[historyIndex] : null;
  const isTitleMode = currentEntry?.mode === 'suggest_title';

  const shouldFetch = useCallback((t: string, d: string) => {
    const titleShort = t.trim().length < MIN_TITLE_LENGTH;
    const descLong = d.trim().length >= MIN_DESC_LENGTH;
    const titleLong = t.trim().length >= MIN_TITLE_LENGTH;
    return (titleShort && descLong) || titleLong;
  }, []);

  const fetchSuggestions = useCallback(async (t: string, d: string) => {
    if (!shouldFetch(t, d)) return;

    const snapshot = { title: t, description: d };
    const unchanged =
      lastSnapshotRef.current.title === t &&
      lastSnapshotRef.current.description === d;
    if (unchanged && status === 'done') return;

    setStatus('loading');
    setApplied(null);

    try {
      const data = await aiTaskImproveApi.improve(t, d);
      const entry: HistoryEntry = {
        mode: data.mode,
        suggestions: data.suggestions,
        inputSnapshot: snapshot,
      };
      lastSnapshotRef.current = snapshot;

      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, entry];
      });
      setHistoryIndex((prev) => prev + 1);
      setStatus('done');

      // In title-suggest mode, automatically emit the first suggestion as provisional
      if (data.mode === 'suggest_title' && data.suggestions[0]?.title) {
        onProvisionalTitle(data.suggestions[0].title);
      } else {
        onProvisionalTitle(null);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Errore di connessione al servizio AI.');
      onProvisionalTitle(null);
    }
  }, [historyIndex, status, shouldFetch, onProvisionalTitle]);

  useEffect(() => {
    if (!shouldFetch(title, description)) {
      setStatus('idle');
      onProvisionalTitle(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(title, description);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description]);

  const handleApply = (suggestion: AiTaskSuggestion, index: number) => {
    onApply(suggestion.title, suggestion.description);
    setApplied(index);
    if (isTitleMode) {
      onProvisionalTitle(null);
    }
  };

  const handleProvisionalSelect = (suggestedTitle: string, index: number) => {
    onProvisionalTitle(suggestedTitle);
    setApplied(index);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex((i) => i - 1);
      setApplied(null);
      if (prev.mode === 'suggest_title' && prev.suggestions[0]?.title) {
        onProvisionalTitle(prev.suggestions[0].title);
      } else {
        onProvisionalTitle(null);
      }
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex((i) => i + 1);
      setApplied(null);
      if (next.mode === 'suggest_title' && next.suggestions[0]?.title) {
        onProvisionalTitle(next.suggestions[0].title);
      } else {
        onProvisionalTitle(null);
      }
    }
  };

  const retry = () => fetchSuggestions(title, description);

  return (
    <div className={`tap-panel${embedded ? ' tap-panel--embedded' : ''}`}>
      {/* Header */}
      <div className="tap-header">
        <div className="tap-header-left">
          <Sparkles size={14} className="tap-sparkle" />
          <span className="tap-title">{panelTitle}</span>
        </div>
        <div className="tap-nav">
          <button
            className="tap-nav-btn"
            onClick={goBack}
            disabled={historyIndex <= 0}
            title="Versione precedente"
          >
            <ChevronLeft size={14} />
          </button>
          {history.length > 0 && (
            <span className="tap-nav-counter">{historyIndex + 1}/{history.length}</span>
          )}
          <button
            className="tap-nav-btn"
            onClick={goForward}
            disabled={historyIndex >= history.length - 1}
            title="Versione successiva"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="tap-body">

        {status === 'idle' && (
          <div className="tap-placeholder">
            <Sparkles size={28} className="tap-placeholder-icon" />
            <p>{idleHint ?? 'Scrivi un titolo (≥3 car.) o una descrizione (≥10 car.) per ricevere suggerimenti AI automatici.'}</p>
          </div>
        )}

        {status === 'loading' && (
          <div className="tap-loading">
            <div className="tap-loading-dots"><span /><span /><span /></div>
            <p>Generazione in corso…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="tap-error">
            <AlertCircle size={20} />
            <p>{errorMsg}</p>
            <button className="tap-retry-btn" onClick={retry}>
              <RotateCcw size={13} /> Riprova
            </button>
          </div>
        )}

        {status === 'done' && currentEntry && (
          <div className="tap-suggestions">

            {/* Title-suggest mode: compact title pills */}
            {isTitleMode && (
              <>
                <div className="tap-mode-badge">
                  <Type size={11} />
                  <span>Titoli suggeriti</span>
                </div>
                <p className="tap-mode-hint">
                  Clicca su un titolo per visualizzarlo in anteprima nel form — poi accetta o rifiuta.
                </p>
                <div className="tap-title-pills">
                  {currentEntry.suggestions.map((s, i) => (
                    <button
                      key={i}
                      className={`tap-title-pill ${applied === i ? 'selected' : ''}`}
                      onClick={() => handleProvisionalSelect(s.title, i)}
                    >
                      <span className="tap-pill-num">{i + 1}</span>
                      <span className="tap-pill-text">{s.title}</span>
                      {applied === i && <Check size={12} className="tap-pill-check" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Full improve mode: cards */}
            {!isTitleMode && currentEntry.suggestions.map((s, i) => (
              <div key={i} className={`tap-card ${applied === i ? 'applied' : ''}`}>
                <div className="tap-card-header">
                  <span className="tap-card-label">Opzione {i + 1}</span>
                  <div className="tap-card-actions">
                    {applied === i ? (
                      <span className="tap-applied-badge">
                        <Check size={11} /> Inserita
                      </span>
                    ) : (
                      <button
                        className="tap-apply-btn"
                        onClick={() => handleApply(s, i)}
                        title="Inserisci nel form"
                      >
                        <Check size={12} /> Inserisci
                      </button>
                    )}
                  </div>
                </div>
                <p className="tap-card-title">{s.title}</p>
                {s.description && <p className="tap-card-desc">{s.description}</p>}
              </div>
            ))}

            <button className="tap-regenerate-btn" onClick={retry}>
              <RotateCcw size={12} /> Rigenera
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="tap-footer">
        <Sparkles size={10} />
        <span>Powered by Groq · llama-3.3-70b</span>
      </div>
    </div>
  );
};

export default TaskAiPanel;
