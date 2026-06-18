import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Loader2, AlertCircle, CheckCircle2, Terminal, Info } from 'lucide-react';
import type { WorkspaceAgent, WorkspaceAgentStatus } from '../../../types/workspace';
import './WorkspaceAgentActivityPanel.css';

interface ActivityEntry {
  id: string;
  title?: string;
  message: string;
  timestamp?: string;
  status?: string;
  kind: 'system' | 'output' | 'completion';
}

interface WorkspaceAgentActivityPanelProps {
  agent: WorkspaceAgent;
}

const statusLabels: Record<WorkspaceAgentStatus, string> = {
  pending: 'In attesa',
  running: 'In esecuzione',
  review: 'In revisione',
  completed: 'Completato',
  failed: 'Fallito',
  stopped: 'Fermato',
};

const SYSTEM_STEP_KEYS = new Set([
  'orchestrator_queued',
  'agent_started',
  'status_update',
  'orchestrator_callback',
  'task_completed',
  'task_failed',
  'task_closed',
  'task_stopped',
]);

function classifyEntry(obj: Record<string, unknown>): ActivityEntry['kind'] {
  const stepKey = String(obj.step_key ?? '');
  const title = String(obj.title ?? '').toLowerCase();
  const status = String(obj.status ?? '').toLowerCase();

  if (stepKey === 'task_completed' || title.includes('completed') || status === 'completed' && stepKey.startsWith('task_')) {
    return 'completion';
  }
  if (stepKey === 'task_failed' || title.includes('failed') || status === 'failed') {
    return 'completion';
  }
  if (stepKey.startsWith('orchestrator_') || stepKey.startsWith('agent_') || stepKey.startsWith('status_') || SYSTEM_STEP_KEYS.has(stepKey)) {
    return 'system';
  }
  if (title === 'agent output' || stepKey.startsWith('log_') || stepKey === 'orchestrator_log_tail') {
    return 'output';
  }
  return 'system';
}

function parseLogsToEntries(logs: string | null): ActivityEntry[] {
  if (!logs?.trim()) return [];

  try {
    const parsed = JSON.parse(logs);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => {
        if (typeof item === 'string') {
          return { id: `log-${index}`, message: item, kind: 'output' as const };
        }
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const message = String(obj.message ?? obj.text ?? obj.log ?? JSON.stringify(obj));
          return {
            id: `log-${index}`,
            title: typeof obj.title === 'string' ? obj.title : undefined,
            message,
            timestamp: typeof obj.timestamp === 'string' ? obj.timestamp : typeof obj.created_at === 'string' ? obj.created_at : undefined,
            status: typeof obj.status === 'string' ? obj.status : undefined,
            kind: classifyEntry(obj),
          };
        }
        return { id: `log-${index}`, message: String(item), kind: 'output' as const };
      });
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.steps)) {
        return parseLogsToEntries(JSON.stringify(obj.steps));
      }
      return [{ id: 'log-0', message: JSON.stringify(parsed, null, 2), kind: 'system' }];
    }
  } catch {
    // fall through to plain text
  }

  return logs
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ id: `line-${index}`, message: line, kind: 'output' as const }));
}

const WorkspaceAgentActivityPanel: React.FC<WorkspaceAgentActivityPanelProps> = ({ agent }) => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isActive = agent.status === 'running' || agent.status === 'review' || agent.status === 'pending';

  const refreshEntries = useCallback(() => {
    setEntries(parseLogsToEntries(agent.logs));
  }, [agent.logs]);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, agent.status]);

  return (
    <div className="ws-agent-activity">
      <div className="ws-agent-activity-header">
        <Bot size={20} />
        <div className="ws-agent-activity-header-text">
          <h3>Attività agente</h3>
          <span className={`ws-agent-activity-status ws-agent-activity-status--${agent.status}`}>
            {isActive && agent.status === 'running' && <Loader2 size={12} className="ws-spin" />}
            {agent.status === 'completed' && <CheckCircle2 size={12} />}
            {agent.status === 'failed' && <AlertCircle size={12} />}
            {statusLabels[agent.status]}
            {agent.n8n_execution_id ? ` · ${agent.n8n_execution_id.slice(0, 8)}…` : ''}
          </span>
        </div>
      </div>

      {agent.status === 'completed' && (
        <div className="ws-agent-activity-banner ws-agent-activity-banner--completed">
          <CheckCircle2 size={16} />
          <span>Lavorazione completata con successo</span>
        </div>
      )}
      {agent.status === 'failed' && (
        <div className="ws-agent-activity-banner ws-agent-activity-banner--failed">
          <AlertCircle size={16} />
          <span>Lavorazione fallita</span>
        </div>
      )}

      <div className="ws-agent-activity-messages">
        {entries.length === 0 ? (
          <p className="ws-agent-activity-empty">
            {isActive
              ? "L'agente sta elaborando. Gli aggiornamenti appariranno qui automaticamente."
              : 'Nessuna attività registrata per questa lavorazione.'}
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`ws-agent-activity-bubble ws-agent-activity-bubble--${entry.kind} ${entry.status ? `ws-agent-activity-bubble--${entry.status}` : ''}`}
            >
              <div className="ws-agent-activity-bubble-header">
                {entry.kind === 'output' ? <Terminal size={12} /> : entry.kind === 'completion' ? <CheckCircle2 size={12} /> : <Info size={12} />}
                {entry.title && <span className="ws-agent-activity-title">{entry.title}</span>}
              </div>
              {entry.timestamp && (
                <time className="ws-agent-activity-time">
                  {new Date(entry.timestamp).toLocaleString('it-IT')}
                </time>
              )}
              <p className="ws-agent-activity-message">{entry.message}</p>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {isActive && (
        <p className="ws-agent-activity-hint">
          Aggiornamento automatico ogni 4 secondi fino al completamento.
        </p>
      )}
    </div>
  );
};

export default WorkspaceAgentActivityPanel;
