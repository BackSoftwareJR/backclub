import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X, PenLine } from 'lucide-react';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  MIN_ANALYSIS_TEXT_LENGTH,
  type TaskSeriesInputMode,
} from '../../types/taskSeries';

interface TaskSeriesUploadStepProps {
  mode: TaskSeriesInputMode;
  onModeChange: (mode: TaskSeriesInputMode) => void;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  analysisText: string;
  onAnalysisTextChange: (text: string) => void;
  seriesTitleHint: string;
  onSeriesTitleHintChange: (title: string) => void;
  aiInstructions: string;
  onAiInstructionsChange: (instructions: string) => void;
  onValidationError?: (message: string | null) => void;
  error: string | null;
  disabled?: boolean;
}

const TEXT_PLACEHOLDER = `Descrivi le attività del progetto, i deliverable e le priorità.

Esempio:
• Analisi SEO on-page
• Audit keyword e meta tag
• Ottimizzazione contenuti blog
• Report Search Console mensile`;

const TaskSeriesUploadStep: React.FC<TaskSeriesUploadStepProps> = ({
  mode,
  onModeChange,
  file,
  onFileSelect,
  analysisText,
  onAnalysisTextChange,
  seriesTitleHint,
  onSeriesTitleHintChange,
  aiInstructions,
  onAiInstructionsChange,
  onValidationError,
  error,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const textLength = analysisText.trim().length;
  const textMeetsMin = textLength >= MIN_ANALYSIS_TEXT_LENGTH;

  const validateFile = useCallback((f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Formato non supportato. Usa: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `Il file supera ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        onFileSelect(null);
        onValidationError?.(err);
        return;
      }
      onValidationError?.(null);
      onFileSelect(f);
    },
    [onFileSelect, onValidationError, validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [disabled, handleFile]
  );

  const handleModeChange = (nextMode: TaskSeriesInputMode) => {
    if (disabled || nextMode === mode) return;
    onValidationError?.(null);
    onModeChange(nextMode);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="tsm-input-toggle" role="tablist" aria-label="Modalità di input">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          className={`tsm-input-toggle-btn ${mode === 'file' ? 'tsm-input-toggle-btn--active' : ''}`}
          onClick={() => handleModeChange('file')}
          disabled={disabled}
        >
          <Upload size={14} />
          Carica documento
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'text'}
          className={`tsm-input-toggle-btn ${mode === 'text' ? 'tsm-input-toggle-btn--active' : ''}`}
          onClick={() => handleModeChange('text')}
          disabled={disabled}
        >
          <PenLine size={14} />
          Scrivi analisi
        </button>
      </div>

      {mode === 'file' ? (
        <div
          className={`tsm-upload-zone ${dragOver ? 'tsm-upload-zone--drag' : ''}`}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <Upload size={40} className="tsm-upload-icon" />
          <p className="tsm-upload-title">Carica un documento di progetto</p>
          <p className="tsm-upload-hint">
            Trascina qui un file o clicca per selezionare.<br />
            Formati: PDF, DOCX, XLSX, TXT — max {MAX_FILE_SIZE_MB} MB
          </p>

          {file && (
            <div className="tsm-upload-file" onClick={(e) => e.stopPropagation()}>
              <FileText size={18} color="#0A84FF" />
              <span className="tsm-upload-file-name">{file.name}</span>
              <span className="tsm-upload-file-size">{formatSize(file.size)}</span>
              <button
                type="button"
                className="tsm-close"
                style={{ width: 24, height: 24 }}
                onClick={() => onFileSelect(null)}
                disabled={disabled}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="tsm-text-input-panel">
          <label className="tsm-field-label" htmlFor="tsm-analysis-text">
            Contenuto analisi
          </label>
          <textarea
            id="tsm-analysis-text"
            className="tsm-analysis-textarea"
            value={analysisText}
            onChange={(e) => onAnalysisTextChange(e.target.value)}
            placeholder={TEXT_PLACEHOLDER}
            disabled={disabled}
            rows={12}
          />
          <div className={`tsm-char-count ${textMeetsMin ? 'tsm-char-count--ok' : ''}`}>
            {textLength} / min {MIN_ANALYSIS_TEXT_LENGTH} caratteri
          </div>

          <div className="tsm-optional-fields">
            <div className="tsm-field">
              <label className="tsm-field-label" htmlFor="tsm-series-title-hint">
                Titolo serie <span className="tsm-field-optional">(opzionale)</span>
              </label>
              <input
                id="tsm-series-title-hint"
                type="text"
                className="tsm-field-input"
                value={seriesTitleHint}
                onChange={(e) => onSeriesTitleHintChange(e.target.value)}
                placeholder="Es. Piano SEO Q2"
                disabled={disabled}
              />
            </div>
            <div className="tsm-field">
              <label className="tsm-field-label" htmlFor="tsm-ai-instructions">
                Istruzioni per l&apos;AI <span className="tsm-field-optional">(opzionale)</span>
              </label>
              <textarea
                id="tsm-ai-instructions"
                className="tsm-field-textarea"
                value={aiInstructions}
                onChange={(e) => onAiInstructionsChange(e.target.value)}
                placeholder="Es. Priorità alta per audit tecnico, stima 2 settimane totali"
                disabled={disabled}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {mode === 'file' && (
        <div className="tsm-optional-fields tsm-optional-fields--compact">
          <div className="tsm-field">
            <label className="tsm-field-label" htmlFor="tsm-file-ai-instructions">
              Istruzioni per l&apos;AI <span className="tsm-field-optional">(opzionale)</span>
            </label>
            <textarea
              id="tsm-file-ai-instructions"
              className="tsm-field-textarea"
              value={aiInstructions}
              onChange={(e) => onAiInstructionsChange(e.target.value)}
              placeholder="Es. Estrai solo task di marketing, ignora sezione amministrativa"
              disabled={disabled}
              rows={2}
            />
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.txt"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
        disabled={disabled}
      />

      {error && <div className="tsm-error">{error}</div>}
    </div>
  );
};

export default TaskSeriesUploadStep;
