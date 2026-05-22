import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckSquare, Filter, Circle, Eye, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import { freelanceCrmApi } from '../../api/freelanceCrm';
import { freelanceCache, type TasksPageCachePayload } from '../../utils/freelanceCache';
import type { FreelanceTask, FreelanceProject } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceTaskTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceTasksPage.css';

const FreelanceTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<FreelanceTask[]>([]);
  const [projects, setProjects] = useState<FreelanceProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | 'all'>('all');
  const [, setUpdatingTask] = useState<number | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const basePath = isCrmScoped && crmDepartmentCode
    ? `/freelance/crm/${encodeURIComponent(crmDepartmentCode)}`
    : '/freelance';

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const crmCode: string | undefined = isCrmScoped ? (crmDepartmentCode ?? undefined) : undefined;
      const cached = freelanceCache.tasks.get<TasksPageCachePayload>(user.id, crmCode);
      if (cached?.tasks && cached?.projects) {
        setTasks(cached.tasks as FreelanceTask[]);
        setProjects(cached.projects as FreelanceProject[]);
        setLoading(false);
      }

      try {
        if (isCrmScoped && crmDepartmentCode) {
          const [tasksData, projectsData] = await Promise.all([
            freelanceCrmApi.getTasks(crmDepartmentCode),
            freelanceCrmApi.getProjects(crmDepartmentCode),
          ]);
          setTasks(tasksData);
          setProjects(projectsData);
          freelanceCache.tasks.set(user.id, crmCode, { tasks: tasksData, projects: projectsData });
        } else {
          const [tasksData, projectsData] = await Promise.all([
            freelanceApi.getFreelancerTasks(),
            freelanceApi.getFreelancerProjects(),
          ]);
          setTasks(tasksData);
          setProjects(projectsData);
          freelanceCache.tasks.set(user.id, crmCode, { tasks: tasksData, projects: projectsData });
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
        if (!cached?.tasks?.length && !cached?.projects?.length) {
          setTasks([]);
          setProjects([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, isCrmScoped, crmDepartmentCode]);

  const handleTaskStatusChange = async (task: FreelanceTask, newStatus: FreelanceTask['status']) => {
    if (!task.project) return;
    
    setUpdatingTask(task.id);
    try {
      await freelanceApi.updateTaskStatus(task.project.id, task.id, newStatus);
      
      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id ? { ...t, status: newStatus } : t
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Errore nell\'aggiornamento del task');
    } finally {
      setUpdatingTask(null);
    }
  };

  const filteredTasks = selectedProject === 'all'
    ? tasks
    : tasks.filter((task) => task.project?.id === selectedProject);

  const tasksByStatus = {
    pending: filteredTasks.filter((t) => t.status === 'pending'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    review: filteredTasks.filter((t) => t.status === 'review'),
    completed: filteredTasks.filter((t) => t.status === 'completed'),
    cancelled: filteredTasks.filter((t) => t.status === 'cancelled'),
  };


  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      urgent: '#FF453A',
      high: '#FF9F0A',
      medium: '#0A84FF',
      low: '#8E8E93',
    };
    return colorMap[priority] || '#8E8E93';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Domani';
    } else {
      // Format as "28 Gen" (day + short month with capitalized first letter)
      const formatted = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      const parts = formatted.split(' ');
      if (parts.length === 2) {
        // Capitalize first letter of month
        return parts[0] + ' ' + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      }
      return formatted;
    }
  };

  const isDueSoon = (task: FreelanceTask) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24;
  };

  // Compact Task Row Component
  const TaskRow: React.FC<{ task: FreelanceTask }> = ({ task }) => {
    const dueDateFormatted = formatDate(task.due_date);
    const dueSoon = isDueSoon(task);
    
    const handleRowClick = (e: React.MouseEvent) => {
      // Prevent navigation if clicking on status icon/action area
      const target = e.target as HTMLElement;
      if (target.closest('.task-row-status-action')) {
        return;
      }
      navigate(`${basePath}/task/${task.id}`);
    };

    const handleStatusAction = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (task.status === 'pending') {
        handleTaskStatusChange(task, 'in_progress');
      } else if (task.status === 'in_progress') {
        handleTaskStatusChange(task, 'pending');
      } else if (task.status === 'completed') {
        handleTaskStatusChange(task, 'pending');
      }
    };

    const renderStatusIcon = () => {
      if (task.status === 'pending') {
        return (
          <div 
            className="task-row-status-action task-row-checkbox"
            onClick={handleStatusAction}
          >
            <Circle size={18} strokeWidth={2} />
          </div>
        );
      } else if (task.status === 'in_progress') {
        return (
          <div 
            className="task-row-status-action task-row-pulse-dot"
            onClick={handleStatusAction}
            title="Pausa"
          >
            <div className="task-row-pulse-dot-inner" />
          </div>
        );
      } else if (task.status === 'review') {
        return (
          <div className="task-row-status-action task-row-review-icon">
            <Eye size={16} />
          </div>
        );
      } else if (task.status === 'completed') {
        return (
          <div 
            className="task-row-status-action task-row-checkbox"
            onClick={handleStatusAction}
          >
            <CheckSquare size={18} strokeWidth={2} fill="currentColor" />
          </div>
        );
      } else if (task.status === 'cancelled') {
        return (
          <div className="task-row-status-action task-row-checkbox">
            <Circle size={18} strokeWidth={2} style={{ opacity: 0.3 }} />
          </div>
        );
      }
      return null;
    };

    return (
      <div 
        className="task-row"
        onClick={handleRowClick}
      >
        {/* Left: Status/Action */}
        <div className="task-row-left">
          {renderStatusIcon()}
        </div>

        {/* Middle: Identity */}
        <div className="task-row-middle">
          <div className="task-row-title">{task.title}</div>
          {task.project && (
            <div className="task-row-project">{task.project.name}</div>
          )}
        </div>

        {/* Right: Meta */}
        <div className="task-row-right">
          <div className="task-row-meta">
            <div
              className="task-row-priority"
              style={{ color: getPriorityColor(task.priority) }}
            >
              <Circle size={6} fill="currentColor" />
            </div>
            {dueDateFormatted && (
              <div className={`task-row-date ${dueSoon ? 'due-soon' : ''} ${task.isOverdue ? 'overdue' : ''}`}>
                {dueDateFormatted}
              </div>
            )}
            <ChevronRight size={16} className="task-row-chevron" />
          </div>
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

  return (
    <div className="freelance-tasks-page">
      <GuideTour steps={freelanceTaskTourSteps} tourId="freelance-task-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      <div className="freelance-tasks-header">
        <div>
          <h1 className="freelance-tasks-title">Task</h1>
          <p className="freelance-tasks-subtitle">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'task'} totali
          </p>
        </div>
        <div className="freelance-tasks-actions">
          <div className="freelance-tasks-filter">
            <Filter size={16} />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="freelance-tasks-filter-select"
            >
              <option value="all">Tutti i progetti</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="freelance-tasks-container">
        {/* Da Fare */}
        <div className="task-section">
          <div className="task-section-header">
            <h2 className="task-section-title">
              DA FARE <span className="task-section-badge">• {tasksByStatus.pending.length}</span>
            </h2>
          </div>
          <div className="task-section-content">
            {tasksByStatus.pending.length > 0 ? (
              tasksByStatus.pending.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))
            ) : (
              <div className="task-section-empty">{t('freelance.no_active_tasks')}</div>
            )}
          </div>
        </div>

        {/* In Corso */}
        <div className="task-section">
          <div className="task-section-header">
            <h2 className="task-section-title">
              IN CORSO <span className="task-section-badge">• {tasksByStatus.in_progress.length}</span>
            </h2>
          </div>
          <div className="task-section-content">
            {tasksByStatus.in_progress.length > 0 ? (
              tasksByStatus.in_progress.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))
            ) : (
              <div className="task-section-empty">{t('freelance.no_active_tasks')}</div>
            )}
          </div>
        </div>

        {/* In Revisione */}
        <div className="task-section">
          <div className="task-section-header">
            <h2 className="task-section-title">
              IN REVISIONE <span className="task-section-badge">• {tasksByStatus.review.length}</span>
            </h2>
          </div>
          <div className="task-section-content">
            {tasksByStatus.review.length > 0 ? (
              tasksByStatus.review.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))
            ) : (
              <div className="task-section-empty">{t('freelance.no_active_tasks')}</div>
            )}
          </div>
        </div>

        {/* Completati - Collapsible */}
        <div className="task-section">
          <div 
            className="task-section-header task-section-header-collapsible"
            onClick={() => setCompletedExpanded(!completedExpanded)}
          >
            <h2 className="task-section-title">
              COMPLETATI <span className="task-section-badge">• {tasksByStatus.completed.length}</span>
            </h2>
            {completedExpanded ? (
              <ChevronDown size={16} className="task-section-chevron" />
            ) : (
              <ChevronRight size={16} className="task-section-chevron" />
            )}
          </div>
          {completedExpanded && (
            <div className="task-section-content">
              {tasksByStatus.completed.length > 0 ? (
                tasksByStatus.completed.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))
              ) : (
                <div className="task-section-empty">{t('freelance.no_tasks_completed')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreelanceTasksPage;
