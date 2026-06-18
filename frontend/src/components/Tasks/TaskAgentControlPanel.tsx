import React, { useState } from 'react';
import { Bot, Play, Square, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
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

  // Solo per execution_mode agent o agent_human
  if (!task.execution_mode || task.execution_mode === 'human') {
    return null;
  }

  const handleAction = async (action: 'restart' | 'stop' | 'request_review', message?: string) => {
    setActionLoading(action);
    setError(null);
    
    try {
      const response = await crmProjectTasksApi.n8nAction(projectId, taskId, {
        action,
        review_message: message,
      });
      
      // Mostra messaggio di successo
      alert(response.message || `Azione "${action}" eseguita con successo`);
      
      // Reset review form se necessario
      if (action === 'request_review') {
        setShowReviewMessage(false);
        setReviewMessage('');
      }
      
      // Notifica aggiornamento task
      onTaskUpdate?.();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || `Errore durante l'azione "${action}"`;
      setError(errorMessage);
      console.error(`Error performing action ${action}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const canRestart = task.n8n_status === 'failed' || task.n8n_status === 'completed' || task.status === 'cancelled';
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