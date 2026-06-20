import React from 'react';
import type { TaskSeriesReviewRow, TaskSeriesSourceType } from '../../types/taskSeries';

interface TaskSeriesConfirmStepProps {
  seriesTitle: string;
  summary: string;
  sourceType?: TaskSeriesSourceType;
  sourceLabel?: string;
  rows: TaskSeriesReviewRow[];
  createParentTask: boolean;
  onCreateParentTaskChange: (v: boolean) => void;
  dispatchAgents: boolean;
  onDispatchAgentsChange: (v: boolean) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#8E8E93',
  medium: '#0A84FF',
  high: '#FF9F0A',
  urgent: '#FF3B30',
};

const MODE_LABELS: Record<string, string> = {
  human: 'Umano',
  agent: 'Agente',
  agent_human: 'Agente + Umano',
};

const TaskSeriesConfirmStep: React.FC<TaskSeriesConfirmStepProps> = ({
  seriesTitle,
  summary,
  sourceType,
  sourceLabel,
  rows,
  createParentTask,
  onCreateParentTaskChange,
  dispatchAgents,
  onDispatchAgentsChange,
}) => {
  const selected = rows.filter((r) => r.selected && r.title.trim());
  const agentCount = selected.filter((r) => r.execution_mode === 'agent' || r.execution_mode === 'agent_human').length;
  const humanCount = selected.filter((r) => r.execution_mode === 'human').length;

  return (
    <div className="tsm-confirm">
      <div className="tsm-confirm-card">
        <h2 className="tsm-confirm-title">{seriesTitle || 'Serie di task'}</h2>
        {sourceType && (
          <span className="tsm-source-badge tsm-source-badge--inline">
            {sourceType === 'text' ? 'Analisi da testo' : sourceLabel ?? 'Documento'}
          </span>
        )}
        {summary && <p className="tsm-confirm-summary">{summary}</p>}

        <div className="tsm-confirm-stats">
          <div className="tsm-stat">
            <div className="tsm-stat-value">{selected.length}</div>
            <div className="tsm-stat-label">Task da creare</div>
          </div>
          <div className="tsm-stat">
            <div className="tsm-stat-value">{humanCount}</div>
            <div className="tsm-stat-label">Umani</div>
          </div>
          <div className="tsm-stat">
            <div className="tsm-stat-value">{agentCount}</div>
            <div className="tsm-stat-label">Con agente</div>
          </div>
        </div>

        <div className="tsm-confirm-options">
          <label className="tsm-checkbox-row">
            <input
              type="checkbox"
              checked={createParentTask}
              onChange={(e) => onCreateParentTaskChange(e.target.checked)}
            />
            Crea task contenitore per la serie
          </label>
          <label className="tsm-checkbox-row">
            <input
              type="checkbox"
              checked={dispatchAgents}
              onChange={(e) => onDispatchAgentsChange(e.target.checked)}
            />
            Avvia agenti N8N per i task in modalità agente
          </label>
        </div>

        <div className="tsm-confirm-list">
          {selected.length === 0 && (
            <p className="tsm-confirm-empty">Nessun task selezionato. Torna indietro per aggiungerne almeno uno.</p>
          )}
          {selected.map((row) => (
            <div key={row.id} className="tsm-confirm-item">
              <span
                className="tsm-priority-dot"
                style={{ background: PRIORITY_COLORS[row.priority] ?? '#8E8E93' }}
              />
              <span style={{ flex: 1 }}>{row.title}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                {MODE_LABELS[row.execution_mode]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskSeriesConfirmStep;
