import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import { freelanceCrmApi } from '../../api/freelanceCrm';
import { freelanceCache } from '../../utils/freelanceCache';
import type { FreelanceProject } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceProgettiTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceProjectsPage.css';

const FreelanceProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<FreelanceProject[]>([]);

  const basePath = isCrmScoped && crmDepartmentCode
    ? `/freelance/crm/${encodeURIComponent(crmDepartmentCode)}`
    : '/freelance';

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const crmCode: string | undefined = isCrmScoped ? (crmDepartmentCode ?? undefined) : undefined;
      const cached = freelanceCache.projects.get<FreelanceProject[]>(user.id, crmCode);
      if (cached && cached.length >= 0) {
        setProjects(cached);
        setLoading(false);
      }

      try {
        const list = isCrmScoped && crmDepartmentCode
          ? await freelanceCrmApi.getProjects(crmDepartmentCode)
          : await freelanceApi.getFreelancerProjects();
        setProjects(list);
        freelanceCache.projects.set(user.id, crmCode, list);
      } catch (error) {
        console.error('Error loading projects:', error);
        if (!cached) setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user?.id, isCrmScoped, crmDepartmentCode]);

  const handleProjectClick = (project: FreelanceProject) => {
    if (project.is_project_manager) {
      navigate(`${basePath}/progetti/${project.id}/gestione`);
    } else {
      navigate(`${basePath}/progetti/${project.id}`);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /** Rimuove il prefisso "Contratto - Preventivo" dal nome progetto (solo per la visualizzazione). */
  const getDisplayName = (name: string | null | undefined): string => {
    if (!name?.trim()) return '';
    return name.replace(/^Contratto\s*-\s*[Pp]reventivo\s*/i, '').trim() || name;
  };

  if (loading) {
    return (
      <div className="freelance-loading">
        <div className="freelance-spinner"></div>
      </div>
    );
  }

  return (
    <div className="freelance-projects">
      <GuideTour steps={freelanceProgettiTourSteps} tourId="freelance-progetti-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      <div className="freelance-projects-header">
        <div>
          <h1 className="freelance-projects-title">Progetti</h1>
          <p className="freelance-projects-subtitle">
            {projects.length} {projects.length === 1 ? 'progetto attivo' : 'progetti attivi'}
          </p>
        </div>
      </div>

      {projects.length > 0 ? (
        <div className="freelance-projects-grid">
          {projects.map((project) => (
            <button
              type="button"
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="freelance-project-card-btn"
            >
              {/* Copertina o area icona (link restituito dall’API) */}
              <div className="freelance-project-card-cover">
                {project.cover_photo_url ? (
                  <img
                    src={project.cover_photo_url}
                    alt=""
                    className="freelance-project-card-cover-img"
                  />
                ) : (
                  <div className="freelance-project-card-cover-placeholder">
                    {project.crmDepartment?.icon ? (
                      <span className="freelance-project-card-cover-icon-emoji">{project.crmDepartment.icon}</span>
                    ) : (
                      <FolderKanban size={32} strokeWidth={1.5} />
                    )}
                  </div>
                )}
                {project.is_project_manager && (
                  <span className="freelance-project-card-pm-badge-cover">PM</span>
                )}
              </div>

              {/* Contenuto */}
              <div className="freelance-project-card-body">
                <div className="freelance-project-card-title-row">
                  <h3 className="freelance-project-card-title">{getDisplayName(project.name)}</h3>
                </div>

                {project.end_date && (
                  <div className="freelance-project-card-deadline">
                    <Calendar size={14} className="shrink-0 opacity-70" />
                    <span>Consegna: {formatDate(project.end_date)}</span>
                  </div>
                )}

                {project.progress !== undefined && (
                  <div className="freelance-project-card-progress-row">
                    <div className="freelance-project-card-progress-track">
                      <div
                        className="freelance-project-card-progress-fill"
                        style={{ width: `${Math.min(100, project.progress)}%` }}
                      />
                    </div>
                    <span className="freelance-project-card-progress-pct">{project.progress}%</span>
                  </div>
                )}

                <div className="freelance-project-card-footer">
                  <span className="freelance-project-card-tasks-count">
                    {project.is_project_manager
                      ? `${project.totalTasksCount ?? 0} ${(project.totalTasksCount ?? 0) === 1 ? 'task' : 'task'}`
                      : `${project.myTasksCount ?? 0} ${(project.myTasksCount ?? 0) === 1 ? 'task' : 'task'}`
                    }
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="freelance-empty-state">
          <FolderKanban size={48} />
          <p>Nessun progetto assegnato</p>
        </div>
      )}
    </div>
  );
};

export default FreelanceProjectsPage;
