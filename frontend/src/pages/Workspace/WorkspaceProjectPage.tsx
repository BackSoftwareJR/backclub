import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Loader2,
  AlertCircle,
  Crown,
  Settings,
  CheckSquare,
  Plus,
  Wrench,
  Bell,
  Code2,
  Upload,
  ChevronDown,
  GitBranch,
} from 'lucide-react';
import { workspaceApi } from '../../api/workspace';
import { workspaceTasksApi } from '../../api/workspaceTasks';
import { workspaceAgentsApi } from '../../api/workspaceAgents';
import type { WorkspaceProject, WorkspaceBranch, WorkspaceUserTask, WorkspaceAgent } from '../../types/workspace';
import FloatingTaskPanel from './components/FloatingTaskPanel';
import TaskDetailModal from './components/TaskDetailModal';
import AddTaskForm from './components/AddTaskForm';
import WorkspaceAgentPanel from './components/WorkspaceAgentPanel';
import './WorkspaceProjectPage.css';

type TabType = 'tasks' | 'lavorazioni' | 'aggiornamenti' | 'code';

const TAB_MAP: Record<string, TabType> = {
  tasks: 'tasks',
  task: 'tasks',
  lavorazioni: 'lavorazioni',
  agents: 'lavorazioni',
  agenti: 'lavorazioni',
  aggiornamenti: 'aggiornamenti',
  updates: 'aggiornamenti',
  code: 'code',
};

const WorkspaceProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<(WorkspaceProject & { branches: WorkspaceBranch[] }) | null>(null);
  const [tasks, setTasks] = useState<WorkspaceUserTask[]>([]);
  const [agents, setAgents] = useState<WorkspaceAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [selectedTask, setSelectedTask] = useState<WorkspaceUserTask | null>(null);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const projectId = id ? parseInt(id, 10) : null;

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TAB_MAP[tabParam]) {
      setActiveTab(TAB_MAP[tabParam]);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await workspaceApi.getWorkspaceProject(projectId);
        setProject(data);
      } catch (err) {
        console.error('Failed to load workspace project:', err);
        setError('Errore nel caricamento del progetto');
      } finally {
        setIsLoading(false);
      }
    };
    loadProject();
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingTasks(true);
      const tasksData = await workspaceTasksApi.getWorkspaceTasks(projectId);
      setTasks(tasksData);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [projectId]);

  const loadAgents = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingAgents(true);
      const agentsData = await workspaceAgentsApi.getProjectAgents(projectId);
      setAgents(agentsData);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (activeTab === 'tasks') loadTasks();
    if (activeTab === 'lavorazioni' || activeTab === 'aggiornamenti') loadAgents();
  }, [projectId, activeTab, loadTasks, loadAgents]);

  useEffect(() => {
    if (!projectId || activeTab !== 'tasks') return;
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, [activeTab, projectId, loadTasks]);

  const handleTaskComplete = async (taskId: number) => {
    if (!projectId) return;
    try {
      await workspaceTasksApi.updateWorkspaceTask(projectId, taskId, { status: 'completed' });
      await loadTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
      showToast('error', 'Errore nel completare la task');
    }
  };

  const handleTaskCreated = async () => {
    await loadTasks();
    setShowAddTaskForm(false);
  };

  const handleTaskUpdated = async () => {
    await loadTasks();
    setSelectedTask(null);
  };

  const handlePublish = async () => {
    if (!projectId || !project?.github_url) {
      showToast('error', 'Nessun repository GitHub configurato');
      return;
    }
    try {
      setIsPublishing(true);
      const result = await workspaceApi.publishProject(projectId);
      showToast('success', result.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante la pubblicazione';
      showToast('error', message);
    } finally {
      setIsPublishing(false);
    }
  };

  const getStatusDotClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active': case 'attivo': return 'status-dot--green';
      case 'pending': case 'in_attesa': return 'status-dot--yellow';
      case 'completed': case 'completato': return 'status-dot--blue';
      default: return 'status-dot--gray';
    }
  };

  const formatStatus = (status: string): string => {
    const map: Record<string, string> = {
      active: 'Attivo', pending: 'In Attesa', completed: 'Completato', paused: 'Sospeso',
    };
    return map[status.toLowerCase()] || status;
  };

  const getTaskStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      todo: 'var(--ws-text-tertiary)',
      in_progress: 'var(--ws-accent)',
      review: 'var(--ws-orange)',
      completed: 'var(--ws-green)',
    };
    return colors[status] || 'var(--ws-text-tertiary)';
  };

  const getTaskStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      todo: 'Da fare', in_progress: 'In corso', review: 'In revisione', completed: 'Completato',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      low: 'var(--ws-text-tertiary)',
      medium: 'var(--ws-accent)',
      high: 'var(--ws-orange)',
      urgent: 'var(--ws-danger)',
    };
    return colors[priority] || 'var(--ws-text-tertiary)';
  };

  const updateAgents = (updated: WorkspaceAgent[]) => setAgents(updated);

  const agentUpdates = agents
    .filter((a) => a.result || a.review_message || ['completed', 'review', 'failed'].includes(a.status))
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  const activeLavorazioniCount = agents.filter((a) => ['running', 'review', 'pending'].includes(a.status)).length;

  if (isLoading) {
    return (
      <div className="wpp-state-centered">
        <Loader2 className="wpp-loading-icon" size={20} />
        <span>Caricamento progetto...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="wpp-state-centered wpp-state-error">
        <AlertCircle size={20} />
        <p>{error || 'Progetto non trovato'}</p>
        <Link to="/workspace/developer/progetti" className="wpp-back-btn">
          Torna ai progetti
        </Link>
      </div>
    );
  }

  return (
    <div className="wpp-page">
      {/* ── Toast ── */}
      {toast && (
        <div className={`wpp-toast wpp-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* ── Project header bar ── */}
      <header className="wpp-header">
        <div className="wpp-header-left">
          <Link to="/workspace/developer/progetti" className="wpp-breadcrumb-back">
            <ArrowLeft size={12} />
            <span>Progetti</span>
          </Link>
          <span className="wpp-breadcrumb-sep">/</span>
          <div className="wpp-header-title-row">
            <span className={`wpp-status-dot ${getStatusDotClass(project.status)}`} />
            <h1 className="wpp-title">{project.name}</h1>
            {project.is_project_manager && (
              <span className="wpp-pm-badge" title="Sei il Project Manager">
                <Crown size={9} /> PM
              </span>
            )}
          </div>
        </div>

        <div className="wpp-header-right">
          {project.workspace_settings?.staging_url && (
            <a
              href={project.workspace_settings.staging_url}
              target="_blank"
              rel="noopener noreferrer"
              className="wpp-header-link"
            >
              <ExternalLink size={12} />
              <span>Staging</span>
            </a>
          )}
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="wpp-header-link"
            >
              <Github size={12} />
              <span>GitHub</span>
            </a>
          )}
          {project.is_project_manager && (
            <a
              href={`/freelance/progetti/${project.id}/gestione?tab=workspace`}
              target="_blank"
              rel="noopener noreferrer"
              className="wpp-header-link wpp-header-link--accent"
            >
              <Settings size={12} />
              <span>Configura</span>
            </a>
          )}
          <button
            className="wpp-publish-btn"
            onClick={handlePublish}
            disabled={isPublishing || !project.github_url}
            title={project.github_url ? 'Pubblica staging → main' : 'Configura GitHub URL'}
          >
            {isPublishing ? <Loader2 size={12} className="wpp-spin" /> : <Upload size={12} />}
            <span>{isPublishing ? 'Pubblicazione...' : 'Pubblica'}</span>
          </button>
        </div>
      </header>

      {/* ── Progress bar (if any) ── */}
      {project.progress > 0 && (
        <div className="wpp-progress-track">
          <div
            className="wpp-progress-fill"
            style={{ width: `${project.progress}%` }}
            title={`${project.progress}% completato`}
          />
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="wpp-tabbar">
        <button
          className={`wpp-tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={13} />
          <span>Task</span>
          <span className="wpp-tab-count">{project.open_tasks_count}</span>
        </button>
        <button
          className={`wpp-tab ${activeTab === 'lavorazioni' ? 'active' : ''}`}
          onClick={() => setActiveTab('lavorazioni')}
        >
          <Wrench size={13} />
          <span>Lavorazioni</span>
          {activeLavorazioniCount > 0 && (
            <span className="wpp-tab-count wpp-tab-count--active">{activeLavorazioniCount}</span>
          )}
        </button>
        <button
          className={`wpp-tab ${activeTab === 'aggiornamenti' ? 'active' : ''}`}
          onClick={() => setActiveTab('aggiornamenti')}
        >
          <Bell size={13} />
          <span>Aggiornamenti</span>
          {agentUpdates.length > 0 && (
            <span className="wpp-tab-count">{agentUpdates.length}</span>
          )}
        </button>
        <button
          className={`wpp-tab ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          <Code2 size={13} />
          <span>Code</span>
        </button>
      </div>

      {/* ── Content area ── */}
      <div className={`wpp-content ${activeTab === 'lavorazioni' ? 'wpp-content--full' : ''}`}>

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="wpp-tab-pane">
            <div className="wpp-tasks-toolbar">
              <h2 className="wpp-section-title">Task</h2>
              <button className="wpp-add-btn" onClick={() => setShowAddTaskForm(true)}>
                <Plus size={12} />
                Aggiungi
              </button>
            </div>

            {loadingTasks ? (
              <div className="wpp-loading-inline">
                <Loader2 size={16} className="wpp-spin" />
                <span>Caricamento task...</span>
              </div>
            ) : tasks.length > 0 ? (
              <div className="wpp-tasks-list">
                {/* List header */}
                <div className="wpp-tasks-list-header">
                  <div className="wpp-tc-status" />
                  <div className="wpp-tc-title">TITOLO</div>
                  <div className="wpp-tc-priority">PRIORITÀ</div>
                  <div className="wpp-tc-status-label">STATO</div>
                  <div className="wpp-tc-due">SCADENZA</div>
                  <div className="wpp-tc-action" />
                </div>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="wpp-task-row"
                    onClick={() => setSelectedTask(task)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelectedTask(task)}
                  >
                    <div className="wpp-tc-status">
                      <span
                        className="wpp-task-status-dot"
                        style={{ backgroundColor: getTaskStatusColor(task.status) }}
                      />
                    </div>
                    <div className="wpp-tc-title">
                      <span className="wpp-task-title">{task.title}</span>
                      {task.description && (
                        <span className="wpp-task-desc">
                          {task.description.length > 60
                            ? `${task.description.substring(0, 60)}…`
                            : task.description}
                        </span>
                      )}
                    </div>
                    <div className="wpp-tc-priority">
                      <span
                        className="wpp-priority-badge"
                        style={{ color: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <div className="wpp-tc-status-label">
                      <span
                        className="wpp-status-chip"
                        style={{ color: getTaskStatusColor(task.status) }}
                      >
                        {getTaskStatusLabel(task.status)}
                      </span>
                    </div>
                    <div className="wpp-tc-due">
                      {task.due_date && (
                        <span className="wpp-due-date">
                          {new Date(task.due_date).toLocaleDateString('it-IT', {
                            month: 'short', day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="wpp-tc-action" onClick={e => e.stopPropagation()}>
                      {task.status !== 'completed' && (
                        <button
                          className="wpp-task-complete-btn"
                          onClick={() => handleTaskComplete(task.id)}
                          title="Segna completata"
                        >
                          <CheckSquare size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wpp-empty">
                <CheckSquare size={28} className="wpp-empty-icon" />
                <h3>Nessuna task</h3>
                <p>Crea la tua prima task per organizzare il lavoro.</p>
              </div>
            )}
          </div>
        )}

        {/* Lavorazioni tab — IDE split-pane style */}
        {activeTab === 'lavorazioni' && (
          <div className="wpp-agents-pane">
            <WorkspaceAgentPanel
              projectId={project.id}
              branches={project.branches}
              agents={agents}
              isLoading={loadingAgents}
              onAgentsChange={updateAgents}
              onReload={loadAgents}
            />
          </div>
        )}

        {/* Aggiornamenti tab */}
        {activeTab === 'aggiornamenti' && (
          <div className="wpp-tab-pane">
            <h2 className="wpp-section-title">Aggiornamenti recenti</h2>
            {loadingAgents ? (
              <div className="wpp-loading-inline">
                <Loader2 size={16} className="wpp-spin" />
                <span>Caricamento...</span>
              </div>
            ) : agentUpdates.length > 0 ? (
              <div className="wpp-updates-list">
                {agentUpdates.map((agent) => (
                  <div key={agent.id} className="wpp-update-card">
                    <div className="wpp-update-header">
                      <span className="wpp-update-title">{agent.title}</span>
                      <span className={`wpp-update-status wpp-update-status--${agent.status}`}>
                        {agent.status}
                      </span>
                    </div>
                    {agent.review_message && (
                      <p className="wpp-update-body">{agent.review_message}</p>
                    )}
                    {agent.result && (
                      <pre className="wpp-update-result">
                        {agent.result.slice(0, 300)}{agent.result.length > 300 ? '…' : ''}
                      </pre>
                    )}
                    <div className="wpp-update-meta">
                      {new Date(agent.updated_at || agent.created_at).toLocaleString('it-IT')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wpp-empty">
                <Bell size={28} className="wpp-empty-icon" />
                <h3>Nessun aggiornamento</h3>
                <p>Gli aggiornamenti degli agenti appariranno qui.</p>
              </div>
            )}
          </div>
        )}

        {/* Code tab */}
        {activeTab === 'code' && (
          <div className="wpp-tab-pane">
            <div className="wpp-code-section">
              <h2 className="wpp-section-title">Repository &amp; Pubblicazione</h2>
              <p className="wpp-code-desc">
                Pubblica le modifiche da <code>staging</code> a <code>main</code> con un click.
              </p>

              <div className="wpp-code-actions">
                {project.github_url ? (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wpp-code-link-btn"
                  >
                    <Github size={13} />
                    Apri repository
                  </a>
                ) : (
                  <span className="wpp-code-missing">Nessun URL GitHub configurato</span>
                )}

                <button
                  className="wpp-publish-btn wpp-publish-btn--large"
                  onClick={handlePublish}
                  disabled={isPublishing || !project.github_url}
                >
                  {isPublishing ? <Loader2 size={13} className="wpp-spin" /> : <Upload size={13} />}
                  <span>{isPublishing ? 'Pubblicazione in corso...' : 'Pubblica su main'}</span>
                </button>
              </div>

              {project.workspace_settings?.staging_url && (
                <a
                  href={project.workspace_settings.staging_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wpp-code-staging-link"
                >
                  <ExternalLink size={12} />
                  Anteprima staging
                </a>
              )}
            </div>

            {project.branches.length > 0 && (
              <div className="wpp-branches-section">
                <button
                  className="wpp-branches-toggle"
                  onClick={() => setShowBranches(!showBranches)}
                >
                  <GitBranch size={12} />
                  <span>Branch workspace ({project.branches.length})</span>
                  <ChevronDown
                    size={12}
                    style={{ transform: showBranches ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                  />
                </button>
                {showBranches && (
                  <div className="wpp-branches-list">
                    {project.branches.map((branch) => (
                      <div key={branch.id} className="wpp-branch-item">
                        <span className="wpp-branch-name">{branch.name}</span>
                        {branch.git_branch && (
                          <code className="wpp-branch-git">{branch.git_branch}</code>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar (bottom) ── */}
      <div className="wpp-statusbar">
        <span className="wpp-statusbar-item">
          <span
            className={`wpp-statusbar-dot ${getStatusDotClass(project.status)}`}
          />
          {formatStatus(project.status)}
        </span>
        {project.progress > 0 && (
          <span className="wpp-statusbar-item">{project.progress}% completato</span>
        )}
        <span className="wpp-statusbar-item wpp-statusbar-sep" />
        <span className="wpp-statusbar-item">
          {project.branches_count} branch · {project.active_agents_count} agenti · {project.open_tasks_count} task
        </span>
      </div>

      {/* ── Floating panels ── */}
      {projectId && <FloatingTaskPanel projectId={projectId} />}

      {selectedTask && project && (
        <TaskDetailModal
          task={selectedTask}
          project={project}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {showAddTaskForm && project && (
        <AddTaskForm
          projectId={project.id}
          branches={project.branches}
          onClose={() => setShowAddTaskForm(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
};

export default WorkspaceProjectPage;
