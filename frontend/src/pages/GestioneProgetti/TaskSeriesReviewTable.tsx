import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TaskExecutionMode } from '../../api/crmProjects';
import type { TaskSeriesReviewRow, TaskSeriesSourceType } from '../../types/taskSeries';
import { newEmptyReviewRow } from '../../types/taskSeries';

interface TeamUser {
  id: number;
  name: string;
}

interface TaskSeriesReviewTableProps {
  seriesTitle: string;
  onSeriesTitleChange: (v: string) => void;
  summary: string;
  sourceType?: TaskSeriesSourceType;
  sourceLabel?: string;
  rows: TaskSeriesReviewRow[];
  onRowsChange: (rows: TaskSeriesReviewRow[]) => void;
  teamUsers: TeamUser[];
  disabled?: boolean;
}

const PRIORITIES = [
  { value: 'low', label: 'Bassa', color: '#8E8E93' },
  { value: 'medium', label: 'Media', color: '#0A84FF' },
  { value: 'high', label: 'Alta', color: '#FF9F0A' },
  { value: 'urgent', label: 'Urgente', color: '#FF3B30' },
] as const;

const MODES: Array<{ mode: TaskExecutionMode; label: string }> = [
  { mode: 'human', label: 'Umano' },
  { mode: 'agent', label: 'Agente' },
  { mode: 'agent_human', label: 'Ag.+Umano' },
];

const TaskSeriesReviewTable: React.FC<TaskSeriesReviewTableProps> = ({
  seriesTitle,
  onSeriesTitleChange,
  summary,
  sourceType,
  sourceLabel,
  rows,
  onRowsChange,
  teamUsers,
  disabled,
}) => {
  const updateRow = (id: string, patch: Partial<TaskSeriesReviewRow>) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  const addRow = () => {
    onRowsChange([...rows, newEmptyReviewRow()]);
  };

  const selectedCount = rows.filter((r) => r.selected).length;

  const bulkSetMode = (mode: TaskExecutionMode) => {
    onRowsChange(rows.map((r) => (r.selected ? { ...r, execution_mode: mode } : r)));
  };

  const bulkSetPriority = (priority: TaskSeriesReviewRow['priority']) => {
    onRowsChange(rows.map((r) => (r.selected ? { ...r, priority } : r)));
  };

  const bulkSelectAll = (selected: boolean) => {
    onRowsChange(rows.map((r) => ({ ...r, selected })));
  };

  const bulkDeleteSelected = () => {
    onRowsChange(rows.filter((r) => !r.selected));
  };

  return (
    <div>
      <div className="tsm-review-header">
        <div className="tsm-review-meta">
          <input
            type="text"
            className="tsm-series-title-input"
            value={seriesTitle}
            onChange={(e) => onSeriesTitleChange(e.target.value)}
            placeholder="Titolo serie…"
            disabled={disabled}
          />
          {summary && <p className="tsm-summary">{summary}</p>}
          {sourceType && (
            <span className="tsm-source-badge">
              {sourceType === 'text' ? 'Analisi da testo' : sourceLabel ?? 'Documento'}
            </span>
          )}
        </div>
        <div className="tsm-bulk-actions">
          <button type="button" className="tsm-bulk-btn" onClick={() => bulkSelectAll(true)} disabled={disabled}>
            Seleziona tutti
          </button>
          <button type="button" className="tsm-bulk-btn" onClick={() => bulkSelectAll(false)} disabled={disabled}>
            Deseleziona
          </button>
          <button type="button" className="tsm-bulk-btn" onClick={() => bulkSetMode('human')} disabled={disabled}>
            → Umano
          </button>
          <button type="button" className="tsm-bulk-btn" onClick={() => bulkSetMode('agent')} disabled={disabled}>
            → Agente
          </button>
          <button type="button" className="tsm-bulk-btn" onClick={() => bulkSetPriority('high')} disabled={disabled}>
            → Alta prio.
          </button>
          <button type="button" className="tsm-bulk-btn tsm-btn-danger" onClick={bulkDeleteSelected} disabled={disabled}>
            Elimina selez.
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="tsm-review-empty">
          <p className="tsm-review-empty-title">Nessun task da revisionare</p>
          <p className="tsm-review-empty-hint">
            L&apos;analisi non ha prodotto task, oppure li hai rimossi tutti. Aggiungine uno manualmente per continuare.
          </p>
        </div>
      ) : (
      <div className="tsm-table-wrap">
        <table className="tsm-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => r.selected)}
                  onChange={(e) => bulkSelectAll(e.target.checked)}
                  disabled={disabled}
                />
              </th>
              <th>Titolo</th>
              <th>Descrizione</th>
              <th>Modalità</th>
              <th>Priorità</th>
              <th>Assegnatario</th>
              <th>Scadenza</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={!row.selected ? 'tsm-row--deselected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="tsm-cell-input"
                    value={row.title}
                    onChange={(e) => updateRow(row.id, { title: e.target.value })}
                    placeholder="Titolo task…"
                    disabled={disabled}
                  />
                </td>
                <td>
                  <textarea
                    className="tsm-cell-input tsm-cell-textarea"
                    value={row.description}
                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                    placeholder="Descrizione…"
                    rows={2}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <div className="tsm-mode-pills">
                    {MODES.map(({ mode, label }) => (
                      <button
                        key={mode}
                        type="button"
                        className={`tsm-mode-pill ${row.execution_mode === mode ? 'active' : ''}`}
                        onClick={() => updateRow(row.id, { execution_mode: mode })}
                        disabled={disabled}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  <select
                    className="tsm-cell-select"
                    value={row.priority}
                    onChange={(e) =>
                      updateRow(row.id, {
                        priority: e.target.value as TaskSeriesReviewRow['priority'],
                      })
                    }
                    disabled={disabled}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="tsm-cell-select tsm-assignee-select"
                    title="Assegnatario (pagamento a ore di default)"
                    value={row.assignments[0]?.user_id ?? ''}
                    onChange={(e) => {
                      const userId = e.target.value ? Number(e.target.value) : undefined;
                      updateRow(row.id, {
                        assignments: userId
                          ? [{ user_id: userId, payment_method: 'hourly' as const }]
                          : [],
                      });
                    }}
                    disabled={disabled || row.execution_mode === 'agent'}
                  >
                    <option value="">
                      {row.execution_mode === 'agent' ? '— Non richiesto —' : '— Nessuno —'}
                    </option>
                    {teamUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    className="tsm-cell-input tsm-cell-date"
                    value={row.due_date}
                    onChange={(e) => updateRow(row.id, { due_date: e.target.value })}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <div className="tsm-row-actions">
                    <button
                      type="button"
                      className="tsm-row-delete"
                      onClick={() => deleteRow(row.id)}
                      disabled={disabled}
                      title="Elimina riga"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <button type="button" className="tsm-add-row" onClick={addRow} disabled={disabled}>
        <Plus size={14} />
        Aggiungi task manualmente
      </button>

      <p className="tsm-selected-count">
        {selectedCount} di {rows.length} task selezionati
      </p>
    </div>
  );
};

export default TaskSeriesReviewTable;
