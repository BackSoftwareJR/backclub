import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Crown,
  Loader2,
  AlertCircle,
  Github,
  ExternalLink,
  Search,
  LayoutGrid,
  LayoutList,
  GitBranch,
  CheckSquare,
} from 'lucide-react';
import { workspaceApi } from '../../api/workspace';
import type { WorkspaceProject } from '../../types/workspace';
import './WorkspaceProjectsPage.css';

const WorkspaceProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await workspaceApi.getWorkspaceProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to load workspace projects:', err);
        setError('Errore nel caricamento dei progetti');
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, []);

  const handleProjectClick = (project: WorkspaceProject) => {
    setSelectedId(project.id);
    navigate(`/workspace/developer/progetti/${project.id}`);
  };

  const getStatusDotClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'attivo':
        return 'status-dot--green';
      case 'pending':
      case 'in_attesa':
        return 'status-dot--yellow';
      case 'completed':
      case 'completato':
        return 'status-dot--blue';
      case 'paused':
      case 'sospeso':
        return 'status-dot--gray';
      default:
        return 'status-dot--gray';
    }
  };

  const formatStatus = (status: string): string => {
    const map: Record<string, string> = {
      active: 'Attivo', attivo: 'Attivo',
      pending: 'In attesa', in_attesa: 'In attesa',
      completed: 'Completato', completato: 'Completato',
      paused: 'Sospeso', sospeso: 'Sospeso',
    };
    return map[status.toLowerCase()] || status;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return d.toLocaleDateString('it-IT', { month: 'short', day: 'numeric' });
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="wsp-state-centered">
        <Loader2 className="wsp-loading-icon" size={22} />
        <span>Caricamento progetti...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wsp-state-centered wsp-state-error">
        <AlertCircle size={22} />
        <span>{error}</span>
        <button className="wsp-retry-btn" onClick={() => window.location.reload()}>
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="wsp-page">
      {/* ── Toolbar ── */}
      <div className="wsp-toolbar">
        <div className="wsp-toolbar-left">
          <h1 className="wsp-page-title">Progetti</h1>
          <span className="wsp-count-badge">{filtered.length}</span>
        </div>
        <div className="wsp-toolbar-right">
          <div className="wsp-search">
            <Search size={12} className="wsp-search-icon" />
            <input
              type="text"
              className="wsp-search-input"
              placeholder="Cerca progetto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="wsp-view-toggle">
            <button
              className={`wsp-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >
              <LayoutList size={14} />
            </button>
            <button
              className={`wsp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista griglia"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="wsp-empty">
          <span className="wsp-empty-icon">⌁</span>
          <h3 className="wsp-empty-title">
            {search ? 'Nessun progetto trovato' : 'Nessun progetto nel workspace Developer'}
          </h3>
          <p className="wsp-empty-desc">
            {search
              ? `Nessun progetto corrisponde a "${search}"`
              : 'Chiedi al tuo project manager di abilitare questo workspace per i tuoi progetti.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* ── LIST VIEW ── */
        <div className="wsp-list">
          {/* Table header */}
          <div className="wsp-list-header">
            <div className="wsp-col-status" />
            <div className="wsp-col-name">PROGETTO</div>
            <div className="wsp-col-status-text">STATO</div>
            <div className="wsp-col-stats">STATISTICHE</div>
            <div className="wsp-col-date">ULTIMO AGG.</div>
            <div className="wsp-col-actions" />
          </div>

          {/* Table rows */}
          <div className="wsp-list-body">
            {filtered.map((project) => (
              <div
                key={project.id}
                className={`wsp-list-row ${selectedId === project.id ? 'selected' : ''}`}
                onClick={() => handleProjectClick(project)}
                role="button"
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleProjectClick(project)}
              >
                {/* Status dot */}
                <div className="wsp-col-status">
                  <span className={`wsp-status-dot ${getStatusDotClass(project.status)}`} />
                </div>

                {/* Project name */}
                <div className="wsp-col-name">
                  <span className="wsp-project-name">{project.name}</span>
                  {project.is_project_manager && (
                    <span className="wsp-pm-badge" title="Sei il Project Manager">
                      <Crown size={9} />
                      PM
                    </span>
                  )}
                </div>

                {/* Status text */}
                <div className="wsp-col-status-text">
                  <span className={`wsp-status-label wsp-status-label--${project.status.toLowerCase()}`}>
                    {formatStatus(project.status)}
                  </span>
                </div>

                {/* Stats */}
                <div className="wsp-col-stats">
                  <span className="wsp-stat">
                    <GitBranch size={10} />
                    {project.branches_count}
                  </span>
                  <span className="wsp-stat">
                    <Bot size={10} />
                    {project.active_agents_count}
                  </span>
                  <span className="wsp-stat">
                    <CheckSquare size={10} />
                    {project.open_tasks_count}
                  </span>
                  {project.progress > 0 && (
                    <div className="wsp-progress-mini">
                      <div
                        className="wsp-progress-mini-fill"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="wsp-col-date">
                  <span className="wsp-date">{formatDate(project.updated_at)}</span>
                </div>

                {/* External links */}
                <div className="wsp-col-actions" onClick={e => e.stopPropagation()}>
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wsp-icon-link"
                      title="GitHub"
                    >
                      <Github size={12} />
                    </a>
                  )}
                  {project.workspace_settings?.staging_url && (
                    <a
                      href={project.workspace_settings.staging_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wsp-icon-link"
                      title="Staging"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <div className="wsp-grid">
          {filtered.map((project) => (
            <div
              key={project.id}
              className={`wsp-card ${selectedId === project.id ? 'selected' : ''}`}
              onClick={() => handleProjectClick(project)}
              role="button"
              tabIndex={0}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleProjectClick(project)}
            >
              {project.cover_photo && (
                <div
                  className="wsp-card-cover"
                  style={{ backgroundImage: `url(${project.cover_photo})` }}
                />
              )}
              <div className="wsp-card-body">
                <div className="wsp-card-header">
                  <span className={`wsp-status-dot ${getStatusDotClass(project.status)}`} />
                  <span className="wsp-project-name">{project.name}</span>
                  {project.is_project_manager && (
                    <span className="wsp-pm-badge">
                      <Crown size={9} /> PM
                    </span>
                  )}
                </div>
                <div className="wsp-card-stats">
                  <span className="wsp-stat"><GitBranch size={10} /> {project.branches_count} branch</span>
                  <span className="wsp-stat"><Bot size={10} /> {project.active_agents_count} agenti</span>
                  <span className="wsp-stat"><CheckSquare size={10} /> {project.open_tasks_count} task</span>
                </div>
                {project.progress > 0 && (
                  <div className="wsp-progress">
                    <div className="wsp-progress-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                )}
                <div className="wsp-card-footer">
                  <span className="wsp-date">{formatDate(project.updated_at)}</span>
                  <div className="wsp-card-links" onClick={e => e.stopPropagation()}>
                    {project.github_url && (
                      <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="wsp-icon-link">
                        <Github size={12} />
                      </a>
                    )}
                    {project.workspace_settings?.staging_url && (
                      <a href={project.workspace_settings.staging_url} target="_blank" rel="noopener noreferrer" className="wsp-icon-link">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceProjectsPage;
