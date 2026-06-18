import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Download,
  Link as LinkIcon,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import type { FreelanceProject, FreelanceTask } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceProgettoDetailTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceProjectDetailPage.css';

type TabId = 'panoramica' | 'task' | 'documenti' | 'azioni';

const STATUS_LABELS: Record<string, string> = {
  in_attesa_presa_carico: 'In Attesa',
  preso_in_carico: 'Preso in Carico',
  avviato: 'Avviato',
  active: 'Attivo',
  paused: 'In Pausa',
  completed: 'Completato',
  archived: 'Archiviato',
};

const STATUS_COLORS: Record<string, string> = {
  in_attesa_presa_carico: '#007AFF',
  preso_in_carico: '#007AFF',
  avviato: '#34C759',
  active: '#34C759',
  paused: '#FF9500',
  completed: '#8E8E93',
  archived: '#8E8E93',
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'panoramica', label: 'Panoramica' },
  { id: 'task', label: 'Task' },
  { id: 'documenti', label: 'Documenti' },
  { id: 'azioni', label: 'Azioni' },
];

const TASK_GROUPS = ['Da Fare', 'In Lavorazione', 'In Revisione', 'Completati'] as const;

// ── Circular Progress ──────────────────────────────────────
interface CircularProgressProps {
  progress: number;
  size?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ progress, size = 120 }) => {
  const strokeWidth = 7;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="pd-circular" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="pd-circular-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="pd-circular-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="round"
        />
      </svg>
      <div className="pd-circular-text">
        <span className="pd-circular-pct">{Math.round(progress)}%</span>
        <span className="pd-circular-label">completato</span>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────
const FreelanceProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const basePath = isCrmScoped && crmDepartmentCode
    ? `/freelance/crm/${encodeURIComponent(crmDepartmentCode)}`
    : '/freelance';

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<FreelanceProject | null>(null);
  const [projectTasks, setProjectTasks] = useState<FreelanceTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('panoramica');
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

  const groupedTasks = useMemo(() => {
    const groups: Record<string, FreelanceTask[]> = {
      'Da Fare': [],
      'In Lavorazione': [],
      'In Revisione': [],
      'Completati': [],
    };
    projectTasks.forEach((task) => {
      if (task.status === 'pending') groups['Da Fare'].push(task);
      else if (task.status === 'in_progress') groups['In Lavorazione'].push(task);
      else if (task.status === 'review') groups['In Revisione'].push(task);
      else if (task.status === 'completed') groups['Completati'].push(task);
    });
    return groups;
  }, [projectTasks]);

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      low: '#8E8E93',
      medium: '#007AFF',
      high: '#FF9500',
      urgent: '#FF3B30',
    };
    return colorMap[priority] || '#8E8E93';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const formatDateFull = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const truncateDescription = (text: string | null, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getProjectFiles = () => {
    const files: Array<{ name: string; url: string; type: 'link' | 'document' }> = [];

    if (project?.settings) {
      if (project.settings.link_cartella_documenti)
        files.push({ name: 'Cartella Documenti', url: project.settings.link_cartella_documenti, type: 'link' });
      if (project.settings.link_foto_video)
        files.push({ name: 'Foto e Video', url: project.settings.link_foto_video, type: 'link' });
      if (project.settings.link_cartella_social)
        files.push({ name: 'Materiali Social', url: project.settings.link_cartella_social, type: 'link' });
    }

    project?.contracts?.forEach((contract) => {
      contract.signedDocuments?.forEach((doc) => {
        files.push({
          name: doc.document_name,
          url: doc.external_url || (doc.file_path ? `/backend/storage/${doc.file_path}` : ''),
          type: 'document',
        });
      });
    });

    return files;
  };

  // ── Loading / not found ──
  if (loading) {
    return (
      <div className="pd-loading">
        <div className="pd-spinner" />
      </div>
    );
  }

  if (!project) return null;

  const projectFiles = getProjectFiles();
  const progress = project.progress ?? 0;
  const statusColor = STATUS_COLORS[project.status] ?? '#8E8E93';
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;

  return (
    <div className="pd-page">
      <GuideTour steps={freelanceProgettoDetailTourSteps} tourId="freelance-progetto-detail-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />

      {/* ── Top bar ── */}
      <div className="pd-topbar">
        <button className="pd-back-btn" onClick={() => navigate(`${basePath}/progetti`)}>
          <ChevronLeft size={16} />
          <span>Progetti</span>
        </button>

        <div className="pd-topbar-center">
          <h1 className="pd-project-title">{project.name}</h1>
          <span
            className="pd-status-badge"
            style={{ color: statusColor, backgroundColor: `${statusColor}22` }}
          >
            {statusLabel}
          </span>
        </div>

        {project.is_project_manager && (
          <div className="pd-topbar-actions">
            <button
              className="pd-topbar-action-btn"
              onClick={() => navigate(`${basePath}/progetti/${project.id}/gestione`)}
            >
              Gestione Completa
            </button>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="pd-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`pd-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                className="pd-tab-underline"
                layoutId="pd-tab-underline"
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="pd-tab-content"
        >

          {/* ════════════════ PANORAMICA ════════════════ */}
          {activeTab === 'panoramica' && (
            <div className="pd-panoramica">
              <div className="pd-panoramica-left">

                {/* Description */}
                {project.description && (
                  <div className="pd-card">
                    <h3 className="pd-card-title">Descrizione</h3>
                    <div className="pd-description">
                      <p className={descriptionExpanded ? 'expanded' : ''}>
                        {descriptionExpanded
                          ? project.description
                          : truncateDescription(project.description)}
                      </p>
                      {project.description.length > 200 && (
                        <button
                          className="pd-read-more"
                          onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        >
                          {descriptionExpanded ? (
                            <><ChevronUp size={13} /><span>Leggi meno</span></>
                          ) : (
                            <><ChevronDown size={13} /><span>Leggi di più</span></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Key dates */}
                <div className="pd-card">
                  <h3 className="pd-card-title">Date Chiave</h3>
                  {project.start_date || project.end_date ? (
                    <div className="pd-dates">
                      {project.start_date && (
                        <div className="pd-date-row">
                          <div className="pd-date-dot pd-date-dot--start" />
                          <div className="pd-date-info">
                            <span className="pd-date-label">Inizio</span>
                            <span className="pd-date-value">{formatDateFull(project.start_date)}</span>
                          </div>
                        </div>
                      )}
                      {project.start_date && project.end_date && (
                        <div className="pd-date-connector" />
                      )}
                      {project.end_date && (
                        <div className="pd-date-row">
                          <div className="pd-date-dot pd-date-dot--end" />
                          <div className="pd-date-info">
                            <span className="pd-date-label">Consegna prevista</span>
                            <span className="pd-date-value">{formatDateFull(project.end_date)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="pd-empty-note">Nessuna data impostata</p>
                  )}
                </div>

                {/* Client */}
                {project.client && (
                  <div className="pd-card">
                    <h3 className="pd-card-title">Cliente</h3>
                    <div className="pd-kv-list">
                      <div className="pd-kv-row">
                        <span className="pd-kv-label">Azienda</span>
                        <span className="pd-kv-value">{project.client.company_name}</span>
                      </div>
                      {project.client.contact_person && (
                        <div className="pd-kv-row">
                          <span className="pd-kv-label">Referente</span>
                          <span className="pd-kv-value">{project.client.contact_person}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="pd-panoramica-right">
                <div className="pd-card pd-card--center">
                  <h3 className="pd-card-title">Avanzamento</h3>
                  <CircularProgress progress={progress} size={120} />
                </div>

                <div className="pd-card">
                  <h3 className="pd-card-title">Statistiche</h3>
                  <div className="pd-stats-grid">
                    <div className="pd-stat">
                      <span className="pd-stat-value">{projectTasks.length}</span>
                      <span className="pd-stat-label">Totali</span>
                    </div>
                    <div className="pd-stat">
                      <span className="pd-stat-value" style={{ color: '#34C759' }}>
                        {groupedTasks['Completati'].length}
                      </span>
                      <span className="pd-stat-label">Completati</span>
                    </div>
                    <div className="pd-stat">
                      <span className="pd-stat-value" style={{ color: '#007AFF' }}>
                        {groupedTasks['In Lavorazione'].length}
                      </span>
                      <span className="pd-stat-label">In corso</span>
                    </div>
                    <div className="pd-stat">
                      <span className="pd-stat-value" style={{ color: '#FF9500' }}>
                        {groupedTasks['In Revisione'].length}
                      </span>
                      <span className="pd-stat-label">Revisione</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ TASK ════════════════ */}
          {activeTab === 'task' && (
            <div className="pd-tasks-panel">
              {loadingTasks ? (
                <div className="pd-loading">
                  <div className="pd-spinner" />
                </div>
              ) : projectTasks.length > 0 ? (
                <div className="pd-card">
                  <div className="pd-task-manager">
                    {TASK_GROUPS.map((groupName) => {
                      const tasks = groupedTasks[groupName];
                      if (tasks.length === 0) return null;
                      const isCompleted = groupName === 'Completati';
                      return (
                        <div key={groupName} className="pd-task-group">
                          <h3 className="pd-task-group-title">{groupName}</h3>
                          <div className="pd-task-list">
                            {tasks.map((task) => (
                              <div key={task.id} className={`pd-task-row${isCompleted ? ' completed' : ''}`}>
                                <div className="pd-task-row-left">
                                  <span className="pd-task-checkbox">
                                    {isCompleted
                                      ? <CheckCircle2 size={18} className="checked" />
                                      : <Circle size={18} />
                                    }
                                  </span>
                                  <div className="pd-task-content">
                                    <span className="pd-task-title">{task.title}</span>
                                    {task.description && (
                                      <span className="pd-task-desc">
                                        {truncateDescription(task.description, 80)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="pd-task-row-right">
                                  {task.due_date && (
                                    <span className={`pd-task-date${isOverdue(task.due_date) ? ' overdue' : ''}`}>
                                      {isOverdue(task.due_date)
                                        ? <AlertTriangle size={11} />
                                        : <Calendar size={11} />
                                      }
                                      {formatDate(task.due_date)}
                                    </span>
                                  )}
                                  {task.priority && (
                                    <span
                                      className="pd-task-priority"
                                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="pd-empty">
                  <p>Nessun task assegnato a questo progetto</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ DOCUMENTI ════════════════ */}
          {activeTab === 'documenti' && (
            <div className="pd-documenti-panel">
              <div className="pd-card">
                <h3 className="pd-card-title">File & Documenti</h3>
                {projectFiles.length > 0 ? (
                  <div className="pd-file-list">
                    {projectFiles.map((file, index) => (
                      <div key={index} className="pd-file-row">
                        <div className="pd-file-icon">
                          {file.type === 'link' ? <LinkIcon size={14} /> : <FileText size={14} />}
                        </div>
                        <span className="pd-file-name">{file.name}</span>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pd-file-download"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pd-empty">
                    <FileText size={32} className="pd-empty-icon" />
                    <p>Nessun file disponibile</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════ AZIONI ════════════════ */}
          {activeTab === 'azioni' && (
            <div className="pd-azioni-panel">
              <div className="pd-card">
                <h3 className="pd-card-title">Azioni Rapide</h3>
                <div className="pd-actions-list">
                  <button
                    className="pd-action-item"
                    onClick={() => navigate(`${basePath}/chat?project=${project.id}`)}
                  >
                    <span className="pd-action-item-icon pd-action-item-icon--blue">
                      <MessageSquare size={16} />
                    </span>
                    <div className="pd-action-item-text">
                      <span className="pd-action-item-label">Chat Progetto</span>
                      <span className="pd-action-item-desc">Comunicazione con il team</span>
                    </div>
                    <ChevronRight size={14} className="pd-action-item-chevron" />
                  </button>
                  <button
                    className="pd-action-item"
                    onClick={() => navigate(`${basePath}/supporto`)}
                  >
                    <span className="pd-action-item-icon pd-action-item-icon--orange">
                      <AlertCircle size={16} />
                    </span>
                    <div className="pd-action-item-text">
                      <span className="pd-action-item-label">Segnala Problema</span>
                      <span className="pd-action-item-desc">Apri un ticket di supporto</span>
                    </div>
                    <ChevronRight size={14} className="pd-action-item-chevron" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FreelanceProjectDetailPage;
