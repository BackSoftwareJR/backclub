import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Play, Square, MessageSquare, Loader2, AlertCircle, Minus, Plus } from 'lucide-react';
import { crmProjectTasksApi, type CrmProjectTask } from '../../api/crmProjects';
import TaskAgentChatPanel from './TaskAgentChatPanel';
import TaskN8nOutputSection from './TaskN8nOutputSection';
import './TaskAgentControlPanel.css';

interface TaskAgentControlPanelProps {
  projectId: number;
  taskId: number;
  task: Pick<CrmProjectTask, 'id' | 'execution_mode' | 'n8n_status' | 'status' | 'progress' | 'n8n_error' | 'n8n_response' | 'n8n_response_format' | 'n8n_completed_at'>;
  onTaskUpdate?: () => void;
  readOnly?: boolean;
}

const POLL_INTERVAL_MS = 10_000;

const TaskAgentControlPanel: React.FC<TaskAgentControlPanelProps> = ({
  projectId,
  taskId,
  task,
  onTaskUpdate,
  readOnly = false,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showReviewMessage, setShowReviewMessage] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<number>(task.progress ?? 0);
  const [progressSaving, setProgressSaving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isProcessing = task.n8n_status === 'processing' || task.n8n_status === 'pending';

  // Sync local progress with incoming task prop
  useEffect(() => {
    setLocalProgress(task.progress ?? 0);
  }, [task.progress]);

  // Auto-poll when processing
  useEffect(() => {
    if (isProcessing && onTaskUpdate) {
      pollRef.current = setInterval(() => {
        onTaskUpdate();
      }, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isProcessing, onTaskUpdate]);

  const saveProgress = useCallback(async (value: number) => {
    setProgressSaving(true);
    try {
      await crmProjectTasksApi.n8nAction(projectId, taskId, {
        action: 'update_progress',
        progress: value,
      });
      onTaskUpdate?.();
    } catch {
      // silently ignore — not critical
    } finally {
      setProgressSaving(false);
    }
  }, [projectId, taskId, onTaskUpdate]);

  // Solo per execution_mode agent o agent_human
  if (!task.execution_mode || task.execution_mode === 'human') {
    return null;
  }

  const handleAction = async (action: 'restart' | 'stop' | 'request_review', message?: string) => {
    setActionLoading(action);
    setError(null);
    
    try {
      await crmProjectTasksApi.n8nAction(projectId, taskId, {
        action,
        review_message: message,
      });
      
      if (action === 'request_review') {
        setShowReviewMessage(false);
        setReviewMessage('');
      }
      
      onTaskUpdate?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || `Errore durante l'azione "${action}"`;
      setError(msg);
      console.error(`Error performing action ${action}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  // Riavvio disponibile quando: fallito, completato, cancellato, in coda (pending/null) o saltato
  const canRestart = !task.n8n_status
    || task.n8n_status === 'failed'
    || task.n8n_status === 'completed'
    || task.n8n_status === 'pending'
    || task.n8n_status === 'skipped'
    || task.status === 'cancelled';
  const canStop = task.n8n_status === 'pending' || task.n8n_status === 'processing';
  const canRequestReview = task.n8n_status === 'completed' || task.n8n_status === 'failed';

  return (
    <div className="task-agent-control">
      <div className="task-agent-control-header">
        <Bot size={20} />
        <div>
          <h3 className="task-agent-control-title">Controlli Agente</h3>
          <p className="task-agent-control-subtitle">
            Gestisci l'esecuzione del workflow N8N
          </p>
        </div>
      </div>

      {error && (
        <div className="task-agent-control-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!readOnly && (
        <div className="task-agent-control-actions">
          <button
            className="task-agent-control-btn task-agent-control-btn--restart"
            onClick={() => handleAction('restart')}
            disabled={!canRestart || actionLoading !== null}
            title={canRestart ? 'Riavvia il workflow dall\'inizio' : 'Riavvio non disponibile nello stato attuale'}
          >
            {actionLoading === 'restart' ? (
              <Loader2 size={16} className="task-agent-control-spinner" />
            ) : (
              <Play size={16} />
            )}
            <span>Riavvia Agente</span>
          </button>

          <button
            className="task-agent-control-btn task-agent-control-btn--stop"
            onClick={() => handleAction('stop')}
            disabled={!canStop || actionLoading !== null}
            title={canStop ? 'Ferma l\'esecuzione del workflow' : 'Stop non disponibile nello stato attuale'}
          >
            {actionLoading === 'stop' ? (
              <Loader2 size={16} className="task-agent-control-spinner" />
            ) : (
              <Square size={16} />
            )}
            <span>Stop Forzato</span>
          </button>

          <button
            className="task-agent-control-btn task-agent-control-btn--review"
            onClick={() => setShowReviewMessage(!showReviewMessage)}
            disabled={!canRequestReview || actionLoading !== null}
            title={canRequestReview ? 'Richiedi una revisione del risultato' : 'Richiesta review non disponibile'}
          >
            <MessageSquare size={16} />
            <span>Richiedi Review</span>
          </button>
        </div>
      )}

      {showReviewMessage && (
        <div className="task-agent-control-review">
          <label className="task-agent-control-review-label">
            Messaggio di review (opzionale)
          </label>
          <textarea
            value={reviewMessage}
            onChange={(e) => setReviewMessage(e.target.value)}
            placeholder="Descrivi cosa dovrebbe essere rivisto o migliorato..."
            className="task-agent-control-review-textarea"
            rows={3}
          />
          <div className="task-agent-control-review-actions">
            <button
              className="task-agent-control-review-btn task-agent-control-review-btn--cancel"
              onClick={() => {
                setShowReviewMessage(false);
                setReviewMessage('');
              }}
              disabled={actionLoading !== null}
            >
              Annulla
            </button>
            <button
              className="task-agent-control-review-btn task-agent-control-review-btn--send"
              onClick={() => handleAction('request_review', reviewMessage || undefined)}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'request_review' ? (
                <>
                  <Loader2 size={14} className="task-agent-control-spinner" />
                  <span>Invio...</span>
                </>
              ) : (
                <>
                  <MessageSquare size={14} />
                  <span>Invia Review</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Barra di avanzamento */}
      <div className="task-agent-progress">
          <div className="task-agent-progress-header">
            <span className="task-agent-progress-label">
              {isProcessing ? (
                <>
                  <Loader2 size={12} className="task-agent-control-spinner" />
                  <span>Elaborazione in corso...</span>
                </>
              ) : task.n8n_status === 'completed' ? (
                <span>Completato</span>
              ) : task.n8n_status === 'failed' ? (
                <span className="task-agent-progress-label--failed">Fallito</span>
              ) : (
                <span>Avanzamento</span>
              )}
            </span>
            <span className="task-agent-progress-pct">{localProgress}%</span>
          </div>

          <div className="task-agent-progress-track">
            <div
              className={`task-agent-progress-fill${isProcessing ? ' task-agent-progress-fill--animated' : ''}`}
              style={{ width: `${localProgress}%` }}
            />
          </div>

          {!readOnly && (
            <div className="task-agent-progress-controls">
              <button
                className="task-agent-progress-btn"
                onClick={() => {
                  const v = Math.max(0, localProgress - 5);
                  setLocalProgress(v);
                  saveProgress(v);
                }}
                disabled={progressSaving || localProgress === 0}
                title="Diminuisci di 5%"
              >
                <Minus size={12} />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={localProgress}
                className="task-agent-progress-slider"
                onChange={(e) => setLocalProgress(Number(e.target.value))}
                onMouseUp={(e) => saveProgress(Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => saveProgress(Number((e.target as HTMLInputElement).value))}
              />
              <button
                className="task-agent-progress-btn"
                onClick={() => {
                  const v = Math.min(100, localProgress + 5);
                  setLocalProgress(v);
                  saveProgress(v);
                }}
                disabled={progressSaving || localProgress === 100}
                title="Aumenta di 5%"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>

      {/* Chat live logs */}
      <TaskAgentChatPanel
        projectId={projectId}
        taskId={taskId}
        executionMode={task.execution_mode}
        initialN8nStatus={task.n8n_status}
      />

      {/* Output finale */}
      <TaskN8nOutputSection task={task} />
    </div>
  );
};

export default TaskAgentControlPanel;