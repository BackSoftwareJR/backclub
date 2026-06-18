import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Play,
  Square,
  RotateCcw,
  CheckCircle,
  MessageSquare,
  Copy,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Trash2,
  Undo2,
  X,
  ListOrdered,
  Clock,
  ChevronUp,
} from 'lucide-react';
import { workspaceAgentsApi } from '../../../api/workspaceAgents';
import ExactPromptCheckbox from '../../../components/Tasks/ExactPromptCheckbox';
import type { WorkspaceAgent, WorkspaceBranch } from '../../../types/workspace';
import {
  SECTION_LABELS,
  SECTION_ORDER,
  groupAgentsBySection,
  getAgentStatusConfig,
  formatRelativeTime,
  getActivityTimestamp,
  getPromptExcerpt,
  getExecutionSnippet,
  getLastLogLine,
  needsLivePolling,
  type AgentSectionKey,
} from '../utils/workspaceAgentUtils';
import './WorkspaceAgentPanel.css';

interface WorkspaceAgentPanelProps {
  projectId: number;
  branches: WorkspaceBranch[];
  agents: WorkspaceAgent[];
  isLoading?: boolean;
  onAgentsChange: (agents: WorkspaceAgent[]) => void;
  onReload: () => Promise<void>;
}

const POLL_INTERVAL_MS = 4500;

