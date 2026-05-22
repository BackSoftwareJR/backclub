import React from 'react';
import { Bot, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CrmProjectTask } from '../../api/crmProjects';
import './TaskN8nOutputSection.css';

interface TaskN8nOutputSectionProps {
  task: Pick<
    CrmProjectTask,
    'execution_mode' | 'n8n_status' | 'n8n_response' | 'n8n_response_format' | 'n8n_error' | 'n8n_completed_at'
  >;
}

const formatResponse = (response: unknown, format: string | null | undefined): string => {
  if (response == null) return '';
  if (format === 'json' || typeof response === 'object') {
    try {
      return JSON.stringify(response, null, 2);
    } catch {
      return String(response);
    }
  }
  if (typeof response === 'object' && response !== null && 'raw' in response) {
    return String((response as { raw: string }).raw);
  }
  return String(response);
};

const statusLabel: Record<string, string> = {
  pending: 'In attesa',
  processing: 'In elaborazione',
  completed: 'Completata',
  failed: 'Fallita',
  skipped: 'Non eseguita',
};

const TaskN8nOutputSection: React.FC<TaskN8nOutputSectionProps> = ({ task }) => {
  if (!task.execution_mode || task.execution_mode === 'human') {
    return null;
  }

  const hasOutput = task.n8n_response != null || task.n8n_error;
  if (!hasOutput && task.n8n_status !== 'processing') {
    return null;
  }

  const isFailed = task.n8n_status === 'failed';
  const isOk = task.n8n_status === 'completed';

  return (
    <div className={`task-n8n-output ${isFailed ? 'task-n8n-output--error' : ''}`}>
      <div className="task-n8n-output-header">
        <Bot size={20} />
        <div>
          <h3 className="task-n8n-output-title">Output automazione N8N</h3>
          <span className={`task-n8n-output-badge task-n8n-output-badge--${task.n8n_status || 'pending'}`}>
            {isOk && <CheckCircle2 size={14} />}
            {isFailed && <AlertCircle size={14} />}
            {statusLabel[task.n8n_status || 'pending'] || task.n8n_status}
          </span>
        </div>
      </div>

      {task.n8n_error && (
        <div className="task-n8n-output-error">
          <AlertCircle size={16} />
          <span>{task.n8n_error}</span>
        </div>
      )}

      {task.n8n_response != null && (
        <pre className="task-n8n-output-body">
          {formatResponse(task.n8n_response, task.n8n_response_format)}
        </pre>
      )}

      {task.n8n_completed_at && (
        <p className="task-n8n-output-meta">
          Elaborato il {new Date(task.n8n_completed_at).toLocaleString('it-IT')}
          {task.n8n_response_format ? ` · Formato: ${task.n8n_response_format}` : ''}
        </p>
      )}
    </div>
  );
};

export default TaskN8nOutputSection;
