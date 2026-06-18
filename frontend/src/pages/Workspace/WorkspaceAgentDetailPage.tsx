import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  CheckCircle,
  MessageSquare,
  Edit3,
  Save,
  Copy,
  Loader2,
  Clock,
  Calendar,
  Hash,
  GitBranch,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { workspaceAgentsApi } from '../../api/workspaceAgents';
import { workspaceApi } from '../../api/workspace';
import type { WorkspaceAgent, WorkspaceAgentStatus, WorkspaceBranch } from '../../types/workspace';
import WorkspaceAgentActivityPanel from './components/WorkspaceAgentActivityPanel';
import './WorkspaceAgentDetailPage.css';

const STATUS_CONFIG: Record<WorkspaceAgentStatus, { color: string; label: string; pulse: boolean }> = {
  pending: { color: '#8E8E93', label: 'In attesa', pulse: false },
  running: { color: '#0A84FF', label: 'In esecuzione', pulse: true },
  review: { color: '#FF9F0A', label: 'In revisione', pulse: false },
  completed: { color: '#34C759', label: 'Completato', pulse: false },
  failed: { color: '#FF3B30', label: 'Fallito', pulse: false },
  stopped: { color: '#8E8E93', label: 'Fermato', pulse: false },
};

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'N/D';
  return new Date(timestamp).toLocaleString('it-IT');
}

function formatDuration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  }
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatResult(result: string | null): string {
  if (!result) return '';
  try {
    if (result.trim().startsWith('{') || result.trim().startsWith('[')) {
      return JSON.stringify(JSON.parse(result), null, 2);
    }
  } catch {
    // fall through
  }
  return result;
}