const WorkspaceAgentPanel: React.FC<WorkspaceAgentPanelProps> = ({
  projectId,
  agents,
  isLoading = false,
  onAgentsChange,
  onReload,
}) => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlinePrompt, setInlinePrompt] = useState('');
  const [inlineExactPrompt, setInlineExactPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  const [trashedAgents, setTrashedAgents] = useState<WorkspaceAgent[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);

  const loadTrashedAgents = useCallback(async () => {
    try {
      setTrashLoading(true);
      const trashed = await workspaceAgentsApi.getProjectAgents(projectId, { onlyTrashed: true });
      setTrashedAgents(trashed);
    } catch (err) {
      console.error('Failed to load trashed agents:', err);
    } finally {
      setTrashLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTrashedAgents();
  }, [loadTrashedAgents]);

  useEffect(() => {
    if (showTrash) {
      loadTrashedAgents();
    }
  }, [showTrash, loadTrashedAgents]);

  useEffect(() => {
    const shouldPoll = needsLivePolling(agents) || needsLivePolling(trashedAgents);
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      onReload().catch((err) => console.error('Failed to refresh agents:', err));
      if (showTrash) {
        loadTrashedAgents().catch((err) => console.error('Failed to refresh trash:', err));
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [agents, trashedAgents, showTrash, onReload, loadTrashedAgents]);

  const handleAgentAction = async (agent: WorkspaceAgent, action: 'start' | 'stop' | 'restart' | 'complete') => {
    try {
      setActionLoading((prev) => ({ ...prev, [agent.id]: action }));
      await workspaceAgentsApi.agentAction(projectId, agent.id, action);
      await onReload();
    } catch (err: unknown) {
      console.error(`Failed to ${action} agent:`, err);
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      alert(message || `Errore nell'eseguire l'azione: ${action}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[agent.id];
        return next;
      });
    }
  };

  const handleTrash = async (agent: WorkspaceAgent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Spostare "${agent.title}" nel cestino?`)) return;

    try {
      setActionLoading((prev) => ({ ...prev, [agent.id]: 'trash' }));
      await workspaceAgentsApi.trashAgent(projectId, agent.id);
      onAgentsChange(agents.filter((a) => a.id !== agent.id));
      if (showTrash) await loadTrashedAgents();
    } catch (err) {
      console.error('Failed to trash agent:', err);
      alert('Errore nello spostamento nel cestino');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[agent.id];
        return next;
      });
    }
  };

  const handleRestore = async (agent: WorkspaceAgent, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading((prev) => ({ ...prev, [agent.id]: 'restore' }));
      const restored = await workspaceAgentsApi.restoreAgent(projectId, agent.id);
      setTrashedAgents((prev) => prev.filter((a) => a.id !== agent.id));
      onAgentsChange([restored, ...agents]);
    } catch (err) {
      console.error('Failed to restore agent:', err);
      alert('Errore nel ripristino');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[agent.id];
        return next;
      });
    }
  };

  const handleForceDelete = async (agent: WorkspaceAgent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Eliminare definitivamente "${agent.title}"?`)) return;

    try {
      setActionLoading((prev) => ({ ...prev, [agent.id]: 'force-delete' }));
      await workspaceAgentsApi.forceDeleteAgent(projectId, agent.id);
      setTrashedAgents((prev) => prev.filter((a) => a.id !== agent.id));
    } catch (err) {
      console.error('Failed to force delete agent:', err);
      alert('Errore nell\'eliminazione definitiva');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[agent.id];
        return next;
      });
    }
  };

  const handleInlineCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTitle.trim() || !inlinePrompt.trim()) return;

    try {
      setIsCreating(true);
      setError(null);
      await workspaceAgentsApi.createAgent(projectId, {
        title: inlineTitle.trim(),
        prompt: inlinePrompt.trim(),
        exact_prompt: inlineExactPrompt,
      });
      await onReload();
      setInlineTitle('');
      setInlinePrompt('');
      setInlineExactPrompt(false);
      setShowInlineForm(false);
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError('Errore nella creazione agente');
    } finally {
      setIsCreating(false);
    }
  };

  const openAgentDetail = (agent: WorkspaceAgent) => {
    navigate(`/workspace/developer/progetti/${projectId}/lavorazioni/${agent.id}`);
  };

  const handleMoveInQueue = async (agent: WorkspaceAgent, direction: 'up' | 'down') => {
    const queued = groupAgentsBySection(agents).queued;
    const currentIndex = queued.findIndex((a) => a.id === agent.id);
    if (currentIndex < 0) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= queued.length) return;

    const reordered = [...queued];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      setActionLoading((prev) => ({ ...prev, [agent.id]: 'reorder' }));
      const updated = await workspaceAgentsApi.reorderQueue(
        projectId,
        reordered.map((a) => a.id)
      );
      onAgentsChange(updated);
    } catch (err) {
      console.error('Failed to reorder queue:', err);
      alert('Errore nel riordino della coda');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[agent.id];
        return next;
      });
    }
  };

  const hasRunningAgent = agents.some((a) => ['running', 'review'].includes(a.status));

  const getAgentActions = (agent: WorkspaceAgent) => {
    const loading = actionLoading[agent.id];
    const actions: Array<{
      key: string;
      icon: typeof Play;
      label: string;
      variant: 'primary' | 'danger' | 'warning' | 'success' | 'secondary';
      disabled?: boolean;
      onClick?: () => void;
    }> = [];

    switch (agent.status) {
      case 'pending': {
        const isNextInQueue = (agent.queue_position ?? 1) === 1;
        const canStart = !hasRunningAgent && isNextInQueue;
        actions.push({
          key: 'start',
          icon: Play,
          label: canStart ? 'Avvia' : 'In attesa',
          variant: 'primary',
          disabled: !!loading || !canStart,
        });
        break;
      }
      case 'running':
        actions.push({ key: 'stop', icon: Square, label: 'Stop', variant: 'danger', disabled: !!loading });
        break;
      case 'review':
        actions.push({ key: 'review', icon: MessageSquare, label: 'Review', variant: 'warning', onClick: () => openAgentDetail(agent) });
        actions.push({ key: 'complete', icon: CheckCircle, label: 'Completa', variant: 'success', disabled: !!loading });
        break;
      case 'failed':
      case 'stopped':
        actions.push({ key: 'restart', icon: RotateCcw, label: 'Riavvia', variant: 'primary', disabled: !!loading });
        actions.push({
          key: 'clone',
          icon: Copy,
          label: 'Clona',
          variant: 'secondary',
          onClick: () => {
            setInlineTitle(`${agent.title} (copia)`);
            setInlinePrompt(agent.prompt);
            setInlineExactPrompt(agent.exact_prompt ?? false);
            setShowInlineForm(true);
          },
        });
        break;
    }

    return actions;
  };

  const renderAgentRow = (
    agent: WorkspaceAgent,
    options?: { isTrashed?: boolean; queueIndex?: number; queueLength?: number }
  ) => {
    const statusConfig = getAgentStatusConfig(agent.status);
    const actions = options?.isTrashed ? [] : getAgentActions(agent);
    const loading = actionLoading[agent.id];
    const showQueueControls = !options?.isTrashed
      && agent.status === 'pending'
      && (options?.queueLength ?? 0) > 1;
    const lastLog = getLastLogLine(agent.logs);
    const executionSnippet = getExecutionSnippet(agent.n8n_execution_id);
    const activityTime = formatRelativeTime(getActivityTimestamp(agent));
    const showLogPreview = !options?.isTrashed && (agent.status === 'running' || agent.status === 'review') && lastLog;

    return (
      <div
        key={agent.id}
        className={`ws-agent-row ${statusConfig.pulse ? 'ws-agent-row--active' : ''} ${options?.isTrashed ? 'ws-agent-row--trashed' : ''}`}
        onClick={() => !options?.isTrashed && openAgentDetail(agent)}
        role={options?.isTrashed ? undefined : 'button'}
        tabIndex={options?.isTrashed ? undefined : 0}
        onKeyDown={(e) => {
          if (!options?.isTrashed && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openAgentDetail(agent);
          }
        }}
      >
        <div className="ws-agent-row__main">
          <div className="ws-agent-row__status-col">
            <span
              className={`ws-agent-row__dot ${statusConfig.pulse ? 'ws-agent-row__dot--pulse' : ''}`}
              style={{ backgroundColor: statusConfig.color }}
              title={statusConfig.label}
            />
          </div>

          <div className="ws-agent-row__content">
            <div className="ws-agent-row__top">
              <span className="ws-agent-row__title">{agent.title}</span>
              <span className="ws-agent-row__status-label" style={{ color: statusConfig.color }}>
                {statusConfig.label}
              </span>
            </div>

            <p className="ws-agent-row__excerpt">{getPromptExcerpt(agent)}</p>

            {showLogPreview && (
              <p className="ws-agent-row__log-preview">{lastLog}</p>
            )}

            <div className="ws-agent-row__meta">
              {activityTime && <span className="ws-agent-row__meta-item">{activityTime}</span>}
              {agent.queue_position != null && agent.status === 'pending' && (
                <span className="ws-agent-row__meta-item ws-agent-row__meta-item--queue">
                  <ListOrdered size={11} />
                  {agent.queue_position === 1 ? 'Prossimo in coda' : `Pos. ${agent.queue_position}`}
                </span>
              )}
              {agent.status === 'running' && agent.started_at && (
                <span className="ws-agent-row__meta-item">
                  <Clock size={11} />
                  {formatRelativeTime(agent.started_at) === 'Ora' ? 'Avviato ora' : `Da ${formatRelativeTime(agent.started_at)}`}
                </span>
              )}
              {executionSnippet && (
                <span className="ws-agent-row__meta-item ws-agent-row__meta-item--mono">{executionSnippet}</span>
              )}
              {agent.branch && (
                <span className="ws-agent-row__meta-item ws-agent-row__meta-item--branch">{agent.branch.name}</span>
              )}
            </div>
          </div>

          <div className="ws-agent-row__actions" onClick={(e) => e.stopPropagation()}>
            {showQueueControls && (
              <>
                <button
                  type="button"
                  className="ws-agent-icon-btn"
                  title="Sposta su"
                  disabled={!!loading || (options?.queueIndex ?? 0) === 0}
                  onClick={() => handleMoveInQueue(agent, 'up')}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="ws-agent-icon-btn"
                  title="Sposta giù"
                  disabled={!!loading || (options?.queueIndex ?? 0) >= (options?.queueLength ?? 1) - 1}
                  onClick={() => handleMoveInQueue(agent, 'down')}
                >
                  <ChevronDown size={14} />
                </button>
              </>
            )}
            {options?.isTrashed ? (
              <>
                <button
                  type="button"
                  className="ws-agent-icon-btn ws-agent-icon-btn--restore"
                  title="Ripristina"
                  onClick={(e) => handleRestore(agent, e)}
                  disabled={!!loading}
                >
                  {loading === 'restore' ? <Loader2 size={14} className="spin" /> : <Undo2 size={14} />}
                </button>
                <button
                  type="button"
                  className="ws-agent-icon-btn ws-agent-icon-btn--danger"
                  title="Elimina definitivamente"
                  onClick={(e) => handleForceDelete(agent, e)}
                  disabled={!!loading}
                >
                  {loading === 'force-delete' ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                </button>
              </>
            ) : (
              <>
                {actions.map((action) => {
                  const Icon = action.icon;
                  const isActionLoading = loading === action.key;

                  if (action.onClick) {
                    return (
                      <button
                        key={action.key}
                        type="button"
                        className={`ws-agent-action-chip ws-agent-action-chip--${action.variant}`}
                        onClick={action.onClick}
                        title={action.label}
                      >
                        <Icon size={12} />
                        <span>{action.label}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={action.key}
                      type="button"
                      className={`ws-agent-action-chip ws-agent-action-chip--${action.variant}`}
                      onClick={() => handleAgentAction(agent, action.key as 'start' | 'stop' | 'restart' | 'complete')}
                      disabled={action.disabled || isActionLoading}
                      title={action.label}
                    >
                      {isActionLoading ? <Loader2 size={12} className="spin" /> : <Icon size={12} />}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="ws-agent-icon-btn"
                  title="Sposta nel cestino"
                  onClick={(e) => handleTrash(agent, e)}
                  disabled={!!loading}
                >
                  {loading === 'trash' ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                </button>
                <ChevronRight size={14} className="ws-agent-row__chevron" />
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (sectionKey: AgentSectionKey, sectionAgents: WorkspaceAgent[]) => {
    if (sectionAgents.length === 0) return null;

    return (
      <section key={sectionKey} className="ws-agent-section">
        <header className="ws-agent-section__header">
          <h3 className="ws-agent-section__title">{SECTION_LABELS[sectionKey]}</h3>
          <span className="ws-agent-section__count">{sectionAgents.length}</span>
        </header>
        <div className="ws-agent-section__list">
          {sectionAgents.map((agent, index) => renderAgentRow(agent, {
            queueIndex: sectionKey === 'queued' ? index : undefined,
            queueLength: sectionKey === 'queued' ? sectionAgents.length : undefined,
          }))}
        </div>
      </section>
    );
  };

  const grouped = groupAgentsBySection(agents);
  const hasAgents = agents.length > 0;
  const queuedCount = grouped.queued.length;

  if (isLoading && agents.length === 0) {
    return (
      <div className="workspace-agent-panel">
        <div className="ws-agent-loading">
          <Loader2 size={20} />
          <span>Caricamento lavorazioni...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-agent-panel">
      <div className="ws-agent-toolbar">
        <div className="ws-agent-toolbar__info">
          <h2>Lavorazioni</h2>
          {needsLivePolling(agents) && (
            <span className="ws-agent-live-badge">
              <span className="ws-agent-live-badge__dot" />
              Live
            </span>
          )}
          {queuedCount > 0 && (
            <span className="ws-agent-queue-summary">
              <ListOrdered size={12} />
              {queuedCount === 1 ? '1 in coda' : `${queuedCount} in coda`}
            </span>
          )}
        </div>
        <button type="button" className="ws-agent-new-btn" onClick={() => setShowInlineForm(!showInlineForm)}>
          {showInlineForm ? 'Annulla' : 'Nuova'}
        </button>
      </div>

      {showInlineForm && (
        <form className="ws-agent-inline-form" onSubmit={handleInlineCreate}>
          <input
            type="text"
            placeholder="Titolo lavorazione..."
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            className="ws-agent-inline-input"
            required
          />
          <textarea
            placeholder="Istruzioni per l'agente..."
            value={inlinePrompt}
            onChange={(e) => setInlinePrompt(e.target.value)}
            className="ws-agent-inline-textarea"
            rows={2}
            required
          />
          <ExactPromptCheckbox
            checked={inlineExactPrompt}
            onChange={setInlineExactPrompt}
            disabled={isCreating}
            id="workspace-agent-exact-prompt"
          />
          <button type="submit" className="ws-agent-inline-submit" disabled={isCreating}>
            {isCreating ? <Loader2 size={14} className="spin" /> : <ListOrdered size={14} />}
            <span>{isCreating ? 'Aggiunta...' : 'Aggiungi in coda'}</span>
          </button>
        </form>
      )}

      {error && (
        <div className="ws-agent-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {queuedCount > 1 && (
        <div className="ws-agent-queue-banner">
          <ListOrdered size={14} />
          <span>
            <strong>{queuedCount}</strong> lavorazioni in coda — esecuzione sequenziale
          </span>
        </div>
      )}

      {hasAgents ? (
        <div className="ws-agent-sections">
          {SECTION_ORDER.map((key) => renderSection(key, grouped[key]))}
        </div>
      ) : (
        <div className="ws-agent-empty">
          <Bot size={28} />
          <h3>Nessuna lavorazione</h3>
          <p>Crea una lavorazione per avviare un agente AI sul progetto.</p>
        </div>
      )}

      <div className="ws-agent-trash">
        <button
          type="button"
          className="ws-agent-trash__toggle"
          onClick={() => setShowTrash(!showTrash)}
        >
          {showTrash ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Trash2 size={14} />
          <span>Cestino</span>
          {trashedAgents.length > 0 && (
            <span className="ws-agent-trash__count">{trashedAgents.length}</span>
          )}
        </button>

        {showTrash && (
          <div className="ws-agent-trash__content">
            {trashLoading ? (
              <div className="ws-agent-trash__loading">
                <Loader2 size={16} className="spin" />
                <span>Caricamento cestino...</span>
              </div>
            ) : trashedAgents.length > 0 ? (
              <div className="ws-agent-section__list">
                {trashedAgents.map((agent) => renderAgentRow(agent, { isTrashed: true }))}
              </div>
            ) : (
              <p className="ws-agent-trash__empty">Il cestino è vuoto</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceAgentPanel;
