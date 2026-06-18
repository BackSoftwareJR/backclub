import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Clock,
  Calendar,
  ListTodo,
  CheckCheck,
  Star,
  Plus,
  Circle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import { freelanceCrmApi } from '../../api/freelanceCrm';
import { freelanceCache, type TasksPageCachePayload } from '../../utils/freelanceCache';
import type { FreelanceTask, FreelanceProject } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceTaskTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceTasksPage.css';

type SmartList = 'all' | 'today' | 'scheduled' | 'completed' | number;

interface SmartListItemProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  selected: boolean;
  onClick: () => void;
}

const SmartListItem: React.FC<SmartListItemProps> = ({ label, count, icon, color, selected, onClick }) => (
  <button className={`reminders-smartlist-item${selected ? ' selected' : ''}`} onClick={onClick}>
    <div className="reminders-smartlist-icon" style={{ backgroundColor: `${color}26`, color }}>
      {icon}
    </div>
    <span className="reminders-smartlist-label">{label}</span>
    {count > 0 && <span className="reminders-smartlist-count">{count}</span>}
  </button>
);

const FreelanceTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<FreelanceTask[]>([]);
  const [projects, setProjects] = useState<FreelanceProject[]>([]);
  const [selectedList, setSelectedList] = useState<SmartList>('all');
  const [, setUpdatingTask] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Errore nell\'aggiornamento del task');
    } finally {
      setUpdatingTask(null);
    }
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      urgent: '#FF3B30',
      high: '#FF9500',
      medium: '#007AFF',
      normal: '#007AFF',
      low: 'rgba(255,255,255,0.2)',
    };
    return colors[priority] ?? 'rgba(255,255,255,0.2)';
  };

  const formatDate = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Oggi';
    if (date.toDateString() === tomorrow.toDateString()) return 'Domani';
    const formatted = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    const parts = formatted.split(' ');
    if (parts.length === 2) return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}${parts[1].slice(1)}`;
    return formatted;
  };

  const isTodayDate = (dateString: string | null): boolean => {
    if (!dateString) return false;
    return new Date(dateString).toDateString() === new Date().toDateString();
  };

  const isTaskOverdue = (task: FreelanceTask): boolean => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
  };

  const getSmartListTasks = (list: SmartList): FreelanceTask[] => {
    const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    if (list === 'all') return active;
    if (list === 'today') return active.filter(t => isTodayDate(t.due_date));
    if (list === 'scheduled') return active.filter(t => t.due_date && !isTodayDate(t.due_date));
    if (list === 'completed') return tasks.filter(t => t.status === 'completed');
    return active.filter(t => t.project?.id === list);
  };

  const getSmartListName = (list: SmartList): string => {
    if (list === 'all') return 'Tutte';
    if (list === 'today') return 'Oggi';
    if (list === 'scheduled') return 'Programmati';
    if (list === 'completed') return 'Completate';
    return projects.find(p => p.id === list)?.name ?? 'Progetto';
  };

  const groupByProject = (taskList: FreelanceTask[]): Record<string, FreelanceTask[]> => {
    const groups: Record<string, FreelanceTask[]> = {};
    taskList.forEach(task => {
      const key = task.project?.name ?? 'Senza Progetto';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Inner components (closures over state/handlers) ──────────────────────

  const TaskCheckbox: React.FC<{ task: FreelanceTask }> = ({ task }) => {
    const isCompleted = task.status === 'completed';
    const pColor = getPriorityColor(task.priority);

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleTaskStatusChange(task, isCompleted ? 'pending' : 'completed');
    };

    return (
      <motion.button
        className="reminders-checkbox"
        onClick={handleClick}
        whileTap={{ scale: 0.75 }}
        animate={{
          borderColor: isCompleted ? pColor : 'rgba(255,255,255,0.25)',
          backgroundColor: isCompleted ? pColor : 'rgba(0,0,0,0)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, duration: 0.15 }}
      >
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              key="checkmark"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  const TaskRow: React.FC<{ task: FreelanceTask; index: number }> = ({ task, index }) => {
    const dueDateStr = formatDate(task.due_date);
    const overdue = isTaskOverdue(task);
    const isCompleted = task.status === 'completed';
    const isInProgress = task.status === 'in_progress';
    const showProjectPill = selectedList === 'all' || selectedList === 'today' || selectedList === 'scheduled';

    return (
      <motion.div
        className={`reminders-task-row${isCompleted ? ' completed' : ''}`}
        onClick={() => navigate(`${basePath}/task/${task.id}`)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.025, 0.2), duration: 0.18 }}
      >
        <TaskCheckbox task={task} />

        <div
          className="reminders-priority-dot"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
        />

        <span className={`reminders-task-title${isCompleted ? ' is-done' : ''}`}>
          {task.title}
        </span>

        {isInProgress && (
          <span className="reminders-in-progress-dot">
            <Circle size={6} fill="#007AFF" color="#007AFF" className="reminders-pulse" />
          </span>
        )}

        <div className="reminders-task-meta">
          {showProjectPill && task.project && (
            <span className="reminders-project-pill">{task.project.name}</span>
          )}
          {dueDateStr && (
            <span
              className={`reminders-due-date${overdue ? ' overdue' : ''}${dueDateStr === 'Oggi' ? ' today' : ''}`}
            >
              {dueDateStr}
            </span>
          )}
          <ChevronRight size={13} className="reminders-row-chevron" />
        </div>
      </motion.div>
    );
  };

  const GroupSection: React.FC<{ name: string; taskList: FreelanceTask[] }> = ({ name, taskList }) => {
    const isCollapsed = collapsedGroups.has(name);
    return (
      <div className="reminders-group">
        <button className="reminders-group-header" onClick={() => toggleGroup(name)}>
          <motion.span
            className="reminders-group-chevron"
            animate={{ rotate: isCollapsed ? 0 : 90 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            style={{ display: 'flex' }}
          >
            <ChevronRight size={13} />
          </motion.span>
          <span className="reminders-group-name">{name}</span>
          <span className="reminders-group-count">{taskList.length}</span>
        </button>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              {taskList.map((task, i) => (
                <TaskRow key={task.id} task={task} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="freelance-loading">
        <div className="freelance-spinner" />
      </div>
    );
  }

  const displayedTasks = getSmartListTasks(selectedList);
  const grouped = groupByProject(displayedTasks);

  const smartCounts = {
    all:       tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
    today:     tasks.filter(t => isTodayDate(t.due_date) && t.status !== 'completed' && t.status !== 'cancelled').length,
    scheduled: tasks.filter(t => t.due_date && !isTodayDate(t.due_date) && t.status !== 'completed' && t.status !== 'cancelled').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="reminders-page">
      <GuideTour steps={freelanceTaskTourSteps} tourId="freelance-task-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />

      {/* ── Left Sidebar ── */}
      <aside className="reminders-sidebar">
        <div className="reminders-sidebar-section">
          <SmartListItem
            label="Tutte"
            count={smartCounts.all}
            icon={<ListTodo size={16} />}
            color="#007AFF"
            selected={selectedList === 'all'}
            onClick={() => setSelectedList('all')}
          />
          <SmartListItem
            label="Oggi"
            count={smartCounts.today}
            icon={<Calendar size={16} />}
            color="#FF9500"
            selected={selectedList === 'today'}
            onClick={() => setSelectedList('today')}
          />
          <SmartListItem
            label="Programmati"
            count={smartCounts.scheduled}
            icon={<Clock size={16} />}
            color="#34C759"
            selected={selectedList === 'scheduled'}
            onClick={() => setSelectedList('scheduled')}
          />
          <SmartListItem
            label="Completate"
            count={smartCounts.completed}
            icon={<CheckCheck size={16} />}
            color="#8E8E93"
            selected={selectedList === 'completed'}
            onClick={() => setSelectedList('completed')}
          />
        </div>

        {projects.length > 0 && (
          <>
            <div className="reminders-sidebar-divider" />
            <div className="reminders-sidebar-section">
              <p className="reminders-sidebar-section-label">Progetti</p>
              {projects.map(project => {
                const cnt = tasks.filter(
                  t => t.project?.id === project.id && t.status !== 'completed' && t.status !== 'cancelled'
                ).length;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const projectColor: string = (project as any).crmDepartment?.color ?? '#636366';
                return (
                  <SmartListItem
                    key={project.id}
                    label={project.name}
                    count={cnt}
                    icon={<Star size={15} />}
                    color={projectColor}
                    selected={selectedList === project.id}
                    onClick={() => setSelectedList(project.id)}
                  />
                );
              })}
            </div>
          </>
        )}
      </aside>

      {/* ── Right Content ── */}
      <main className="reminders-content">
        <div className="reminders-content-header">
          <h1 className="reminders-content-title">{getSmartListName(selectedList)}</h1>
        </div>

        <div className="reminders-task-list">
          {Object.keys(grouped).length === 0 ? (
            <p className="reminders-empty">
              {selectedList === 'completed'
                ? t('freelance.no_tasks_completed')
                : t('freelance.no_active_tasks')}
            </p>
          ) : (
            Object.entries(grouped).map(([name, grpTasks]) => (
              <GroupSection key={name} name={name} taskList={grpTasks} />
            ))
          )}
        </div>

        <button className="reminders-add-btn" type="button">
          <Plus size={15} />
          <span>Aggiungi Promemoria</span>
        </button>
      </main>
    </div>
  );
};

export default FreelanceTasksPage;
