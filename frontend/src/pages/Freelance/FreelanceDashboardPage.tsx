import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Circle,
  ChevronLeft,
  ChevronRight,
  Bell,
  Plus,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import { freelanceCrmApi } from '../../api/freelanceCrm';
import { freelanceCalendarApi, type FreelanceCalendarItem } from '../../api/freelanceCalendar';
import type { FreelanceDashboardStats, FreelanceTask } from '../../types/freelance';
import { Calendar, Video, AlertCircle, FileText, CheckCircle2, ArrowUpRight } from 'lucide-react';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceDashboardTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceDashboardPage.css';

// ============================================================
// Mini Calendar — Apple Calendar style
// ============================================================

const MiniCalendar: React.FC<{ tasks: FreelanceTask[] }> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days: (Date | null)[] = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const hasTaskOnDay = (date: Date | null) => {
    if (!date) return false;
    return tasks.some(task => {
      if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ];
  const dayNames = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];

  return (
    <div className="fd-mini-calendar">
      <div className="fd-mini-calendar-header">
        <button
          className="fd-mini-calendar-nav"
          onClick={handlePrevMonth}
          aria-label="Mese precedente"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
        </button>
        <h3 className="fd-mini-calendar-title">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button
          className="fd-mini-calendar-nav"
          onClick={handleNextMonth}
          aria-label="Mese successivo"
        >
          <ChevronRight size={14} strokeWidth={1.5} />
        </button>
      </div>
      <div className="fd-mini-calendar-grid">
        {dayNames.map(day => (
          <div key={day} className="fd-mini-calendar-day-name">{day}</div>
        ))}
        {days.map((date, index) => (
          <div
            key={index}
            className={[
              'fd-mini-calendar-day',
              !date ? 'empty' : '',
              isToday(date) ? 'today' : '',
              hasTaskOnDay(date) ? 'has-task' : '',
            ].filter(Boolean).join(' ')}
          >
            {date && (
              <>
                <span className="fd-mini-calendar-day-number">{date.getDate()}</span>
                {hasTaskOnDay(date) && <span className="fd-mini-calendar-day-dot" />}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Types
// ============================================================

type TaskTab = 'oggi' | 'prossimi' | 'in-revisione' | 'scaduti';

// ============================================================
// Main Component
// ============================================================

const FreelanceDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FreelanceDashboardStats | null>(null);
  const [tasks, setTasks] = useState<FreelanceTask[]>([]);
  const [calendarItems, setCalendarItems] = useState<FreelanceCalendarItem[]>([]);
  const [activeTab, setActiveTab] = useState<TaskTab>('oggi');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        if (isCrmScoped && crmDepartmentCode) {
          const [dashboardData, calendarData] = await Promise.all([
            freelanceCrmApi.getDashboardData(crmDepartmentCode),
            freelanceCrmApi.getCalendarItems(crmDepartmentCode),
          ]);
          setStats(dashboardData.stats ?? null);
          setTasks(dashboardData.tasks ?? []);
          setCalendarItems(Array.isArray(calendarData.events) ? calendarData.events : []);
        } else {
          const [dashboardData, calendarData] = await Promise.all([
            freelanceApi.getDashboardData(),
            freelanceCalendarApi.getItems(),
          ]);
          setStats(dashboardData.stats ?? null);
          setTasks(dashboardData.tasks ?? []);
          setCalendarItems(calendarData.data?.events ?? []);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setStats({
          activeProjects: 0,
          pendingTasks: 0,
          unreadMessages: 0,
          activeTasksToday: 0,
          upNextTasks: [],
        });
        setTasks([]);
        setCalendarItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, isCrmScoped, crmDepartmentCode]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Oggi';
    if (date.toDateString() === tomorrow.toDateString()) return 'Domani';
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const getTodayCalendarItems = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return calendarItems.filter(item => {
      if (item.completed_at) return false;
      const startDate = new Date(item.start_time);
      startDate.setHours(0, 0, 0, 0);
      return startDate.getTime() === today.getTime();
    });
  };

  const getUpcomingCalendarItems = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return calendarItems.filter(item => {
      if (item.completed_at) return false;
      const startDate = new Date(item.start_time);
      startDate.setHours(0, 0, 0, 0);
      return startDate.getTime() > today.getTime();
    });
  };

  const getFilteredTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let filtered = tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled');

    if (activeTab === 'oggi') {
      filtered = filtered.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });
    } else if (activeTab === 'prossimi') {
      filtered = filtered.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() > today.getTime();
      });
    } else if (activeTab === 'in-revisione') {
      filtered = filtered.filter(task => task.status === 'review' || task.status === 'in_progress');
    } else if (activeTab === 'scaduti') {
      filtered = filtered.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() < today.getTime();
      });
    }

    return filtered.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  };

  const getTodayItems = () => {
    const todayTasks = getFilteredTasks();
    const todayCalendarItems = getTodayCalendarItems();
    const combined = [
      ...todayTasks.map(task => ({ type: 'task' as const, item: task })),
      ...todayCalendarItems.map(item => ({ type: 'calendar' as const, item })),
    ];
    return combined.sort((a, b) => {
      if (a.type === 'task' && b.type === 'task') {
        const taskA = a.item as FreelanceTask;
        const taskB = b.item as FreelanceTask;
        if (taskA.isOverdue && !taskB.isOverdue) return -1;
        if (!taskA.isOverdue && taskB.isOverdue) return 1;
        return 0;
      }
      if (a.type === 'calendar' && b.type === 'calendar') {
        const calA = a.item as FreelanceCalendarItem;
        const calB = b.item as FreelanceCalendarItem;
        return new Date(calA.start_time).getTime() - new Date(calB.start_time).getTime();
      }
      return a.type === 'task' ? -1 : 1;
    });
  };

  const getCalendarItemIcon = (type: FreelanceCalendarItem['type']) => {
    switch (type) {
      case 'event': return <Calendar size={14} strokeWidth={1.5} />;
      case 'call': return <Video size={14} strokeWidth={1.5} />;
      case 'deadline': return <AlertCircle size={14} strokeWidth={1.5} />;
      case 'reminder': return <FileText size={14} strokeWidth={1.5} />;
      default: return <Calendar size={14} strokeWidth={1.5} />;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const getTasksTodayCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter(task => {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }).length;
  };

  const handleTaskToggle = async (task: FreelanceTask) => {
    if (!task.project) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await freelanceApi.updateTaskStatus(task.project.id, task.id, newStatus);
      setTasks(prevTasks =>
        prevTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
      );
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const filteredTasks = getFilteredTasks();
  const tasksTodayCount = getTasksTodayCount();
  const todayItems = getTodayItems();
  const upcomingCalendarItems = getUpcomingCalendarItems();
  const upcomingTasksCount = activeTab === 'prossimi' ? filteredTasks.length :
    tasks.filter(task => {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      if (!task.due_date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() > today.getTime();
    }).length;
  const upcomingTotalCount = upcomingTasksCount + upcomingCalendarItems.length;
  const scadutiCount = tasks.filter(task => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    if (!task.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime();
  }).length;

  if (loading) {
    return (
      <div className="fd-loading">
        <div className="fd-spinner" />
      </div>
    );
  }

  return (
    <div className="fd-cockpit">
      <GuideTour steps={freelanceDashboardTourSteps} tourId="freelance-dashboard-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />

      {/* ── Header ── */}
      <div className="fd-header">
        <div className="fd-header-left">
          <h1 className="fd-greeting">
            {getGreeting()}, <span className="fd-greeting-name">{user?.name?.split(' ')[0] || 'Freelance'}</span>
          </h1>
          <p className="fd-date">{getCurrentDate()}</p>
        </div>
        <div className="fd-header-right">
          <div className="fd-header-stats">
            <button
              className="fd-stat-pill"
              onClick={() => navigate('/freelance/progetti')}
            >
              <FolderKanban size={13} strokeWidth={1.5} />
              <span>{stats?.activeProjects || 0} Progetti</span>
            </button>
            <button
              className="fd-stat-pill"
              onClick={() => navigate('/freelance/task')}
            >
              <CheckSquare size={13} strokeWidth={1.5} />
              <span>{tasksTodayCount} Oggi</span>
            </button>
            {(stats?.unreadMessages ?? 0) > 0 && (
              <button
                className="fd-stat-pill fd-stat-pill-accent"
                onClick={() => navigate('/freelance/chat')}
              >
                <MessageSquare size={13} strokeWidth={1.5} />
                <span>{stats?.unreadMessages} nuovi</span>
              </button>
            )}
          </div>
          <div className="fd-header-actions">
            <button
              className="fd-action-btn"
              onClick={() => navigate('/freelance/progetti')}
            >
              <Plus size={13} strokeWidth={2} />
              <span>Progetto</span>
            </button>
            <button
              className="fd-action-btn fd-action-btn-primary"
              onClick={() => navigate('/freelance/task')}
            >
              <Plus size={13} strokeWidth={2} />
              <span>Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="fd-workspace">

        {/* LEFT — Task List */}
        <div className="fd-workspace-left">
          <div className="fd-task-section">
            {/* Tabs */}
            <div className="fd-task-tabs">
              {(['oggi', 'prossimi', 'in-revisione', 'scaduti'] as TaskTab[]).map(tab => (
                <button
                  key={tab}
                  className={`fd-task-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'oggi' && 'Oggi'}
                  {tab === 'prossimi' && (
                    <>Prossimi{upcomingTotalCount > 0 && <span className="fd-tab-badge fd-tab-badge-orange">{upcomingTotalCount}</span>}</>
                  )}
                  {tab === 'in-revisione' && 'In Revisione'}
                  {tab === 'scaduti' && (
                    <>Scaduti{scadutiCount > 0 && <span className="fd-tab-badge fd-tab-badge-red">{scadutiCount}</span>}</>
                  )}
                </button>
              ))}
            </div>

            {/* Overdue banner */}
            {activeTab === 'oggi' && scadutiCount > 0 && (
              <button
                type="button"
                className="fd-scaduti-banner"
                onClick={() => setActiveTab('scaduti')}
              >
                <AlertCircle size={14} strokeWidth={1.5} />
                <span>Hai {scadutiCount} task scadut{scadutiCount === 1 ? 'a' : 'e'} — clicca per vederle</span>
              </button>
            )}

            {/* Task List */}
            {(todayItems.length > 0 || (activeTab !== 'oggi' && filteredTasks.length > 0)) ? (
              <div className="fd-task-list">
                {activeTab === 'oggi' ? (
                  todayItems.map((item) => {
                    if (item.type === 'task') {
                      const task = item.item as FreelanceTask;
                      const dueDateFormatted = formatDate(task.due_date);
                      const isOverdue = task.isOverdue;

                      return (
                        <div
                          key={`task-${task.id}`}
                          className="fd-task-row"
                          onClick={() => navigate(`/freelance/task/${task.id}`)}
                        >
                          <button
                            className="fd-task-checkbox"
                            onClick={(e) => { e.stopPropagation(); handleTaskToggle(task); }}
                            aria-label={task.status === 'completed' ? 'Segna come non completato' : 'Segna come completato'}
                          >
                            {task.status === 'completed'
                              ? <CheckSquare size={16} strokeWidth={1.5} className="fd-checkbox-checked" />
                              : <Circle size={16} strokeWidth={1.5} className="fd-checkbox-unchecked" />
                            }
                          </button>
                          <div className="fd-task-content">
                            <div className="fd-task-title">{task.title}</div>
                            {task.project && (
                              <div className="fd-task-meta">
                                <FolderOpen size={11} strokeWidth={1.5} />
                                <span>{task.project.name}</span>
                              </div>
                            )}
                          </div>
                          {dueDateFormatted && (
                            <div className={`fd-task-badge ${isOverdue ? 'overdue' : ''}`}>
                              {dueDateFormatted}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      const calItem = item.item as FreelanceCalendarItem;
                      return (
                        <div
                          key={`calendar-${calItem.id}`}
                          className="fd-task-row fd-calendar-row"
                          onClick={() => navigate('/freelance/calendario')}
                        >
                          <div className="fd-calendar-icon">
                            {getCalendarItemIcon(calItem.type)}
                          </div>
                          <div className="fd-task-content">
                            <div className="fd-task-title">{calItem.title}</div>
                            <div className="fd-task-meta">
                              <span>
                                {calItem.type === 'event' ? 'Evento' :
                                  calItem.type === 'call' ? 'Chiamata' :
                                    calItem.type === 'deadline' ? 'Scadenza' :
                                      calItem.type === 'reminder' ? 'Promemoria' : 'Attività'}
                              </span>
                            </div>
                          </div>
                          <div className="fd-task-badge">{formatTime(calItem.start_time)}</div>
                        </div>
                      );
                    }
                  })
                ) : (
                  filteredTasks.map((task) => {
                    const dueDateFormatted = formatDate(task.due_date);
                    const isOverdue = task.isOverdue;
                    const isScadutiRow = activeTab === 'scaduti';

                    return (
                      <div
                        key={task.id}
                        className={`fd-task-row ${isScadutiRow ? 'fd-task-row-overdue' : ''}`}
                        onClick={() => navigate(`/freelance/task/${task.id}`)}
                      >
                        <button
                          className="fd-task-checkbox"
                          onClick={(e) => { e.stopPropagation(); handleTaskToggle(task); }}
                          aria-label={task.status === 'completed' ? 'Segna come non completato' : 'Segna come completato'}
                        >
                          {task.status === 'completed'
                            ? <CheckSquare size={16} strokeWidth={1.5} className="fd-checkbox-checked" />
                            : <Circle size={16} strokeWidth={1.5} className="fd-checkbox-unchecked" />
                          }
                        </button>
                        <div className="fd-task-content">
                          <div className="fd-task-title">{task.title}</div>
                          {task.project && (
                            <div className="fd-task-meta">
                              <FolderOpen size={11} strokeWidth={1.5} />
                              <span>{task.project.name}</span>
                            </div>
                          )}
                        </div>
                        {dueDateFormatted && (
                          <div className={`fd-task-badge ${isOverdue || isScadutiRow ? 'overdue' : ''}`}>
                            {isScadutiRow ? `Scaduto il ${dueDateFormatted}` : dueDateFormatted}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="fd-empty">
                <div className="fd-empty-icon">
                  <CheckCircle2 size={40} strokeWidth={1} />
                </div>
                <h3 className="fd-empty-title">{t('freelance.no_task')}</h3>
                <p className="fd-empty-message">Tutto a posto.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Widget Stack */}
        <div className="fd-workspace-right">

          {/* Mini Calendar */}
          <div className="fd-widget">
            <MiniCalendar tasks={tasks} />
          </div>

          {/* Quick Stats */}
          <div className="fd-widget">
            <h3 className="fd-widget-label">Riepilogo</h3>
            <div className="fd-stats-grid">
              <div
                className="fd-stat-tile"
                onClick={() => navigate('/freelance/progetti')}
              >
                <div className="fd-stat-tile-number" style={{ color: '#007AFF' }}>
                  {stats?.activeProjects ?? 0}
                </div>
                <div className="fd-stat-tile-label">Progetti attivi</div>
              </div>
              <div
                className="fd-stat-tile"
                onClick={() => navigate('/freelance/task')}
              >
                <div className="fd-stat-tile-number" style={{ color: '#34C759' }}>
                  {stats?.pendingTasks ?? 0}
                </div>
                <div className="fd-stat-tile-label">Task in sospeso</div>
              </div>
              <div
                className="fd-stat-tile"
                onClick={() => navigate('/freelance/task')}
              >
                <div className="fd-stat-tile-number" style={{ color: '#FF9500' }}>
                  {tasksTodayCount}
                </div>
                <div className="fd-stat-tile-label">Task oggi</div>
              </div>
              <div
                className="fd-stat-tile"
                onClick={() => navigate('/freelance/chat')}
              >
                <div className="fd-stat-tile-number" style={{ color: scadutiCount > 0 ? '#FF3B30' : 'rgba(255,255,255,0.6)' }}>
                  {scadutiCount}
                </div>
                <div className="fd-stat-tile-label">Scadute</div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="fd-widget">
            <h3 className="fd-widget-label">Attività Recenti</h3>
            <div className="fd-activity-list">
              {stats && stats.upNextTasks.length > 0 ? (
                stats.upNextTasks.slice(0, 5).map((task, index) => (
                  <div
                    key={task.id || index}
                    className="fd-activity-item"
                    onClick={() => navigate(`/freelance/task/${task.id}`)}
                  >
                    <div className="fd-activity-dot" />
                    <div className="fd-activity-body">
                      <div className="fd-activity-text">
                        <strong>{task.title}</strong>
                      </div>
                      <div className="fd-activity-sub">
                        {task.project?.name || 'Progetto'}
                        {task.due_date && (
                          <span className="fd-activity-date">{formatDate(task.due_date)}</span>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight size={12} strokeWidth={1.5} className="fd-activity-arrow" />
                  </div>
                ))
              ) : (
                <div className="fd-activity-empty">
                  <Bell size={14} strokeWidth={1.5} />
                  <span>{t('freelance.no_recent_activity')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelanceDashboardPage;
