import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  FolderKanban, 
  CheckCircle2, 
  Circle,
  Building2,
  FileText,
  Download,
  Link as LinkIcon,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import type { FreelanceProject, FreelanceTask } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceProgettoDetailTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceProjectDetailPage.css';

const FreelanceProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const basePath = isCrmScoped && crmDepartmentCode ? `/freelance/crm/${encodeURIComponent(crmDepartmentCode)}` : '/freelance';
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<FreelanceProject | null>(null);
  const [projectTasks, setProjectTasks] = useState<FreelanceTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoadingTasks(true);
        const [projects, allTasks] = await Promise.all([
          freelanceApi.getFreelancerProjects(),
          freelanceApi.getFreelancerTasks(),
        ]);
        const foundProject = projects.find(p => p.id === parseInt(id));

        if (!foundProject) {
          navigate(`${basePath}/progetti`);
          return;
        }

        setProject(foundProject);
        const projectTasksList = allTasks.filter(t => t.crm_project_id === foundProject.id);
        setProjectTasks(projectTasksList);
      } catch (error) {
        console.error('Error loading project:', error);
        navigate(`${basePath}/progetti`);
      } finally {
        setLoading(false);
        setLoadingTasks(false);
      }
    };

    fetchProject();
  }, [id, user?.id, navigate]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: Record<string, FreelanceTask[]> = {
      'Da Fare': [],
      'In Lavorazione': [],
      'In Revisione': [],
      'Completati': [],
    };

    projectTasks.forEach((task) => {
      if (task.status === 'pending') {
        groups['Da Fare'].push(task);
      } else if (task.status === 'in_progress') {
        groups['In Lavorazione'].push(task);
      } else if (task.status === 'review') {
        groups['In Revisione'].push(task);
      } else if (task.status === 'completed') {
        groups['Completati'].push(task);
      }
    });

    return groups;
  }, [projectTasks]);

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      low: '#8E8E93',
      medium: '#0A84FF',
      high: '#FF9F0A',
      urgent: '#FF3B30',
    };
    return colorMap[priority] || '#8E8E93';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const formatDateFull = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const truncateDescription = (text: string | null, maxLength: number = 120) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getProjectFiles = () => {
    const files: Array<{ name: string; url: string; type: 'link' | 'document' }> = [];
    
    if (project?.settings) {
      if (project.settings.link_cartella_documenti) {
        files.push({
          name: 'Cartella Documenti',
          url: project.settings.link_cartella_documenti,
          type: 'link',
        });
      }
      if (project.settings.link_foto_video) {
        files.push({
          name: 'Foto e Video',
          url: project.settings.link_foto_video,
          type: 'link',
        });
      }
      if (project.settings.link_cartella_social) {
        files.push({
          name: 'Materiali Social',
          url: project.settings.link_cartella_social,
          type: 'link',
        });
      }
    }

    // Add contract documents if available
    if (project?.contracts) {
      project.contracts.forEach((contract) => {
        if (contract.signedDocuments) {
          contract.signedDocuments.forEach((doc) => {
            files.push({
              name: doc.document_name,
              url: doc.external_url || (doc.file_path ? `/backend/storage/${doc.file_path}` : ''),
              type: 'document',
            });
          });
        }
      });
    }

    return files;
  };

  // Circular Progress Component
  const CircularProgress: React.FC<{ progress: number; size?: number }> = ({ progress, size = 64 }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="circular-progress-container" style={{ width: size, height: size }}>
        <svg className="circular-progress-svg" width={size} height={size}>
          <circle
            className="circular-progress-bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="6"
          />
          <circle
            className="circular-progress-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="circular-progress-text">
          {Math.round(progress)}%
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="freelance-loading">
        <div className="freelance-spinner"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const projectFiles = getProjectFiles();
  const progress = project.progress ?? 0;

  return (
    <div className="project-hub">
      <GuideTour steps={freelanceProgettoDetailTourSteps} tourId="freelance-progetto-detail-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      {/* Back Button */}
      <button
        className="project-hub-back"
        onClick={() => navigate('/freelance/progetti')}
      >
        <ArrowLeft size={20} />
        <span>Indietro</span>
      </button>

      {/* Project Header */}
      <div className="project-hub-header">
        <div className="project-hub-header-content">
          <div 
            className="project-hub-icon"
            style={{
              backgroundColor: project.crmDepartment?.color ? `${project.crmDepartment.color}20` : undefined,
            }}
          >
            {project.crmDepartment?.icon ? (
              <span style={{ fontSize: '32px' }}>{project.crmDepartment.icon}</span>
            ) : (
              <FolderKanban size={32} />
            )}
          </div>
          <div className="project-hub-header-text">
            <div className="project-hub-title-row">
              <h1 className="project-hub-title">{project.name}</h1>
              {progress !== undefined && (
                <CircularProgress progress={progress} size={56} />
              )}
            </div>
            {project.description && (
              <div className="project-hub-description">
                <p className={descriptionExpanded ? 'expanded' : ''}>
                  {descriptionExpanded ? project.description : truncateDescription(project.description)}
                </p>
                {project.description.length > 120 && (
                  <button
                    className="project-hub-read-more"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  >
                    {descriptionExpanded ? (
                      <>
                        <span>Leggi meno</span>
                        <ChevronUp size={16} />
                      </>
                    ) : (
                      <>
                        <span>Leggi di più</span>
                        <ChevronDown size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="project-hub-grid">
        {/* Left Column - Tasks */}
        <div className="project-hub-main">
          <div className="project-hub-section">
            <h2 className="project-hub-section-title">I Miei Task</h2>
            
            {loadingTasks ? (
              <div className="freelance-loading">
                <div className="freelance-spinner"></div>
              </div>
            ) : projectTasks.length > 0 ? (
              <div className="task-manager">
                {/* Da Fare */}
                {groupedTasks['Da Fare'].length > 0 && (
                  <div className="task-group">
                    <h3 className="task-group-title">Da Fare</h3>
                    <div className="task-list">
                      {groupedTasks['Da Fare'].map((task) => (
                        <div key={task.id} className="task-row">
                          <div className="task-row-left">
                            <button className="task-checkbox">
                              <Circle size={20} />
                            </button>
                            <div className="task-content">
                              <span className="task-title">{task.title}</span>
                              {task.description && (
                                <span className="task-description">
                                  {truncateDescription(task.description, 80)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="task-row-right">
                            {task.due_date && (
                              <span
                                className={`task-date ${isOverdue(task.due_date) ? 'overdue' : ''}`}
                              >
                                {isOverdue(task.due_date) ? (
                                  <AlertTriangle size={14} />
                                ) : (
                                  <Calendar size={14} />
                                )}
                                {formatDate(task.due_date)}
                              </span>
                            )}
                            {task.priority && (
                              <span
                                className="task-priority-dot"
                                style={{ backgroundColor: getPriorityColor(task.priority) }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* In Lavorazione */}
                {groupedTasks['In Lavorazione'].length > 0 && (
                  <div className="task-group">
                    <h3 className="task-group-title">In Lavorazione</h3>
                    <div className="task-list">
                      {groupedTasks['In Lavorazione'].map((task) => (
                        <div key={task.id} className="task-row">
                          <div className="task-row-left">
                            <button className="task-checkbox">
                              <Circle size={20} />
                            </button>
                            <div className="task-content">
                              <span className="task-title">{task.title}</span>
                              {task.description && (
                                <span className="task-description">
                                  {truncateDescription(task.description, 80)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="task-row-right">
                            {task.due_date && (
                              <span
                                className={`task-date ${isOverdue(task.due_date) ? 'overdue' : ''}`}
                              >
                                {isOverdue(task.due_date) ? (
                                  <AlertTriangle size={14} />
                                ) : (
                                  <Calendar size={14} />
                                )}
                                {formatDate(task.due_date)}
                              </span>
                            )}
                            {task.priority && (
                              <span
                                className="task-priority-dot"
                                style={{ backgroundColor: getPriorityColor(task.priority) }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* In Revisione */}
                {groupedTasks['In Revisione'].length > 0 && (
                  <div className="task-group">
                    <h3 className="task-group-title">In Revisione</h3>
                    <div className="task-list">
                      {groupedTasks['In Revisione'].map((task) => (
                        <div key={task.id} className="task-row">
                          <div className="task-row-left">
                            <button className="task-checkbox">
                              <Circle size={20} />
                            </button>
                            <div className="task-content">
                              <span className="task-title">{task.title}</span>
                              {task.description && (
                                <span className="task-description">
                                  {truncateDescription(task.description, 80)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="task-row-right">
                            {task.due_date && (
                              <span
                                className={`task-date ${isOverdue(task.due_date) ? 'overdue' : ''}`}
                              >
                                {isOverdue(task.due_date) ? (
                                  <AlertTriangle size={14} />
                                ) : (
                                  <Calendar size={14} />
                                )}
                                {formatDate(task.due_date)}
                              </span>
                            )}
                            {task.priority && (
                              <span
                                className="task-priority-dot"
                                style={{ backgroundColor: getPriorityColor(task.priority) }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completati */}
                {groupedTasks['Completati'].length > 0 && (
                  <div className="task-group">
                    <h3 className="task-group-title">Completati</h3>
                    <div className="task-list">
                      {groupedTasks['Completati'].map((task) => (
                        <div key={task.id} className="task-row completed">
                          <div className="task-row-left">
                            <button className="task-checkbox checked">
                              <CheckCircle2 size={20} />
                            </button>
                            <div className="task-content">
                              <span className="task-title">{task.title}</span>
                              {task.description && (
                                <span className="task-description">
                                  {truncateDescription(task.description, 80)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="task-row-right">
                            {task.completed_date && (
                              <span className="task-date">
                                <CheckCircle2 size={14} />
                                {formatDate(task.completed_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="freelance-empty-state">
                <p>Nessun task assegnato</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="project-hub-sidebar">
          {/* Project Info Card */}
          <div className="sidebar-card">
            <h3 className="sidebar-card-title">Info Progetto</h3>
            <div className="sidebar-card-content">
              {project.end_date && (
                <div className="sidebar-info-item">
                  <Calendar size={16} />
                  <div>
                    <span className="sidebar-info-label">Consegna prevista</span>
                    <span className="sidebar-info-value">{formatDateFull(project.end_date)}</span>
                  </div>
                </div>
              )}
              {project.client && (
                <div className="sidebar-info-item">
                  <Building2 size={16} />
                  <div>
                    <span className="sidebar-info-label">Cliente</span>
                    <span className="sidebar-info-value">{project.client.company_name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Files & Assets Card */}
          <div className="sidebar-card">
            <h3 className="sidebar-card-title">File & Documenti</h3>
            <div className="sidebar-card-content">
              {projectFiles.length > 0 ? (
                <div className="file-list">
                  {projectFiles.map((file, index) => (
                    <div key={index} className="file-row">
                      <div className="file-row-icon">
                        {file.type === 'link' ? (
                          <LinkIcon size={16} />
                        ) : (
                          <FileText size={16} />
                        )}
                      </div>
                      <span className="file-row-name">{file.name}</span>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-row-download"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sidebar-empty-state">
                  <FileText size={24} />
                  <p>Nessun file caricato</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="sidebar-card">
            <h3 className="sidebar-card-title">Azioni Rapide</h3>
            <div className="sidebar-card-content">
              <button
                className="sidebar-action-button"
                onClick={() => navigate(`${basePath}/chat?project=${project.id}`)}
              >
                <MessageSquare size={18} />
                <span>Apri Chat Progetto</span>
              </button>
              <button
                className="sidebar-action-button"
                onClick={() => navigate(`${basePath}/supporto`)}
              >
                <AlertCircle size={18} />
                <span>Segnala Problema</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelanceProjectDetailPage;
