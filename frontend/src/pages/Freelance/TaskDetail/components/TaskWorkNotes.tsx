import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Mic, MicOff, Paperclip, ChevronDown, ChevronUp, X } from 'lucide-react';
import { crmProjectTasksApi } from '../../../../api/crmProjects';
import { useVoiceInput } from '../../../../hooks/useVoiceInput';

interface TaskWorkNotesProps {
  projectId: number;
  taskId: number;
  initialNotes: string;
}

const TaskWorkNotes: React.FC<TaskWorkNotesProps> = ({ projectId, taskId, initialNotes }) => {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [attachingFile, setAttachingFile] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, taskId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };
  }, []);

  const doSave = useCallback(
    async (value: string) => {
      setSaving(true);
      setShowSaved(false);
      try {
        await crmProjectTasksApi.updateWorkNotes(projectId, taskId, value);
        setSavedAt(new Date());
        setShowSaved(true);
        if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
        savedFadeRef.current = setTimeout(() => setShowSaved(false), 3000);
      } catch (error) {
        console.error('Error saving work notes:', error);
      } finally {
        setSaving(false);
      }
    },
    [projectId, taskId]
  );

  const handleChange = (value: string) => {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(value), 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void doSave(notes);
    }
  };

  const handleVoiceResult = useCallback((transcript: string, append?: boolean) => {
    const updated = append && notes ? notes + ' ' + transcript : transcript;
    setNotes(updated);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(updated), 800);
  }, [notes, doSave]);

  const { isListening, isSupported: voiceSupported, toggle: toggleVoice, interimTranscript } = useVoiceInput({
    lang: 'it-IT',
    onResult: handleVoiceResult,
  });

  const handleFileAttach = async (files: FileList | null) => {
    if (!files?.length) return;
    setAttachingFile(true);
    try {
      for (const file of Array.from(files)) {
        await crmProjectTasksApi.uploadAttachment(projectId, taskId, file);
      }
    } catch (error) {
      console.error('Error attaching file:', error);
    } finally {
      setAttachingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const charCount = notes.length;

  const formatSavedTime = (date: Date) =>
    date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="wnotes-card">
      <div className="wnotes-header" onClick={() => setIsExpanded((v) => !v)}>
        <div className="wnotes-header-left">
          <div className="wnotes-icon">
            <FileText size={14} />
          </div>
          <span className="wnotes-title">Note di lavoro</span>
          <span className="wnotes-private-badge">Solo per te</span>
        </div>
        <div className="wnotes-header-right">
          <AnimatePresence mode="wait">
            {saving ? (
              <motion.span key="saving" className="wnotes-save-status saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Salvataggio...
              </motion.span>
            ) : showSaved && savedAt ? (
              <motion.span key="saved" className="wnotes-save-status saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                ✓ Salvato {formatSavedTime(savedAt)}
              </motion.span>
            ) : null}
          </AnimatePresence>
          <button type="button" className="wnotes-toggle-btn" aria-label={isExpanded ? 'Comprimi note' : 'Espandi note'} onClick={(e) => { e.stopPropagation(); setIsExpanded((v) => !v); }}>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="wnotes-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="wnotes-body">
              <div className="wnotes-textarea-wrap">
                <textarea
                  ref={textareaRef}
                  className={`wnotes-textarea${isListening ? ' wnotes-listening' : ''}`}
                  value={notes + (interimTranscript ? ' ' + interimTranscript : '')}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Appunti privati, bozze, checklist personali, reminder..."
                  rows={7}
                />
                {isListening && (
                  <div className="wnotes-listening-indicator">
                    <span className="wnotes-listening-dot" />
                    <span className="wnotes-listening-dot" />
                    <span className="wnotes-listening-dot" />
                  </div>
                )}
              </div>
              <div className="wnotes-footer">
                <div className="wnotes-footer-left">
                  {voiceSupported && (
                    <button
                      type="button"
                      className={`wnotes-action-btn${isListening ? ' wnotes-action-btn-active' : ''}`}
                      onClick={toggleVoice}
                      title={isListening ? 'Ferma dettatura' : 'Inizia dettatura vocale'}
                      aria-label={isListening ? 'Ferma dettatura' : 'Dettatura vocale'}
                    >
                      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                      <span>{isListening ? 'Stop' : 'Voce'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={`wnotes-action-btn${attachingFile ? ' wnotes-action-btn-loading' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachingFile}
                    title="Allega file alla task"
                    aria-label="Allega file"
                  >
                    {attachingFile ? <X size={14} /> : <Paperclip size={14} />}
                    <span>{attachingFile ? 'Caricamento...' : 'Allega'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="wnotes-file-input"
                    onChange={(e) => handleFileAttach(e.target.files)}
                  />
                </div>
                <div className="wnotes-footer-right">
                  <span className="wnotes-counter">{wordCount}p · {charCount}c</span>
                  <span className="wnotes-shortcut-hint">⌘S salva</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskWorkNotes;
