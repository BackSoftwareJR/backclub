import React, { useCallback, useState } from 'react';
import { X, Layers, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { taskSeriesApi } from '../../api/taskSeries';
import type {
  TaskSeriesAnalysisResult,
  TaskSeriesInputMode,
  TaskSeriesReviewRow,
  TaskSeriesSourceType,
} from '../../types/taskSeries';
import {
  MIN_ANALYSIS_TEXT_LENGTH,
  STEP_LABELS,
  analyzedToReviewRow,
} from '../../types/taskSeries';
import TaskSeriesUploadStep from './TaskSeriesUploadStep';
import TaskSeriesProcessingStep from './TaskSeriesProcessingStep';
import TaskSeriesReviewTable from './TaskSeriesReviewTable';
import TaskSeriesConfirmStep from './TaskSeriesConfirmStep';
import './TaskSeriesModal.css';

interface TeamUser {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

interface TaskSeriesModalProps {
  projectId: number;
  teamUsers: TeamUser[];
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 0 | 1 | 2 | 3;

const TaskSeriesModal: React.FC<TaskSeriesModalProps> = ({
  projectId,
  teamUsers,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<WizardStep>(0);
  const [inputMode, setInputMode] = useState<TaskSeriesInputMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  const [seriesTitleHint, setSeriesTitleHint] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TaskSeriesAnalysisResult | null>(null);
  const [seriesTitle, setSeriesTitle] = useState('');
  const [rows, setRows] = useState<TaskSeriesReviewRow[]>([]);
  const [createParentTask, setCreateParentTask] = useState(true);
  const [dispatchAgents, setDispatchAgents] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processingSource, setProcessingSource] = useState<{
    type: TaskSeriesSourceType;
    label: string;
  } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const canAnalyze =
    inputMode === 'file'
      ? !!file
      : analysisText.trim().length >= MIN_ANALYSIS_TEXT_LENGTH;

  const runAnalysis = useCallback(async () => {
    if (!canAnalyze) return;

    const sourceForProcessing =
      inputMode === 'file'
        ? { type: 'file' as const, label: file!.name }
        : { type: 'text' as const, label: 'Analisi da testo' };

    setProcessingSource(sourceForProcessing);
    setStep(1);
    setAnalysisError(null);

    try {
      const response = await taskSeriesApi.analyze(projectId, {
        file: inputMode === 'file' ? file ?? undefined : undefined,
        analysisText: inputMode === 'text' ? analysisText : undefined,
        seriesTitle: inputMode === 'text' ? seriesTitleHint : undefined,
        aiInstructions: aiInstructions || undefined,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Analisi fallita');
      }

      setAnalysis(response.data);
      setSeriesTitle(response.data.series_title);
      setRows(response.data.tasks.map((t, i) => analyzedToReviewRow(t, i)));
      setStep(2);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.message ||
        'Errore durante l\'analisi';
      setAnalysisError(msg);
      setStep(0);
      showToast('error', msg);
    }
  }, [
    aiInstructions,
    analysisText,
    canAnalyze,
    file,
    inputMode,
    projectId,
    seriesTitleHint,
    showToast,
  ]);

  const validateRows = (): string | null => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      return 'Seleziona almeno un task da creare.';
    }
    for (const row of selected) {
      if (!row.title.trim()) {
        return 'Ogni task selezionato deve avere un titolo.';
      }
      if (
        (row.execution_mode === 'human' || row.execution_mode === 'agent_human') &&
        !row.assignments.some((a) => a.user_id)
      ) {
        return `"${row.title}": le modalità Umano e Agente + Umano richiedono un assegnatario.`;
      }
    }
    if (!seriesTitle.trim()) {
      return 'Inserisci un titolo per la serie.';
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validateRows();
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setCreating(true);
    try {
      const response = await taskSeriesApi.create(projectId, {
        series_title: seriesTitle.trim(),
        create_parent_task: createParentTask,
        dispatch_agents: dispatchAgents,
        tasks: rows.map((row) => ({
          title: row.title.trim(),
          description: row.description || undefined,
          execution_mode: row.execution_mode,
          exact_prompt: row.exact_prompt,
          status: row.status,
          priority: row.priority,
          start_date: row.start_date || undefined,
          due_date: row.due_date || undefined,
          estimated_hours: row.estimated_hours,
          selected: row.selected,
          assignments: row.assignments.filter((a) => a.user_id),
        })),
      });

      showToast('success', response.message || `${response.data.count} task creati!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.message ||
        'Errore nella creazione dei task';
      showToast('error', msg);
    } finally {
      setCreating(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      if (inputMode === 'file' && !file) {
        setUploadError('Seleziona un documento da analizzare.');
        return;
      }
      if (inputMode === 'text' && analysisText.trim().length < MIN_ANALYSIS_TEXT_LENGTH) {
        setUploadError(`Scrivi almeno ${MIN_ANALYSIS_TEXT_LENGTH} caratteri di analisi.`);
        return;
      }
      setUploadError(null);
      runAnalysis();
    } else if (step === 2) {
      const err = validateRows();
      if (err) {
        showToast('error', err);
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(0);
    else if (step === 3) setStep(2);
  };

  const isProcessing = step === 1;
  const busy = creating || isProcessing;

  const analyzeButtonLabel =
    inputMode === 'text' ? 'Analizza testo' : 'Analizza documento';

  return (
    <div className="tsm-overlay" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="tsm-shell" onClick={(e) => e.stopPropagation()}>
        <div className="tsm-header">
          <div className="tsm-header-left">
            <Layers size={18} className="tsm-header-icon" />
            <span className="tsm-header-title">Nuova Serie</span>
            <span className="tsm-header-sub">Da analisi a task</span>
          </div>
          <button type="button" className="tsm-close" onClick={onClose} disabled={busy}>
            <X size={16} />
          </button>
        </div>

        <div className="tsm-stepper">
          {STEP_LABELS.map((label, idx) => (
            <React.Fragment key={label}>
              <div
                className={[
                  'tsm-dot',
                  idx === step ? 'tsm-dot--active' : '',
                  idx < step ? 'tsm-dot--done' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={label}
              >
                {idx < step ? '✓' : idx + 1}
              </div>
              <span
                className={`tsm-step-label ${idx === step ? 'tsm-step-label--active' : ''}`}
              >
                {label}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="tsm-body">
          {step === 0 && (
            <TaskSeriesUploadStep
              mode={inputMode}
              onModeChange={setInputMode}
              file={file}
              onFileSelect={(f) => {
                setFile(f);
                if (f) setUploadError(null);
              }}
              analysisText={analysisText}
              onAnalysisTextChange={(text) => {
                setAnalysisText(text);
                if (text.trim().length >= MIN_ANALYSIS_TEXT_LENGTH) {
                  setUploadError(null);
                }
              }}
              seriesTitleHint={seriesTitleHint}
              onSeriesTitleHintChange={setSeriesTitleHint}
              aiInstructions={aiInstructions}
              onAiInstructionsChange={setAiInstructions}
              onValidationError={setUploadError}
              error={uploadError || analysisError}
              disabled={busy}
            />
          )}
          {step === 1 && (
            <TaskSeriesProcessingStep
              sourceType={processingSource?.type}
              sourceLabel={processingSource?.label}
            />
          )}
          {step === 2 && (
            <TaskSeriesReviewTable
              seriesTitle={seriesTitle}
              onSeriesTitleChange={setSeriesTitle}
              summary={analysis?.summary ?? ''}
              sourceType={analysis?.source_type}
              sourceLabel={analysis?.source_filename}
              rows={rows}
              onRowsChange={setRows}
              teamUsers={teamUsers}
              disabled={busy}
            />
          )}
          {step === 3 && (
            <TaskSeriesConfirmStep
              seriesTitle={seriesTitle}
              summary={analysis?.summary ?? ''}
              sourceType={analysis?.source_type}
              sourceLabel={analysis?.source_filename}
              rows={rows}
              createParentTask={createParentTask}
              onCreateParentTaskChange={setCreateParentTask}
              dispatchAgents={dispatchAgents}
              onDispatchAgentsChange={setDispatchAgents}
            />
          )}
        </div>

        <div className="tsm-nav">
          <div className="tsm-nav-left">
            {(step === 2 || step === 3) && (
              <button type="button" className="tsm-btn-ghost" onClick={handleBack} disabled={busy}>
                <ChevronLeft size={14} />
                Indietro
              </button>
            )}
          </div>
          <div className="tsm-nav-right">
            <button type="button" className="tsm-btn-ghost" onClick={onClose} disabled={busy}>
              Annulla
            </button>
            {step === 0 && (
              <button
                type="button"
                className="tsm-btn-primary"
                onClick={handleNext}
                disabled={!canAnalyze || busy}
              >
                <Sparkles size={14} />
                {analyzeButtonLabel}
                <ChevronRight size={14} />
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                className="tsm-btn-primary"
                onClick={handleNext}
                disabled={busy || rows.filter((r) => r.selected).length === 0 || !seriesTitle.trim()}
              >
                Continua
                <ChevronRight size={14} />
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                className="tsm-btn-primary"
                onClick={handleCreate}
                disabled={creating || rows.filter((r) => r.selected && r.title.trim()).length === 0}
              >
                {creating ? 'Creazione…' : `Crea ${rows.filter((r) => r.selected).length} task`}
              </button>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`tsm-toast tsm-toast--${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default TaskSeriesModal;
