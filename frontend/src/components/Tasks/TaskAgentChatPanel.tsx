import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { crmProjectTasksApi, type CrmProjectTaskN8nStep, type TaskN8nStatus } from '../../api/crmProjects';
import './TaskAgentChatPanel.css';

interface TaskAgentChatPanelProps {
  projectId: number;
  taskId: number;
  executionMode?: string;
  initialN8nStatus?: TaskN8nStatus | null;
}

const statusLabels: Record<string, string> = {
  pending: 'In attesa',
  processing: 'In elaborazione',
  completed: 'Completato',
  failed: 'Fallito',
  skipped: '—',
};

const TaskAgentChatPanel: React.FC<TaskAgentChatPanelProps> = ({
  projectId,
  taskId,
  executionMode,
  initialN8nStatus,
}) => {
  const [steps, setSteps] = useState<CrmProjectTaskN8nStep[]>([]);
  const [n8nStatus, setN8nStatus] = useState<TaskN8nStatus | null | undefined>(initialN8nStatus);
  const [progress, setProgress] = useState<number | null>(null);
  const [n8nError, setN8nError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isActive =
    n8nStatus === 'pending' || n8nStatus === 'processing' || n8nStatus === undefined;

  const loadSteps = useCallback(async () => {
    try {
      const res = await crmProjectTasksApi.getN8nSteps(projectId, taskId);
      setSteps(res.data.steps);
      setN8nStatus(res.data.task.n8n_status);
      setProgress(res.data.task.progress ?? null);
      setN8nError(res.data.task.n8n_error ?? null);
    } catch (e) {
      console.error('N8N steps load error', e);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    if (!executionMode || executionMode === 'human') return;
    loadSteps();
  }, [executionMode, loadSteps]);

  useEffect(() => {
    if (!executionMode || executionMode === 'human') return;
    if (!isActive) return;

    const interval = setInterval(loadSteps, 4000);
    return () => clearInterval(interval);
  }, [executionMode, isActive, loadSteps]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (!executionMode || executionMode === 'human') {
    return null;
  }

  return (
    <div className="task-agent-chat">
      <div className="task-agent-chat-header">
        <Bot size={20} />
        <div className="task-agent-chat-header-text">
          <h3>Agente N8N</h3>
          <span className={`task-agent-chat-status task-agent-chat-status--${n8nStatus || 'pending'}`}>
            {isActive && <Loader2 size={12} className="task-agent-chat-spin" />}
            {n8nStatus === 'completed' && <CheckCircle2 size={12} />}
            {n8nStatus === 'failed' && <AlertCircle size={12} />}
            {statusLabels[n8nStatus || 'pending'] || n8nStatus}
            {progress != null && progress > 0 ? ` · ${progress}%` : ''}
          </span>
        </div>
      </div>

      {n8nError && (
        <div className="task-agent-chat-error">
          <AlertCircle size={16} />
          <span>{n8nError}</span>
        </div>
      )}

      <div className="task-agent-chat-messages">
        {loading && steps.length === 0 ? (
          <p className="task-agent-chat-empty">Caricamento attività agente...</p>
        ) : steps.length === 0 ? (
          <p className="task-agent-chat-empty">
            L&apos;automazione partirà a breve. Puoi continuare a usare il gestionale.
          </p>
        ) : (
          steps.map((step) => (
            <div
              key={step.id}
              className={`task-agent-chat-bubble task-agent-chat-bubble--${step.status}`}
            >
              <div className="task-agent-chat-bubble-meta">
                <strong>{step.actor_name || 'Agente'}</strong>
                {step.title && <span className="task-agent-chat-bubble-title"> · {step.title}</span>}
                <time>{new Date(step.created_at).toLocaleString('it-IT')}</time>
              </div>
              {step.message && <p className="task-agent-chat-bubble-message">{step.message}</p>}
              {step.payload != null && typeof step.payload === 'object' ? (
                <details className="task-agent-chat-payload">
                  <summary>Dati step</summary>
                  <pre>{JSON.stringify(step.payload, null, 2)}</pre>
                </details>
              ) : null}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {isActive && (
        <p className="task-agent-chat-hint">
          Aggiornamento automatico ogni pochi secondi. Il workflow può richiedere anche 20+ minuti.
        </p>
      )}
    </div>
  );
};

export default TaskAgentChatPanel;
