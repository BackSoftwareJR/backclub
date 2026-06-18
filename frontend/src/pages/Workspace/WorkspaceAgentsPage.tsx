import React, { useState, useEffect, useCallback } from 'react';
import { Bot, ArrowRight, Loader2, AlertCircle, ChevronRight, ListOrdered } from 'lucide-react';
import { Link } from 'react-router-dom';
import { workspaceApi } from '../../api/workspace';
import { workspaceAgentsApi } from '../../api/workspaceAgents';
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

const WorkspaceAgentsPage: React.FC = () => {
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [agentsByProject, setAgentsByProject] = useState<Record<number, WorkspaceAgent[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allAgentsFlat = Object.values(agentsByProject).flat();
  const shouldPoll = needsLivePolling(allAgentsFlat);

  useEffect(() => {
    if (!shouldPoll) return;
    const interval = setInterval(() => {
      loadData(true).catch((err) => console.error('Failed to refresh agents:', err));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [shouldPoll, loadData]);

  const getAllAgents = (): Array<WorkspaceAgent & { projectName: string }> => {
    const allAgents: Array<WorkspaceAgent & { projectName: string }> = [];

    projects.forEach((project) => {
      const projectAgents = agentsByProject[project.id] || [];
      projectAgents.forEach((agent) => {
        allAgents.push({
          ...agent,
          projectName: project.name,
        });
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
