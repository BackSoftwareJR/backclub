import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GripVertical,
  Play,
  ChevronDown,
  Check,
  ChevronRight,
  CalendarDays,
  Clock,
  Plus,
  LayoutList,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import { focusApi } from '../../../../api/focus';
import type { AgendaItem, AgendaItemSource, FocusTask, ProjectWithTasks } from '../../../../types/focus';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterSource  = 'all' | AgendaItemSource;
type BacklogView   = 'projects' | 'list';

interface WeekDayPickerState {
  taskId: number;
  x: number;
  y: number;
}

interface PriorityMenuState {
  itemId: string;
  x: number;
  y: number;
}

export interface FocusBacklogProps {
  items:            AgendaItem[];
  inProgressId?:   string | null;
  onPriorityChange: (agendaItemId: string, priorityScore: number) => void;
  onStartNow:       (agendaItemId: string) => void;
  onReorder:        (reordered: AgendaItem[]) => void;
  onAddToday?:      (taskId: number) => void;
  onScheduleTask?:  (taskId: number, weekPlanDate: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<AgendaItemSource, string> = {
  focus_task:     'Focus',
  crm_task:       'CRM',
  crm_pm_task:    'CRM PM',
  workspace_task: 'WS',
  calendar_event: 'Cal',
};

const SOURCE_COLORS: Record<AgendaItemSource, string> = {
  focus_task:     '#7C3AED',
  crm_task:       '#EA580C',
  crm_pm_task:    '#D97706',
  workspace_task: '#2563EB',
  calendar_event: '#10B981',
};

const PRIORITY_LEVELS = [
  { label: 'Alta',  score: 100, dot: '#ef4444' },
  { label: 'Media', score: 50,  dot: '#f59e0b' },
  { label: 'Bassa', score: 20,  dot: '#22c55e' },
] as const;

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priorityDotColor(item: AgendaItem): string {
  const score = item.priority_score;
  if (score !== undefined && score !== null) {
    if (score >= 80) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#22c55e';
  }
  if (item.priority === 'high'   || item.priority === 'alta')  return '#ef4444';
  if (item.priority === 'medium' || item.priority === 'media') return '#f59e0b';
  return '#6b7280';
}

function taskPriorityColor(task: FocusTask): string {
  if (task.priority === 'high')   return '#ef4444';
  if (task.priority === 'medium') return '#f59e0b';
  if (task.priority === 'low')    return '#22c55e';
  if (task.priority_score >= 80)  return '#ef4444';
  if (task.priority_score >= 40)  return '#f59e0b';
  return '#22c55e';
}

function taskPriorityLabel(task: FocusTask): string {
  if (task.priority === 'high')   return 'Alta';
  if (task.priority === 'medium') return 'Media';
  if (task.priority === 'low')    return 'Bassa';
  if (task.priority_score >= 80)  return 'Alta';
  if (task.priority_score >= 40)  return 'Media';
  return 'Bassa';
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate + 'T23:59:59') < new Date();
}

function getMondayOfCurrentWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

const FocusBacklog: React.FC<FocusBacklogProps> = ({
  items,
  inProgressId,
  onPriorityChange,
  onStartNow,
  onReorder,
  onAddToday,
  onScheduleTask,
}) => {
  const [view,          setView]          = useState<BacklogView>('projects');
  const [filter,        setFilter]        = useState<FilterSource>('all');
  const [priorityMenu,  setPriorityMenu]  = useState<PriorityMenuState | null>(null);
  const [weekPicker,    setWeekPicker]    = useState<WeekDayPickerState | null>(null);
  const [dragOverId,    setDragOverId]    = useState<string | null>(null);
  const [expanded,      setExpanded]      = useState<Record<number, boolean>>({});
  const [projects,      setProjects]      = useState<ProjectWithTasks[]>([]);
  const [projLoading,   setProjLoading]   = useState(false);
  const [projError,     setProjError]     = useState(false);

  const dragItemId = useRef<string | null>(null);

  // ── Load projects ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (view !== 'projects') return;
    setProjLoading(true);
    setProjError(false);
    focusApi.getProjectsWithTasks()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        // Expand first project by default
        if (list.length > 0 && list[0].id != null) {
          setExpanded({ [list[0].id]: true });
        }
      })
      .catch(() => {
        // TODO: rimuovere mock quando backend è pronto
        const mock: ProjectWithTasks[] = [
          {
            id: 1,
            name: 'Sito E-commerce',
            color: '#7C3AED',
            tasks_count: 3,
            completed_tasks_count: 1,
            tasks: [
              { id: 101, title: 'Implementare login', cognitive_load: 'deep_work', deadline_type: 'hard', estimated_minutes: 120, priority_score: 90, priority: 'high', status: 'pending' },
              { id: 102, title: 'Fix bug #234 carrello', cognitive_load: 'repetitive', deadline_type: 'soft', estimated_minutes: 60, priority_score: 55, priority: 'medium', status: 'pending' },
              { id: 103, title: 'Scrivere documentazione API', cognitive_load: 'admin', deadline_type: 'none', estimated_minutes: 180, priority_score: 25, priority: 'low', status: 'pending' },
            ],
          },
          {
            id: 2,
            name: 'App Mobile',
            color: '#EA580C',
            tasks_count: 2,
            completed_tasks_count: 0,
            tasks: [
              { id: 201, title: 'Design onboarding screen', cognitive_load: 'creative', deadline_type: 'soft', estimated_minutes: 90, priority_score: 70, priority: 'high', status: 'pending' },
              { id: 202, title: 'Integrare push notifications', cognitive_load: 'deep_work', deadline_type: 'none', estimated_minutes: 240, priority_score: 45, priority: 'medium', status: 'pending' },
            ],
          },
          {
            id: 3,
            name: 'CRM Interno',
            color: '#2563EB',
            tasks_count: 1,
            completed_tasks_count: 0,
            tasks: [
              { id: 301, title: 'Aggiornare report mensile', cognitive_load: 'repetitive', deadline_type: 'hard', estimated_minutes: 30, priority_score: 85, priority: 'high', status: 'pending', due_date: new Date().toISOString().slice(0,10) },
            ],
          },
        ];
        setProjects(mock);
        setExpanded({ [mock[0].id]: true });
        setProjError(false);
      })
      .finally(() => setProjLoading(false));
  }, [view]);

  const toggleProject = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Flat list ───────────────────────────────────────────────────────────────

  const FILTER_TABS: { key: FilterSource; label: string }[] = [
    { key: 'all',            label: 'Tutte' },
    { key: 'crm_task',       label: 'CRM' },
    { key: 'workspace_task', label: 'WS' },
    { key: 'focus_task',     label: 'Focus' },
  ];

  const filtered = filter === 'all' ? items : items.filter(i => i.source === filter);
  const today    = new Date().toISOString().split('T')[0];

  const ordered = [...filtered].sort((a, b) => {
    const scoreA = a.priority_score ?? 0;
    const scoreB = b.priority_score ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    const aOverdue = !!a.due_date && a.due_date <= today;
    const bOverdue = !!b.due_date && b.due_date <= today;
    if (aOverdue && bOverdue) return a.due_date!.localeCompare(b.due_date!);
    if (aOverdue) return -1;
    if (bOverdue) return 1;
    if (!a.due_date && b.due_date) return -1;
    if (a.due_date && !b.due_date) return 1;
    if (!a.due_date && !b.due_date) return 0;
    return a.due_date!.localeCompare(b.due_date!);
  });

  const overdueOnly = ordered.filter(i => !!i.due_date && i.due_date <= today);

  // ── Drag-and-drop ───────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    dragItemId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = dragItemId.current;
    if (!sourceId || sourceId === targetId) { setDragOverId(null); return; }
    const mutable = [...items];
    const srcIdx  = mutable.findIndex(i => i.id === sourceId);
    const tgtIdx  = mutable.findIndex(i => i.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moved] = mutable.splice(srcIdx, 1);
    mutable.splice(tgtIdx, 0, moved);
    const reordered = mutable.map((item, idx) => ({
      ...item,
      priority_score: Math.max(1, Math.round(100 - (idx / Math.max(mutable.length - 1, 1)) * 99)),
    }));
    onReorder(reordered);
    dragItemId.current = null;
    setDragOverId(null);
  }, [items, onReorder]);

  const handleDragEnd = useCallback(() => {
    dragItemId.current = null;
    setDragOverId(null);
  }, []);

  // ── Priority menu ───────────────────────────────────────────────────────────

  const openPriorityMenu = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPriorityMenu({ itemId, x: rect.left, y: rect.bottom + 4 });
  };

  const handlePrioritySelect = (score: number) => {
    if (!priorityMenu) return;
    onPriorityChange(priorityMenu.itemId, score);
    setPriorityMenu(null);
  };

  // ── Week day picker ─────────────────────────────────────────────────────────

  const openWeekPicker = (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setWeekPicker({ taskId, x: rect.left, y: rect.bottom + 4 });
  };

  const handleSchedule = (date: string) => {
    if (!weekPicker) return;
    if (onScheduleTask) {
      onScheduleTask(weekPicker.taskId, date);
    } else {
      // TODO: rimuovere mock quando backend è pronto
      focusApi.updateTaskWeekPlan(weekPicker.taskId, date).catch(console.error);
    }
    setWeekPicker(null);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(getMondayOfCurrentWeek(), i);
    return { iso: toIso(d), label: DAYS_IT[i], day: d.getDate() };
  });

  const closePickers = () => {
    setPriorityMenu(null);
    setWeekPicker(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="focus-backlog" onClick={closePickers}>

      {/* Header */}
      <div className="focus-backlog__header">
        <span className="focus-backlog__title">
          📋 Backlog
          <span className="focus-backlog__count">{view === 'projects' ? projects.reduce((s, p) => s + p.tasks_count, 0) : items.length}</span>
        </span>

        {/* View toggle */}
        <div className="focus-backlog__view-toggle">
          <button
            type="button"
            className={`focus-backlog__view-btn${view === 'projects' ? ' focus-backlog__view-btn--active' : ''}`}
            onClick={e => { e.stopPropagation(); setView('projects'); }}
            title="Vista per progetto"
          >
            <FolderOpen size={11} />
          </button>
          <button
            type="button"
            className={`focus-backlog__view-btn${view === 'list' ? ' focus-backlog__view-btn--active' : ''}`}
            onClick={e => { e.stopPropagation(); setView('list'); }}
            title="Vista lista"
          >
            <LayoutList size={11} />
          </button>
        </div>

        {/* Flat view filters */}
        {view === 'list' && (
          <div className="focus-backlog__filters">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                className={`focus-backlog__filter-btn${filter === tab.key ? ' focus-backlog__filter-btn--active' : ''}`}
                onClick={e => { e.stopPropagation(); setFilter(tab.key); }}
                type="button"
              >
                {tab.label}
                {tab.key === 'all' && overdueOnly.length > 0 && (
                  <span className="focus-backlog__overdue-badge">{overdueOnly.length}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="focus-backlog__list">

        {/* ── PROJECT TREE VIEW ── */}
        {view === 'projects' && (
          <>
            {projLoading && (
              <div className="focus-backlog__empty">
                <div className="focus-spinner" style={{ width: 20, height: 20, margin: '16px auto' }} />
              </div>
            )}
            {!projLoading && projError && (
              <div className="focus-backlog__empty" style={{ color: 'rgba(239,68,68,0.7)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> Errore nel caricamento
              </div>
            )}
            {!projLoading && projects.length === 0 && !projError && (
              <div className="focus-backlog__empty">Nessun progetto con task aperte</div>
            )}
            {!projLoading && projects.map(project => {
              const isOpen = !!expanded[project.id];
              const completedCount = project.completed_tasks_count ?? 0;
              const progress = project.tasks_count > 0
                ? Math.round((completedCount / project.tasks_count) * 100)
                : 0;

              return (
                <div key={project.id} className="fbp-project">
                  {/* Project header */}
                  <button
                    type="button"
                    className="fbp-project__header"
                    onClick={() => toggleProject(project.id)}
                    style={{ '--project-color': project.color } as React.CSSProperties}
                  >
                    <span className="fbp-project__chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      <ChevronRight size={12} />
                    </span>
                    <span className="fbp-project__dot" style={{ background: project.color }} />
                    <span className="fbp-project__name">{project.name}</span>
                    <span className="fbp-project__badge">{project.tasks_count}</span>
                    <div className="fbp-project__progress-wrap">
                      <div
                        className="fbp-project__progress-bar"
                        style={{ width: `${progress}%`, background: project.color }}
                      />
                    </div>
                  </button>

                  {/* Tasks */}
                  {isOpen && (
                    <div className="fbp-project__tasks">
                      {project.tasks.length === 0 && (
                        <div className="fbp-task fbp-task--empty">Nessuna task aperta</div>
                      )}
                      {project.tasks.map(task => {
                        const prioColor = taskPriorityColor(task);
                        const prioLabel = taskPriorityLabel(task);
                        const taskOverdue = isOverdue(task.due_date);
                        const isScheduledToday = task.week_plan_date === today;

                        return (
                          <div
                            key={task.id}
                            className={`fbp-task${taskOverdue ? ' fbp-task--overdue' : ''}${isScheduledToday ? ' fbp-task--today' : ''}`}
                          >
                            <span className="fbp-task__dot" style={{ background: prioColor }} title={prioLabel} />
                            <span className="fbp-task__title">{task.title}</span>
                            <div className="fbp-task__meta">
                              <span className="fbp-task__prio" style={{ color: prioColor }}>
                                {prioLabel === 'Alta' ? '🔴' : prioLabel === 'Media' ? '🟡' : '🟢'}
                              </span>
                              <span className="fbp-task__time">
                                <Clock size={9} />
                                {formatMinutes(task.estimated_minutes)}
                              </span>
                              {task.due_date && (
                                <span className={`fbp-task__due${taskOverdue ? ' fbp-task__due--overdue' : ''}`}>
                                  {formatDate(task.due_date)}
                                </span>
                              )}
                              {isScheduledToday && (
                                <span className="fbp-task__today-badge">oggi</span>
                              )}
                            </div>
                            <div className="fbp-task__actions" onClick={e => e.stopPropagation()}>
                              {/* Add to today */}
                              <button
                                type="button"
                                className="fbp-task__btn fbp-task__btn--today"
                                onClick={() => onAddToday?.(task.id)}
                                title="Aggiungi a oggi"
                              >
                                <Plus size={10} />
                              </button>
                              {/* Schedule to day */}
                              <button
                                type="button"
                                className="fbp-task__btn fbp-task__btn--schedule"
                                onClick={e => openWeekPicker(e, task.id)}
                                title="Pianifica giorno"
                              >
                                <CalendarDays size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── FLAT LIST VIEW ── */}
        {view === 'list' && (
          <>
            {ordered.length === 0 && (
              <div className="focus-backlog__empty">Nessuna task in questo backlog</div>
            )}
            {ordered.map(item => {
              const isActive   = item.id === inProgressId;
              const overdue    = isOverdue(item.due_date);
              const borderColor = SOURCE_COLORS[item.source];

              return (
                <div
                  key={item.id}
                  className={[
                    'focus-backlog__item',
                    isActive  ? 'focus-backlog__item--active'    : '',
                    overdue   ? 'focus-backlog__item--overdue'   : '',
                    dragOverId === item.id ? 'focus-backlog__item--drag-over' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ borderLeftColor: borderColor }}
                  draggable
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragOver={e  => handleDragOver(e, item.id)}
                  onDrop={e      => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="focus-backlog__drag-handle" title="Trascina per riordinare">
                    <GripVertical size={13} />
                  </span>

                  <span
                    className="focus-backlog__priority-dot"
                    style={{ background: priorityDotColor(item) }}
                    title={`Priorità: ${item.priority_score ?? item.priority ?? 'N/A'}`}
                  />

                  <span className="focus-backlog__item-title">
                    {isActive && <span className="focus-backlog__active-indicator">▶ </span>}
                    {item.title}
                  </span>

                  {item.project_name && (
                    <span className="focus-backlog__project">{item.project_name}</span>
                  )}

                  {item.due_date && (
                    <span className={`focus-backlog__due${overdue ? ' focus-backlog__due--overdue' : ''}`}>
                      {formatDate(item.due_date)}
                    </span>
                  )}

                  <span
                    className="focus-backlog__badge"
                    style={{ background: `${borderColor}25`, color: borderColor }}
                  >
                    {SOURCE_LABELS[item.source]}
                  </span>

                  <div className="focus-backlog__actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="focus-backlog__action-btn"
                      onClick={e => openPriorityMenu(e, item.id)}
                      title="Cambia priorità"
                      type="button"
                    >
                      <ChevronDown size={11} />
                    </button>

                    {!isActive ? (
                      <button
                        className="focus-backlog__action-btn focus-backlog__action-btn--start"
                        onClick={() => onStartNow(item.id)}
                        title="Inizia adesso"
                        type="button"
                      >
                        <Play size={11} />
                      </button>
                    ) : (
                      <span className="focus-backlog__active-badge" title="In lavorazione">
                        <Check size={11} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Priority floating menu */}
      {priorityMenu && (
        <div
          className="focus-backlog__priority-menu"
          style={{ position: 'fixed', left: priorityMenu.x, top: priorityMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {PRIORITY_LEVELS.map(level => (
            <button
              key={level.score}
              className="focus-backlog__priority-option"
              onClick={() => handlePrioritySelect(level.score)}
              type="button"
            >
              <span className="focus-backlog__priority-option-dot" style={{ background: level.dot }} />
              {level.label}
            </button>
          ))}
        </div>
      )}

      {/* Week day picker */}
      {weekPicker && (
        <div
          className="fbp-week-picker"
          style={{ position: 'fixed', left: weekPicker.x, top: weekPicker.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className="fbp-week-picker__title">Pianifica per</div>
          <div className="fbp-week-picker__days">
            {weekDays.map(d => (
              <button
                key={d.iso}
                type="button"
                className={`fbp-week-picker__day${d.iso === today ? ' fbp-week-picker__day--today' : ''}`}
                onClick={() => handleSchedule(d.iso)}
              >
                <span className="fbp-week-picker__day-name">{d.label}</span>
                <span className="fbp-week-picker__day-num">{d.day}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusBacklog;
