import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, ArrowRight, Loader2, AlertCircle, ChevronRight, ListOrdered,
  RefreshCw, TriangleAlert, CheckCircle2, Zap, X, WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { workspaceApi } from '../../api/workspace';
import { workspaceAgentsApi, agentQueueApi } from '../../api/workspaceAgents';
import type { AgentQueueData, AgentQueueItem } from '../../api/workspaceAgents';
import type { WorkspaceProject, WorkspaceAgent } from '../../types/workspace';
import {
  getAgentStatusConfig,
  formatRelativeTime,
  getActivityTimestamp,
  getPromptExcerpt,
  getExecutionSnippet,
  needsLivePolling,
} from './utils/workspaceAgentUtils';
import './WorkspaceAgentsPage.css';

const POLL_INTERVAL_MS = 4500;
const QUEUE_POLL_INTERVAL_MS = 8000;

// ─── Queue Panel ─────────────────────────────────────────────────────────────

interface QueuePanelProps {
  queue: AgentQueueData | null;
  isLoadingQueue: boolean;
  onResetStuck: () => Promise<void>;
  onForceDispatch: (projectId: number) => Promise<void>;
  onCancelItem: (type: 'crm_task' | 'workspace_agent', id: number) => Promise<void>;
  onRefresh: () => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({
  queue, isLoadingQueue, onResetStuck, onForceDispatch, onCancelItem, onRefresh,
}) => {
  const [resetting, setResetting] = useState(false);
  const [dispatchingProject, setDispatchingProject] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleReset = async () => {
    setResetting(true);
    setFeedback(null);
    try {
      const result = await onResetStuck();
      setFeedback((result as any)?.message ?? 'Fatto!');
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: any) {
      setFeedback('Errore: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDispatch = async (projectId: number) => {
    setDispatchingProject(projectId);
    try {
      await onForceDispatch(projectId);
      setFeedback('Dispatch avviato!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback('Errore: ' + e.message);
    } finally {
      setDispatchingProject(null);
    }
  };

  const handleCancel = async (type: 'crm_task' | 'workspace_agent', id: number) => {
    const key = `${type}-${id}`;
    setCancellingId(key);
    try {
      await onCancelItem(type, id);
    } catch (e: any) {
      setFeedback('Errore: ' + e.message);
    } finally {
      setCancellingId(null);
    }
  };

  const getDotClass = (item: AgentQueueItem) => {
    if (item.is_stale) return 'ws-queue-dot ws-queue-dot--stale';
    if (item.status === 'processing' || item.status === 'running') return 'ws-queue-dot ws-queue-dot--running';
    if (item.status === 'review') return 'ws-queue-dot ws-queue-dot--review';
    return 'ws-queue-dot ws-queue-dot--pending';
  };

  const hasAlert = queue && (queue.stale_count > 0 || queue.blocked_count > 0);

  return (
    <div className="ws-queue-panel">
      <div className={`ws-queue-panel-header${hasAlert ? ' ws-queue-panel-header--alert' : ''}`}>
        <div className="ws-queue-panel-title">
          <ListOrdered size={15} />
          <h3>Coda Agenti</h3>
          {queue && (
            <>
              {queue.stale_count > 0 && (
                <span className="ws-queue-panel-badge ws-queue-panel-badge--warn">
                  {queue.stale_count} bloccati
                </span>
              )}
              {queue.total > 0 && queue.stale_count === 0 && (
                <span className="ws-queue-panel-badge ws-queue-panel-badge--info">
                  {queue.total} in coda
                </span>
              )}
              {!queue.n8n_enabled && (
                <span className="ws-queue-panel-badge ws-queue-panel-badge--warn">
                  N8N disabilitato
                </span>
              )}
            </>
          )}
        </div>

        <div className="ws-queue-panel-actions">
          {feedback && (
            <span style={{ fontSize: 12, color: 'var(--ws-text-secondary)' }}>{feedback}</span>
          )}
          <button
            className="ws-queue-btn ws-queue-btn--dispatch"
            onClick={onRefresh}
            disabled={isLoadingQueue}
            title="Aggiorna coda"
          >
            <RefreshCw size={12} className={isLoadingQueue ? 'ws-queue-spin' : ''} />
            Aggiorna
          </button>
          {queue && queue.stale_count > 0 && (
            <button
              className="ws-queue-btn ws-queue-btn--reset"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? <Loader2 size={12} /> : <Zap size={12} />}
              Sblocca tutto
            </button>
          )}
        </div>
      </div>

      {isLoadingQueue && !queue ? (
        <div className="ws-queue-empty">
          <Loader2 size={14} style={{ animation: 'ws-spin 0.8s linear infinite' }} />
          Caricamento coda…
        </div>
      ) : !queue?.n8n_enabled ? (
        <div className="ws-queue-n8n-disabled">
          <WifiOff size={14} />
          N8N non abilitato — gli agenti non possono partire.
        </div>
      ) : queue.total === 0 ? (
        <div className="ws-queue-empty">
          <CheckCircle2 size={14} />
          Coda libera — nessun job in attesa o bloccato.
        </div>
      ) : (
        <div className="ws-queue-items">
          {queue.items.map((item) => {
            const cancelKey = `${item.type}-${item.id}`;
            const isCancelling = cancellingId === cancelKey;
            const isDispatching = dispatchingProject === item.project_id;

            return (
              <div
                key={cancelKey}
                className={`ws-queue-item${item.is_stale ? ' ws-queue-item--stale' : ''}`}
              >
                <span className={getDotClass(item)} />

                <div className="ws-queue-item-body">
                  <div className="ws-queue-item-top">
                    <span className="ws-queue-item-title">{item.title}</span>
                    <span className={`ws-queue-item-type-badge${item.type === 'crm_task' ? ' ws-queue-item-type-badge--crm' : ''}`}>
                      {item.type === 'crm_task' ? 'CRM Task' : 'Workspace'}
                    </span>
                  </div>
                  <div className="ws-queue-item-meta">
                    <span className="ws-queue-item-project">{item.project_name}</span>
                    {item.queue_position != null && (
                      <span>Pos. {item.queue_position}</span>
                    )}
                    {item.is_stale ? (
                      <span className="ws-queue-item-stale-warn">
                        <TriangleAlert size={10} style={{ display: 'inline', marginRight: 3 }} />
                        Bloccato da {item.stale_minutes}min
                      </span>
                    ) : (
                      <span>{formatRelativeTime(item.updated_at)}</span>
                    )}
                    {item.n8n_error && (
                      <span title={item.n8n_error} style={{ color: '#ef4444', cursor: 'help' }}>
                        Errore ⓘ
                      </span>
                    )}
                  </div>
                </div>

                <div className="ws-queue-item-actions">
                  {item.is_stale && (
                    <button
                      className="ws-queue-btn ws-queue-btn--dispatch"
                      onClick={() => handleDispatch(item.project_id)}
                      disabled={isDispatching}
                      title="Forza dispatch per questo progetto"
                    >
                      {isDispatching ? <Loader2 size={11} /> : <Zap size={11} />}
                      Dispatch
                    </button>
                  )}
                  <button
                    className="ws-queue-btn ws-queue-btn--cancel"
                    onClick={() => handleCancel(item.type, item.id)}
                    disabled={isCancelling}
                    title="Rimuovi dalla coda"
                  >
                    {isCancelling ? <Loader2 size={11} /> : <X size={11} />}
                  </button>
                  <Link
                    to={item.url}
                    className="ws-queue-btn ws-queue-btn--dispatch"
                    style={{ textDecoration: 'none' }}
                    title="Apri dettaglio"
                  >
                    <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const WorkspaceAgentsPage: React.FC = () => {
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [agentsByProject, setAgentsByProject] = useState<Record<number, WorkspaceAgent[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queue, setQueue] = useState<AgentQueueData | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }

      const projectsData = await workspaceApi.getWorkspaceProjects();
      setProjects(projectsData);

      const agentsData: Record<number, WorkspaceAgent[]> = {};
      await Promise.all(
        projectsData.map(async (project) => {
          try {
            const agents = await workspaceAgentsApi.getProjectAgents(project.id);
            agentsData[project.id] = agents;
          } catch (err) {
            console.error(`Failed to load agents for project ${project.id}:`, err);
            agentsData[project.id] = [];
          }
        })
      );

      setAgentsByProject(agentsData);
    } catch (err) {
      console.error('Failed to load agents page data:', err);
      if (!silent) setError('Errore nel caricamento dei dati');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const loadQueue = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingQueue(true);
    try {
      const data = await agentQueueApi.getQueue();
      setQueue(data);
    } catch (e) {
      console.error('Failed to load agent queue:', e);
    } finally {
      if (!silent) setIsLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadQueue();
  }, [loadData, loadQueue]);

  const allAgentsFlat = Object.values(agentsByProject).flat();
  const shouldPoll = needsLivePolling(allAgentsFlat);
  const queueHasActive = queue ? queue.total > 0 : false;

  useEffect(() => {
    if (!shouldPoll) return;
    const interval = setInterval(() => {
      loadData(true).catch(console.error);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [shouldPoll, loadData]);

  useEffect(() => {
    if (!queueHasActive) return;
    const interval = setInterval(() => {
      loadQueue(true).catch(console.error);
    }, QUEUE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [queueHasActive, loadQueue]);

  // Queue actions
  const handleResetStuck = async () => {
    const result = await agentQueueApi.resetStuck();
    await Promise.all([loadQueue(), loadData(true)]);
    return result as any;
  };

  const handleForceDispatch = async (projectId: number) => {
    await agentQueueApi.forceDispatch(projectId);
    await Promise.all([loadQueue(true), loadData(true)]);
  };

  const handleCancelItem = async (type: 'crm_task' | 'workspace_agent', id: number) => {
    await agentQueueApi.cancelItem(type, id);
    await Promise.all([loadQueue(), loadData(true)]);
  };

  const getAllAgents = (): Array<WorkspaceAgent & { projectName: string }> => {
    const allAgents: Array<WorkspaceAgent & { projectName: string }> = [];
    projects.forEach((project) => {
      const projectAgents = agentsByProject[project.id] || [];
      projectAgents.forEach((agent) => {
        allAgents.push({ ...agent, projectName: project.name });
      });
    });
    return allAgents.sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
  };

  const getActiveAgentsCount = (): number =>
    getAllAgents().filter((agent) => ['running', 'review', 'pending'].includes(agent.status)).length;

  const getProjectsWithAgents = () =>
    projects.filter((project) => (agentsByProject[project.id] || []).length > 0);

  if (isLoading) {
    return (
      <div className="workspace-agents-page">
        <div className="workspace-agents-loading">
          <Loader2 size={32} />
          <span>Caricamento lavorazioni...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-agents-page">
        <div className="workspace-agents-error">
          <AlertCircle size={32} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const allAgents = getAllAgents();
  const activeAgentsCount = getActiveAgentsCount();
  const projectsWithAgents = getProjectsWithAgents();
  const queuedCount = allAgents.filter((a) => a.status === 'pending').length;

  return (
    <div className="workspace-agents-page">
      <div className="workspace-agents-header">
        <div className="workspace-agents-title-section">
          <div className="workspace-agents-title-row">
            <h1>Lavorazioni</h1>
            {shouldPoll && (
              <span className="workspace-agents-live-badge">
                <span className="workspace-agents-live-badge__dot" />
                Live
              </span>
            )}
          </div>
          <p>Agenti AI attivi sui tuoi progetti</p>
        </div>

        <div className="workspace-agents-stats">
          <div className="workspace-agents-stat">
            <strong>{allAgents.length}</strong>
            <span>Totali</span>
          </div>
          <div className="workspace-agents-stat">
            <strong>{activeAgentsCount}</strong>
            <span>Attivi</span>
          </div>
          <div className="workspace-agents-stat">
            <strong>{projectsWithAgents.length}</strong>
            <span>Progetti</span>
          </div>
        </div>
      </div>

      {/* Coda centralizzata sempre visibile */}
      <QueuePanel
        queue={queue}
        isLoadingQueue={isLoadingQueue}
        onResetStuck={handleResetStuck}
        onForceDispatch={handleForceDispatch}
        onCancelItem={handleCancelItem}
        onRefresh={() => loadQueue()}
      />

      {queuedCount > 1 && (
        <div className="workspace-agents-queue-banner">
          <ListOrdered size={14} />
          <span>
            <strong>{queuedCount}</strong> lavorazioni in coda tra i progetti
          </span>
        </div>
      )}

      {allAgents.length > 0 ? (
        <div className="workspace-agents-content">
          <div className="workspace-agents-section">
            <h2>Recenti</h2>
            <div className="workspace-agents-recent-list">
              {allAgents.slice(0, 12).map((agent) => {
                const statusConfig = getAgentStatusConfig(agent.status);
                const executionSnippet = getExecutionSnippet(agent.n8n_execution_id);

                return (
                  <Link
                    key={`${agent.project_id}-${agent.id}`}
                    to={`/workspace/developer/progetti/${agent.project_id}/lavorazioni/${agent.id}`}
                    className={`workspace-agent-recent-row ${statusConfig.pulse ? 'workspace-agent-recent-row--active' : ''}`}
                  >
                    <span
                      className={`workspace-agent-recent-dot ${statusConfig.pulse ? 'workspace-agent-recent-dot--pulse' : ''}`}
                      style={{ backgroundColor: statusConfig.color }}
                    />
                    <div className="workspace-agent-recent-body">
                      <div className="workspace-agent-recent-top">
                        <span className="workspace-agent-recent-title">{agent.title}</span>
                        {agent.crm_task_id && (
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 4,
                            background: 'color-mix(in srgb, #a855f7 12%, transparent)',
                            color: '#a855f7', fontWeight: 600, flexShrink: 0,
                          }}>
                            CRM
                          </span>
                        )}
                        <span className="workspace-agent-recent-status" style={{ color: statusConfig.color }}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="workspace-agent-recent-excerpt">{getPromptExcerpt(agent)}</p>
                      <div className="workspace-agent-recent-meta">
                        <span className="workspace-agent-recent-project">{agent.projectName}</span>
                        <span>{formatRelativeTime(getActivityTimestamp(agent))}</span>
                        {agent.queue_position != null && agent.status === 'pending' && (
                          <span className="workspace-agent-recent-queue">Pos. {agent.queue_position}</span>
                        )}
                        {executionSnippet && (
                          <span className="workspace-agent-recent-mono">{executionSnippet}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="workspace-agent-recent-chevron" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="workspace-agents-section">
            <h2>Per progetto</h2>
            <div className="workspace-agents-projects-list">
              {projectsWithAgents.map((project) => {
                const projectAgents = agentsByProject[project.id] || [];
                const activeCount = projectAgents.filter((a) =>
                  ['running', 'review', 'pending'].includes(a.status)
                ).length;

                return (
                  <div key={project.id} className="workspace-agents-project-card">
                    <div className="workspace-agents-project-info">
                      <h3>{project.name}</h3>
                      <div className="workspace-agents-project-stats">
                        <span>{projectAgents.length} lavorazioni</span>
                        {activeCount > 0 && (
                          <span className="workspace-agents-project-active">{activeCount} attive</span>
                        )}
                      </div>
                    </div>

                    <div className="workspace-agents-project-agents">
                      {projectAgents.slice(0, 4).map((agent) => {
                        const statusConfig = getAgentStatusConfig(agent.status);
                        return (
                          <div key={agent.id} className="workspace-agents-project-agent">
                            <span
                              className="workspace-agents-project-agent-dot"
                              style={{ backgroundColor: statusConfig.color }}
                            />
                            <span className="workspace-agents-project-agent-title">{agent.title}</span>
                            <span className="workspace-agents-project-agent-status">{statusConfig.label}</span>
                          </div>
                        );
                      })}
                      {projectAgents.length > 4 && (
                        <div className="workspace-agents-project-more">+{projectAgents.length - 4} altre</div>
                      )}
                    </div>

                    <Link
                      to={`/workspace/developer/progetti/${project.id}?tab=lavorazioni`}
                      className="workspace-agents-project-link"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="workspace-agents-empty">
          <Bot size={48} />
          <h3>Nessuna lavorazione</h3>
          <p>Gli agenti AI ti aiutano ad automatizzare il lavoro sui progetti workspace.</p>
          <Link to="/workspace/developer/progetti" className="workspace-agents-empty-btn">
            Vai ai progetti
          </Link>
        </div>
      )}
    </div>
  );
};

export default WorkspaceAgentsPage;