const WorkspaceAgentDetailPage: React.FC = () => {
  const { projectId: projectIdParam, agentId: agentIdParam } = useParams<{
    projectId: string;
    agentId: string;
  }>();

  const navigate = useNavigate();
  const projectId = projectIdParam ? parseInt(projectIdParam, 10) : null;
  const agentId = agentIdParam ? parseInt(agentIdParam, 10) : null;

  const [agent, setAgent] = useState<WorkspaceAgent | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [branches, setBranches] = useState<WorkspaceBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [editData, setEditData] = useState({ title: '', prompt: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const prevStatusRef = useRef<WorkspaceAgentStatus | null>(null);

  const loadAgent = useCallback(async (silent = false) => {
    if (!projectId || !agentId) return;

    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const data = await workspaceAgentsApi.getAgent(projectId, agentId);
      setAgent(data);
      setEditData({ title: data.title, prompt: data.prompt });
      setReviewMessage(data.review_message || '');
    } catch (err) {
      console.error('Failed to load agent:', err);
      if (!silent) setError('Errore nel caricamento della lavorazione');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [projectId, agentId]);

  useEffect(() => {
    if (!projectId) return;

    workspaceApi.getWorkspaceProject(projectId).then((project) => {
      setProjectName(project.name);
      setBranches(project.branches || []);
    }).catch((err) => console.error('Failed to load project:', err));
  }, [projectId]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  useEffect(() => {
    if (!agent) return;
    const isActive = agent.status === 'running' || agent.status === 'review' || agent.status === 'pending';
    if (!isActive) return;

    const interval = setInterval(() => loadAgent(true), 4000);
    return () => clearInterval(interval);
  }, [agent?.status, loadAgent]);

  useEffect(() => {
    if (!agent) return;
    const prev = prevStatusRef.current;
    if (prev && prev !== agent.status) {
      if (agent.status === 'completed') {
        setStatusToast('Lavorazione completata!');
      } else if (agent.status === 'failed') {
        setStatusToast('Lavorazione fallita.');
      } else if (agent.status === 'stopped') {
        setStatusToast('Lavorazione fermata.');
      }
    }
    prevStatusRef.current = agent.status;
  }, [agent?.status]);

  useEffect(() => {
    if (!statusToast) return;
    const timer = setTimeout(() => setStatusToast(null), 5000);
    return () => clearTimeout(timer);
  }, [statusToast]);

  const handleAction = async (
    action: 'start' | 'stop' | 'restart' | 'complete' | 'request_review',
    options?: { review_message?: string }
  ) => {
    if (!projectId || !agentId) return;

    setActionLoading(action);
    setActionError(null);

    try {
      const updated = await workspaceAgentsApi.agentAction(projectId, agentId, action, options);
      setAgent(updated);
      if (action === 'request_review') {
        setShowReviewForm(false);
        setReviewMessage('');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `Errore durante l'azione "${action}"`;
      setActionError(message);
      console.error(`Failed to ${action} agent:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async () => {
    if (!projectId || !agentId) return;

    try {
      setIsSaving(true);
      const updated = await workspaceAgentsApi.updateAgent(projectId, agentId, editData);
      setAgent(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update agent:', err);
      setActionError('Errore nel salvare le modifiche');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClone = () => {
    if (!agent || !projectId) return;
    navigate(`/workspace/developer/progetti/${projectId}?tab=lavorazioni`);
  };

  if (isLoading) {
    return (
      <div className="ws-agent-detail-page">
        <div className="ws-agent-detail-loading">
          <Loader2 size={28} className="ws-spin" />
          <span>Caricamento lavorazione...</span>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="ws-agent-detail-page">
        <div className="ws-agent-detail-error">
          <AlertCircle size={28} />
          <span>{error || 'Lavorazione non trovata'}</span>
          <Link to={`/workspace/developer/progetti/${projectId}?tab=lavorazioni`} className="ws-agent-detail-back-btn">
            <ArrowLeft size={14} />
            Torna alle lavorazioni
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[agent.status];
  const elapsed = formatDuration(agent.started_at, agent.completed_at);
  const isTerminal = ['completed', 'failed', 'stopped'].includes(agent.status);
  const isNextInQueue = agent.status !== 'pending' || (agent.queue_position ?? 1) === 1;
  const canStart = agent.status === 'pending' && isNextInQueue;
  const isQueuedWaiting = agent.status === 'pending' && !isNextInQueue;
  const canStop = agent.status === 'running' || agent.status === 'review';
  const canRestart = ['failed', 'stopped', 'completed'].includes(agent.status);
  const canComplete = agent.status === 'review';
  const canRequestReview = ['review', 'completed', 'failed', 'stopped'].includes(agent.status);
  const canEdit = agent.status === 'pending' || agent.status === 'stopped';
  const backUrl = `/workspace/developer/progetti/${projectId}?tab=lavorazioni`;

  return (
    <div className="ws-agent-detail-page">
      {statusToast && (
        <div className={`ws-agent-detail-toast ws-agent-detail-toast--${agent.status}`}>
          <CheckCircle size={16} />
          <span>{statusToast}</span>
        </div>
      )}

      <Link to={backUrl} className="ws-agent-detail-back">
        <ArrowLeft size={14} />
        <span>{projectName ? `${projectName} · Lavorazioni` : 'Torna alle lavorazioni'}</span>
      </Link>

      <header className="ws-agent-detail-header">
        <div className="ws-agent-detail-header-main">
          {isEditing ? (
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
              className="ws-agent-detail-title-input"
            />
          ) : (
            <h1 className="ws-agent-detail-title">{agent.title}</h1>
          )}

          <div className="ws-agent-detail-meta">
            <span
              className={`ws-agent-detail-status ${statusConfig.pulse ? 'pulse' : ''}`}
              style={{ backgroundColor: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
            {agent.branch && (
              <span className="ws-agent-detail-branch">
                <GitBranch size={12} />
                {agent.branch.name}
              </span>
            )}
          </div>

          <div className="ws-agent-detail-dates">
            <span><Calendar size={12} /> Creato {formatTimestamp(agent.created_at)}</span>
            {agent.started_at && <span><Clock size={12} /> Avviato {formatTimestamp(agent.started_at)}</span>}
            {agent.completed_at && <span><CheckCircle size={12} /> Completato {formatTimestamp(agent.completed_at)}</span>}
            {elapsed && (
              <span className="ws-agent-detail-duration">
                <Clock size={12} />
                {isTerminal ? `Durata ${elapsed}` : `In esecuzione da ${elapsed}`}
              </span>
            )}
            {agent.queue_position != null && agent.status === 'pending' && (
              <span className="ws-agent-detail-queue">
                <Hash size={12} /> Posizione coda: {agent.queue_position}
              </span>
            )}
            {agent.n8n_execution_id && (
              <span className="ws-agent-detail-exec-id">
                <Hash size={12} /> {agent.n8n_execution_id}
              </span>
            )}
          </div>
        </div>
      </header>

      {actionError && (
        <div className="ws-agent-detail-action-error">
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <section className="ws-agent-detail-actions">
        {isEditing ? (
          <>
            <button
              className="ws-agent-detail-btn secondary"
              onClick={() => {
                setIsEditing(false);
                setEditData({ title: agent.title, prompt: agent.prompt });
              }}
              disabled={isSaving}
            >
              Annulla
            </button>
            <button className="ws-agent-detail-btn primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="ws-spin" /> : <Save size={16} />}
              Salva
            </button>
          </>
        ) : (
          <>
            {canEdit && (
              <button className="ws-agent-detail-btn secondary" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} />
                Modifica
              </button>
            )}
            {canStart && (
              <button
                className="ws-agent-detail-btn primary"
                onClick={() => handleAction('start')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'start' ? <Loader2 size={16} className="ws-spin" /> : <Play size={16} />}
                Avvia
              </button>
            )}
            {isQueuedWaiting && (
              <span className="ws-agent-detail-queue-wait">In attesa in coda (pos. {agent.queue_position})</span>
            )}
            {canStop && (
              <button
                className="ws-agent-detail-btn danger"
                onClick={() => handleAction('stop')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'stop' ? <Loader2 size={16} className="ws-spin" /> : <Square size={16} />}
                Stop
              </button>
            )}
            {canRestart && (
              <button
                className="ws-agent-detail-btn primary"
                onClick={() => handleAction('restart')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'restart' ? <Loader2 size={16} className="ws-spin" /> : <RotateCcw size={16} />}
                Riavvia
              </button>
            )}
            {canComplete && (
              <button
                className="ws-agent-detail-btn success"
                onClick={() => handleAction('complete')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'complete' ? <Loader2 size={16} className="ws-spin" /> : <CheckCircle size={16} />}
                Approva
              </button>
            )}
            {canRequestReview && (
              <button
                className="ws-agent-detail-btn warning"
                onClick={() => setShowReviewForm(!showReviewForm)}
                disabled={!!actionLoading}
              >
                <MessageSquare size={16} />
                Richiedi review
              </button>
            )}
            {(agent.status === 'completed' || agent.status === 'failed') && (
              <button className="ws-agent-detail-btn secondary" onClick={handleClone}>
                <Copy size={16} />
                Clona
              </button>
            )}
          </>
        )}
      </section>

      {showReviewForm && (
        <section className="ws-agent-detail-review-form">
          <label>Messaggio di review</label>
          <textarea
            value={reviewMessage}
            onChange={(e) => setReviewMessage(e.target.value)}
            placeholder="Descrivi cosa dovrebbe essere rivisto o migliorato..."
            rows={3}
          />
          <div className="ws-agent-detail-review-actions">
            <button
              className="ws-agent-detail-btn secondary"
              onClick={() => {
                setShowReviewForm(false);
                setReviewMessage(agent.review_message || '');
              }}
              disabled={!!actionLoading}
            >
              Annulla
            </button>
            <button
              className="ws-agent-detail-btn warning"
              onClick={() =>
                handleAction('request_review', {
                  review_message: reviewMessage.trim() || undefined,
                })
              }
              disabled={!!actionLoading}
            >
              {actionLoading === 'request_review' ? (
                <Loader2 size={16} className="ws-spin" />
              ) : (
                <MessageSquare size={16} />
              )}
              Invia e riavvia
            </button>
          </div>
        </section>
      )}

      <div className="ws-agent-detail-grid">
        <div className="ws-agent-detail-main">
          <WorkspaceAgentActivityPanel agent={agent} />

          {agent.result && (
            <section className="ws-agent-detail-card">
              <h2>Risultato</h2>
              <div className="ws-agent-detail-code">
                <pre>{formatResult(agent.result)}</pre>
              </div>
            </section>
          )}
        </div>

        <aside className="ws-agent-detail-sidebar">
          <section className="ws-agent-detail-card">
            <div className="ws-agent-detail-card-header">
              <h2>Istruzioni</h2>
              {agent.exact_prompt && (
                <span className="ws-agent-detail-exact-badge">
                  <Sparkles size={12} />
                  Prompt esatto
                </span>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={editData.prompt}
                onChange={(e) => setEditData((prev) => ({ ...prev, prompt: e.target.value }))}
                className="ws-agent-detail-textarea"
                rows={8}
              />
            ) : (
              <div className="ws-agent-detail-prompt">{agent.prompt}</div>
            )}
          </section>

          {(agent.review_message || agent.status === 'review') && (
            <section className="ws-agent-detail-card ws-agent-detail-card--review">
              <h2>Review</h2>
              {agent.review_message ? (
                <div className="ws-agent-detail-review-message">{agent.review_message}</div>
              ) : (
                <p className="ws-agent-detail-review-empty">In attesa del tuo feedback.</p>
              )}
            </section>
          )}

          {branches.length > 0 && (
            <section className="ws-agent-detail-card">
              <h2>Branch</h2>
              <p className="ws-agent-detail-branch-info">
                {agent.branch?.name || 'Nessun branch assegnato'}
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default WorkspaceAgentDetailPage;
