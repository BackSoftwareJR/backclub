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
  Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceApi } from '../../api/freelance';
import { freelanceCrmApi } from '../../api/freelanceCrm';
import { freelanceCalendarApi, type FreelanceCalendarItem } from '../../api/freelanceCalendar';
import type { FreelanceDashboardStats, FreelanceTask } from '../../types/freelance';
import { Calendar, Video, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceDashboardTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceDashboardPage.css';

// Mini Calendar Component
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
  const days = [];
  
  // Add empty days at the start
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Add days of the month
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

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                     'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const dayNames = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];

  return (
    <div className="freelance-mini-calendar">
      <div className="freelance-mini-calendar-header">
        <button 
          className="freelance-mini-calendar-nav"
          onClick={handlePrevMonth}
          aria-label="Mese precedente"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="freelance-mini-calendar-title">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button 
          className="freelance-mini-calendar-nav"
          onClick={handleNextMonth}
          aria-label="Mese successivo"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="freelance-mini-calendar-grid">
        {dayNames.map(day => (
          <div key={day} className="freelance-mini-calendar-day-name">{day}</div>
        ))}
        {days.map((date, index) => (
          <div
            key={index}
            className={`freelance-mini-calendar-day ${!date ? 'empty' : ''} ${isToday(date) ? 'today' : ''} ${hasTaskOnDay(date) ? 'has-task' : ''}`}
          >
            {date && (
              <>
                <span className="freelance-mini-calendar-day-number">{date.getDate()}</span>
                {hasTaskOnDay(date) && <span className="freelance-mini-calendar-day-dot" />}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

type TaskTab = 'oggi' | 'prossimi' | 'in-revisione' | 'scaduti';

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
          // Vista CRM: dati di TUTTI (backend dedicato)
          const [dashboardData, calendarData] = await Promise.all([
            freelanceCrmApi.getDashboardData(crmDepartmentCode),
            freelanceCrmApi.getCalendarItems(crmDepartmentCode),
          ]);
          setStats(dashboardData.stats ?? null);
          setTasks(dashboardData.tasks ?? []);
          setCalendarItems(Array.isArray(calendarData.events) ? calendarData.events : []);
        } else {
          // Vista normale: solo i miei dati
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
      return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    }
  };

  // Get calendar items for today
  const getTodayCalendarItems = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return calendarItems.filter(item => {
      if (item.completed_at) return false; // Skip completed items
      const startDate = new Date(item.start_time);
      startDate.setHours(0, 0, 0, 0);
      return startDate.getTime() === today.getTime();
    });
  };

  // Get calendar items for upcoming (future dates)
  const getUpcomingCalendarItems = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return calendarItems.filter(item => {
      if (item.completed_at) return false; // Skip completed items
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
      // Sort by: overdue first, then by due_date
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  };

  // Get combined items for "Oggi" tab (tasks + calendar items)
  const getTodayItems = () => {
    const todayTasks = getFilteredTasks();
    const todayCalendarItems = getTodayCalendarItems();
    
    // Combine and sort by time
    const combined = [
      ...todayTasks.map(task => ({ type: 'task' as const, item: task })),
      ...todayCalendarItems.map(item => ({ type: 'calendar' as const, item }))
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
      // Tasks first, then calendar items
      return a.type === 'task' ? -1 : 1;
    });
  };

  const getCalendarItemIcon = (type: FreelanceCalendarItem['type']) => {
    switch (type) {
      case 'event':
        return <Calendar size={16} />;
      case 'call':
        return <Video size={16} />;
      case 'deadline':
        return <AlertCircle size={16} />;
      case 'reminder':
        return <FileText size={16} />;
      default:
        return <Calendar size={16} />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
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
        prevTasks.map(t =>
          t.id === task.id ? { ...t, status: newStatus } : t
        )
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
      <div className="freelance-loading">
        <div className="freelance-spinner"></div>
      </div>
    );
  }

  return (
    <div className="freelance-dashboard-cockpit">
      <GuideTour steps={freelanceDashboardTourSteps} tourId="freelance-dashboard-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      {/* Header - Light Touch */}
      <div className="freelance-dashboard-header">
        <div className="freelance-dashboard-header-left">
          <h1 className="freelance-dashboard-greeting">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Freelance'}
          </h1>
        </div>
        <div className="freelance-dashboard-header-right">
          <div 
            className="freelance-kpi-stat"
            onClick={() => navigate('/freelance/progetti')}
          >
            <FolderKanban size={14} />
            <span>{stats?.activeProjects || 0} Progetto{stats?.activeProjects !== 1 ? 'i' : ''}</span>
          </div>
          <div className="freelance-kpi-separator">|</div>
          <div 
            className="freelance-kpi-stat"
            onClick={() => navigate('/freelance/task')}
          >
            <CheckSquare size={14} />
            <span>{tasksTodayCount} Task Oggi</span>
          </div>
          <div className="freelance-kpi-separator">|</div>
          <div 
            className="freelance-kpi-stat"
            onClick={() => navigate('/freelance/chat')}
          >
            <MessageSquare size={14} />
            <span>{stats?.unreadMessages || 0} Messaggi</span>
          </div>
        </div>
      </div>

      {/* Main Workspace - 12 Column Grid */}
      <div className="freelance-workspace">
        {/* LEFT PANEL - Task List (8-9 cols) */}
        <div className="freelance-workspace-left">
          <div className="freelance-task-section">
            {/* Tabs */}
            <div className="freelance-task-tabs">
              <button
                className={`freelance-task-tab ${activeTab === 'oggi' ? 'active' : ''}`}
                onClick={() => setActiveTab('oggi')}
              >
                Oggi
              </button>
              <button
                className={`freelance-task-tab ${activeTab === 'prossimi' ? 'active' : ''}`}
                onClick={() => setActiveTab('prossimi')}
              >
                Prossimi
                {upcomingTotalCount > 0 && (
                  <span className="freelance-task-tab-badge freelance-task-tab-badge-orange">{upcomingTotalCount}</span>
                )}
              </button>
              <button
                className={`freelance-task-tab ${activeTab === 'in-revisione' ? 'active' : ''}`}
                onClick={() => setActiveTab('in-revisione')}
              >
                In Revisione
              </button>
              <button
                className={`freelance-task-tab ${activeTab === 'scaduti' ? 'active' : ''}`}
                onClick={() => setActiveTab('scaduti')}
              >
                Scaduti
                {scadutiCount > 0 && (
                  <span className="freelance-task-tab-badge freelance-task-tab-badge-red">{scadutiCount}</span>
                )}
              </button>
            </div>

            {/* Messaggio task scadute (solo in vista Oggi) */}
            {activeTab === 'oggi' && scadutiCount > 0 && (
              <button
                type="button"
                className="freelance-scaduti-banner"
                onClick={() => setActiveTab('scaduti')}
              >
                <AlertCircle size={18} />
                <span>Hai delle task scadute. Clicca per vederle.</span>
              </button>
            )}

            {/* Task List */}
            {todayItems.length > 0 || (activeTab !== 'oggi' && filteredTasks.length > 0) ? (
              <div className="freelance-task-list">
                {activeTab === 'oggi' ? (
                  // Show combined tasks + calendar items for "Oggi"
                  todayItems.map((item) => {
                    if (item.type === 'task') {
                      const task = item.item as FreelanceTask;
                      const dueDateFormatted = formatDate(task.due_date);
                      const isOverdue = task.isOverdue;
                      
                      return (
                        <div
                          key={`task-${task.id}`}
                          className="freelance-task-row"
                          onClick={() => navigate(`/freelance/task/${task.id}`)}
                        >
                          <button
                            className="freelance-task-checkbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskToggle(task);
                            }}
                            aria-label={task.status === 'completed' ? 'Segna come non completato' : 'Segna come completato'}
                          >
                            {task.status === 'completed' ? (
                              <CheckSquare size={18} className="freelance-task-checkbox-checked" />
                            ) : (
                              <Circle size={18} className="freelance-task-checkbox-unchecked" />
                            )}
                          </button>
                          <div className="freelance-task-content">
                            <div className="freelance-task-title">{task.title}</div>
                            {task.project && (
                              <div className="freelance-task-meta">
                                <span className="freelance-task-project">{task.project.name}</span>
                              </div>
                            )}
                          </div>
                          {dueDateFormatted && (
                            <div className={`freelance-task-date-badge ${isOverdue ? 'overdue' : ''}`}>
                              {dueDateFormatted}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Calendar item
                      const calItem = item.item as FreelanceCalendarItem;
                      const timeStr = formatTime(calItem.start_time);
                      
                      return (
                        <div
                          key={`calendar-${calItem.id}`}
                          className="freelance-task-row freelance-calendar-item-row"
                          onClick={() => navigate('/freelance/calendario')}
                        >
                          <div className="freelance-calendar-item-icon">
                            {getCalendarItemIcon(calItem.type)}
                          </div>
                          <div className="freelance-task-content">
                            <div className="freelance-task-title">{calItem.title}</div>
                            <div className="freelance-task-meta">
                              <span className="freelance-task-project">
                                {calItem.type === 'event' ? 'Evento' : 
                                 calItem.type === 'call' ? 'Chiamata' :
                                 calItem.type === 'deadline' ? 'Scadenza' :
                                 calItem.type === 'reminder' ? 'Promemoria' : 'Attività'}
                              </span>
                            </div>
                          </div>
                          <div className="freelance-task-date-badge">
                            {timeStr}
                          </div>
                        </div>
                      );
                    }
                  })
                ) : (
                  // Show only tasks for other tabs (Prossimi, In Revisione, Scaduti)
                  filteredTasks.map((task) => {
                    const dueDateFormatted = formatDate(task.due_date);
                    const isOverdue = task.isOverdue;
                    const isScadutiRow = activeTab === 'scaduti';
                    
                    return (
                      <div
                        key={task.id}
                        className={`freelance-task-row ${isScadutiRow ? 'freelance-task-row-overdue' : ''}`}
                        onClick={() => navigate(`/freelance/task/${task.id}`)}
                      >
                        <button
                          className="freelance-task-checkbox"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskToggle(task);
                          }}
                          aria-label={task.status === 'completed' ? 'Segna come non completato' : 'Segna come completato'}
                        >
                          {task.status === 'completed' ? (
                            <CheckSquare size={18} className="freelance-task-checkbox-checked" />
                          ) : (
                            <Circle size={18} className="freelance-task-checkbox-unchecked" />
                          )}
                        </button>
                        <div className="freelance-task-content">
                          <div className="freelance-task-title">{task.title}</div>
                          {task.project && (
                            <div className="freelance-task-meta">
                              <span className="freelance-task-project">{task.project.name}</span>
                            </div>
                          )}
                        </div>
                        {dueDateFormatted && (
                          <div className={`freelance-task-date-badge ${isOverdue || isScadutiRow ? 'overdue' : ''}`}>
                            {isScadutiRow ? `Scaduto il ${dueDateFormatted}` : dueDateFormatted}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="freelance-empty-state">
                <div className="freelance-empty-state-icon">
                  <CheckCircle2 size={48} strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="freelance-empty-state-title">{t('freelance.no_task')}</h3>
                <p className="freelance-empty-state-message">Tutto a posto.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Widget Stack (3-4 cols) */}
        <div className="freelance-workspace-right">
          {/* Mini Calendar Widget */}
          <div className="freelance-widget">
            <MiniCalendar tasks={tasks} />
          </div>

          {/* Recent Activity Widget */}
          <div className="freelance-widget">
            <h3 className="freelance-widget-title">Attività Recenti</h3>
            <div className="freelance-activity-list">
              {stats && stats.upNextTasks.length > 0 ? (
                stats.upNextTasks.slice(0, 5).map((task, index) => (
                  <div key={task.id || index} className="freelance-activity-item">
                    <div className="freelance-activity-text">
                      Task <strong>{task.title}</strong> in {task.project?.name || 'Progetto'}
                    </div>
                    <div className="freelance-activity-time">
                      {task.due_date && formatDate(task.due_date)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="freelance-activity-empty">
                  <Bell size={14} />
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
