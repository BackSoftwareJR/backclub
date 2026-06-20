import React, { useState, useEffect } from 'react';
import { Copy, Check, FileText, CheckSquare, BookOpen, Clock, AlertCircle } from 'lucide-react';
import type { Artifact, BrandBook, WorkspaceUserTask } from '../../../types/workspace';
import { workspaceAgentsApi } from '../../../api/workspaceAgents';
import { workspaceTasksApi } from '../../../api/workspaceTasks';
import './ArtifactViewer.css';

interface ArtifactViewerProps {
  projectId: number;
  brandBook?: BrandBook | null;
}

type Tab = 'artifacts' | 'tasks' | 'brand_book';

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'Da fare',
  in_progress: 'In corso',
  review: 'In revisione',
  completed: 'Completato',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'var(--ws-text-tertiary)',
  in_progress: 'var(--ws-accent)',
  review: 'var(--ws-orange)',
  completed: 'var(--ws-green)',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--ws-text-tertiary)',
  medium: 'var(--ws-accent)',
  high: 'var(--ws-orange)',
  urgent: 'var(--ws-danger)',
};

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ projectId, brandBook }) => {
  const [activeTab, setActiveTab] = useState<Tab>('artifacts');
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [tasks, setTasks] = useState<WorkspaceUserTask[]>([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'artifacts') loadArtifacts();
    if (activeTab === 'tasks') loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, projectId]);

  const loadArtifacts = async () => {
    try {
      setIsLoadingArtifacts(true);
      const data = await workspaceAgentsApi.getArtifacts(projectId);
      setArtifacts(data);
    } catch {
      setArtifacts([]);
    } finally {
      setIsLoadingArtifacts(false);
    }
  };

  const loadTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const data = await workspaceTasksApi.getWorkspaceTasks(projectId);
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const getArtifactIcon = (type: Artifact['type']): string => {
    const icons = { markdown: '📄', task: '✅', prompt: '✨', brand_book: '🎨' };
    return icons[type] ?? '📄';
  };

  const defaultBrandBook: BrandBook = brandBook ?? {
    primary_color: '#007AFF',
    secondary_color: '#34C759',
    tone_of_voice: 'Empatico, rassicurante e professionale',
    keywords: ['ospite', 'cura', 'famiglia', 'benessere', 'dignità', 'calore'],
    avoid_words: ['paziente', 'ricoverato', 'degente', 'malato', 'istituto'],
  };

  return (
    <div className="artifact-viewer">
      {/* ── Tab Bar ── */}
      <div className="artifact-viewer__tabs">
        <button
          className={`artifact-viewer__tab ${activeTab === 'artifacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('artifacts')}
        >
          <FileText size={13} />
          <span>Artefatti</span>
          {artifacts.length > 0 && (
            <span className="artifact-viewer__tab-count">{artifacts.length}</span>
          )}
        </button>
        <button
          className={`artifact-viewer__tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={13} />
          <span>Task</span>
          {tasks.filter(t => t.status !== 'completed').length > 0 && (
            <span className="artifact-viewer__tab-count">
              {tasks.filter(t => t.status !== 'completed').length}
            </span>
          )}
        </button>
        <button
          className={`artifact-viewer__tab ${activeTab === 'brand_book' ? 'active' : ''}`}
          onClick={() => setActiveTab('brand_book')}
        >
          <BookOpen size={13} />
          <span>Brand Book</span>
        </button>
      </div>

      {/* ── Content ── */}
      <div className="artifact-viewer__content">

        {/* ARTIFACTS TAB */}
        {activeTab === 'artifacts' && (
          <div className="artifact-viewer__pane">
            {isLoadingArtifacts ? (
              <div className="artifact-viewer__loading">
                <div className="artifact-viewer__skeleton" />
                <div className="artifact-viewer__skeleton artifact-viewer__skeleton--short" />
                <div className="artifact-viewer__skeleton" />
              </div>
            ) : artifacts.length === 0 ? (
              <div className="artifact-viewer__empty">
                <FileText size={32} className="artifact-viewer__empty-icon" />
                <h3>Nessun artefatto</h3>
                <p>Gli artefatti generati dall'orchestratore appariranno qui: documenti, brief, pagine web.</p>
              </div>
            ) : (
              <div className="artifact-viewer__artifact-list">
                {artifacts.map(artifact => (
                  <div key={artifact.id} className="artifact-viewer__artifact-card">
                    <div
                      className="artifact-viewer__artifact-header"
                      onClick={() => setExpandedArtifact(expandedArtifact === artifact.id ? null : artifact.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setExpandedArtifact(expandedArtifact === artifact.id ? null : artifact.id)}
                    >
                      <div className="artifact-viewer__artifact-meta">
                        <span className="artifact-viewer__artifact-icon">{getArtifactIcon(artifact.type)}</span>
                        <div>
                          <span className="artifact-viewer__artifact-title">{artifact.title}</span>
                          <span className="artifact-viewer__artifact-date">
                            <Clock size={10} />
                            {formatDate(artifact.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="artifact-viewer__artifact-actions" onClick={e => e.stopPropagation()}>
                        {artifact.type === 'prompt' && (
                          <button
                            className="artifact-viewer__copy-prompt-btn"
                            onClick={() => copyToClipboard(artifact.content, artifact.id)}
                          >
                            {copiedId === artifact.id ? <Check size={12} /> : <Copy size={12} />}
                            {copiedId === artifact.id ? 'Copiato!' : 'Copia Prompt'}
                          </button>
                        )}
                        <span
                          className={`artifact-viewer__type-badge artifact-viewer__type-badge--${artifact.type}`}
                        >
                          {artifact.type}
                        </span>
                      </div>
                    </div>

                    {expandedArtifact === artifact.id && (
                      <div className="artifact-viewer__artifact-body">
                        <div className="artifact-viewer__markdown-preview">
                          {artifact.content.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) return <h1 key={i}>{line.slice(2)}</h1>;
                            if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
                            if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
                            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i}>{line.slice(2)}</li>;
                            if (line.startsWith('**') && line.endsWith('**')) return <strong key={i}>{line.slice(2, -2)}</strong>;
                            if (line === '') return <br key={i} />;
                            return <p key={i}>{line}</p>;
                          })}
                        </div>
                        <div className="artifact-viewer__artifact-footer">
                          <button
                            className="artifact-viewer__copy-raw-btn"
                            onClick={() => copyToClipboard(artifact.content, `raw-${artifact.id}`)}
                          >
                            {copiedId === `raw-${artifact.id}` ? <Check size={11} /> : <Copy size={11} />}
                            Copia testo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="artifact-viewer__pane">
            {isLoadingTasks ? (
              <div className="artifact-viewer__loading">
                <div className="artifact-viewer__skeleton" />
                <div className="artifact-viewer__skeleton artifact-viewer__skeleton--short" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="artifact-viewer__empty">
                <CheckSquare size={32} className="artifact-viewer__empty-icon" />
                <h3>Nessuna task</h3>
                <p>I task assegnati al team e agli agenti appariranno qui.</p>
              </div>
            ) : (
              <div className="artifact-viewer__tasks-list">
                {(['in_progress', 'review', 'todo', 'completed'] as const).map(status => {
                  const statusTasks = tasks.filter(t => t.status === status);
                  if (statusTasks.length === 0) return null;
                  return (
                    <div key={status} className="artifact-viewer__tasks-group">
                      <div className="artifact-viewer__tasks-group-header">
                        <span
                          className="artifact-viewer__tasks-group-dot"
                          style={{ backgroundColor: TASK_STATUS_COLORS[status] }}
                        />
                        <span className="artifact-viewer__tasks-group-label">
                          {TASK_STATUS_LABELS[status]}
                        </span>
                        <span className="artifact-viewer__tasks-group-count">{statusTasks.length}</span>
                      </div>
                      {statusTasks.map(task => (
                        <div
                          key={task.id}
                          className={`artifact-viewer__task-card ${task.status === 'completed' ? 'completed' : ''}`}
                        >
                          <div className="artifact-viewer__task-header">
                            <span
                              className="artifact-viewer__task-priority-dot"
                              style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                              title={task.priority}
                            />
                            <span className="artifact-viewer__task-title">{task.title}</span>
                          </div>
                          {task.description && (
                            <p className="artifact-viewer__task-desc">
                              {task.description.length > 80
                                ? `${task.description.slice(0, 80)}…`
                                : task.description}
                            </p>
                          )}
                          <div className="artifact-viewer__task-meta">
                            {task.due_date && (
                              <span className="artifact-viewer__task-due">
                                <AlertCircle size={10} />
                                {new Date(task.due_date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            <span
                              className="artifact-viewer__task-status-chip"
                              style={{ color: TASK_STATUS_COLORS[task.status] }}
                            >
                              {TASK_STATUS_LABELS[task.status]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BRAND BOOK TAB */}
        {activeTab === 'brand_book' && (
          <div className="artifact-viewer__pane">
            <div className="artifact-viewer__brand-book">
              {/* Colors */}
              <section className="artifact-viewer__bb-section">
                <h3 className="artifact-viewer__bb-section-title">Palette Colori</h3>
                <div className="artifact-viewer__bb-colors">
                  <div className="artifact-viewer__bb-color-item">
                    <div
                      className="artifact-viewer__bb-color-swatch"
                      style={{ backgroundColor: defaultBrandBook.primary_color }}
                    />
                    <div>
                      <span className="artifact-viewer__bb-color-label">Primario</span>
                      <code className="artifact-viewer__bb-color-code">{defaultBrandBook.primary_color}</code>
                    </div>
                  </div>
                  <div className="artifact-viewer__bb-color-item">
                    <div
                      className="artifact-viewer__bb-color-swatch"
                      style={{ backgroundColor: defaultBrandBook.secondary_color }}
                    />
                    <div>
                      <span className="artifact-viewer__bb-color-label">Secondario</span>
                      <code className="artifact-viewer__bb-color-code">{defaultBrandBook.secondary_color}</code>
                    </div>
                  </div>
                </div>
              </section>

              {/* Tone of Voice */}
              <section className="artifact-viewer__bb-section">
                <h3 className="artifact-viewer__bb-section-title">Tono di Voce</h3>
                <p className="artifact-viewer__bb-tone">{defaultBrandBook.tone_of_voice}</p>
              </section>

              {/* Keywords */}
              <section className="artifact-viewer__bb-section">
                <h3 className="artifact-viewer__bb-section-title">Parole Chiave</h3>
                <div className="artifact-viewer__bb-tags">
                  {defaultBrandBook.keywords.map(kw => (
                    <span key={kw} className="artifact-viewer__bb-tag artifact-viewer__bb-tag--allow">
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </section>

              {/* Avoid Words */}
              <section className="artifact-viewer__bb-section">
                <h3 className="artifact-viewer__bb-section-title">Parole da Evitare</h3>
                <div className="artifact-viewer__bb-tags">
                  {defaultBrandBook.avoid_words.map(w => (
                    <span key={w} className="artifact-viewer__bb-tag artifact-viewer__bb-tag--deny">
                      ✗ {w}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactViewer;
