import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Palette, RefreshCw, Users, Zap, Calendar,
  ChevronLeft, ChevronRight, AlertTriangle, Plus, Clock,
} from 'lucide-react';
import { focusApi } from '../../../../api/focus';
import type { AgendaItem, CognitiveLoad, FocusTask, WeekPlanDay } from '../../../../types/focus';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FocusWeekViewProps {
  agendaItems: AgendaItem[];
  weekStart:   string; // ISO date of Monday (used as initial value)
}

const DAYS_IT   = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MAX_HOURS = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(isoDate: string, n: number): Date {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIso(d);
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getCognitiveIcon(load: CognitiveLoad, size = 10) {
  const style = { opacity: 0.7, flexShrink: 0 as const };
  switch (load) {
    case 'deep_work':  return <Brain    size={size} style={{ ...style, color: '#a78bfa' }} />;
    case 'creative':   return <Palette  size={size} style={{ ...style, color: '#fb923c' }} />;
    case 'repetitive': return <RefreshCw size={size} style={{ ...style, color: '#9ca3af' }} />;
    case 'meetings':   return <Users    size={size} style={{ ...style, color: '#60a5fa' }} />;
    case 'admin':      return <Zap      size={size} style={{ ...style, color: '#a1a1aa' }} />;
    default:           return <Brain    size={size} style={{ ...style, color: '#a78bfa' }} />;
  }
}

// ─── Week plan data merged with agenda items ──────────────────────────────────

function mergeWeekData(
  weekDays: Array<{ iso: string }>,
  weekPlanDays: WeekPlanDay[],
  agendaItems: AgendaItem[],
): Record<string, { tasks: FocusTask[]; totalMinutes: number }> {
  const result: Record<string, { tasks: FocusTask[]; totalMinutes: number }> = {};

  // Seed from week plan API
  const planDays = Array.isArray(weekPlanDays) ? weekPlanDays : [];
  for (const wpDay of planDays) {
    if (!wpDay?.date) continue;
    result[wpDay.date] = {
      tasks: Array.isArray(wpDay.tasks) ? wpDay.tasks : [],
      totalMinutes: wpDay.total_estimated_minutes ?? 0,
    };
  }

  // Fill from agendaItems for days not in week plan
  for (const day of weekDays) {
    if (!result[day.iso]) {
      const dayItems = agendaItems.filter(i => i.due_date === day.iso);
      result[day.iso] = {
        tasks: dayItems.map(i => ({
          id: parseInt(i.id.replace(/\D/g, '') || '0'),
          title: i.title,
          cognitive_load: i.cognitive_load,
          deadline_type: 'none' as const,
          estimated_minutes: i.estimated_minutes,
          priority_score: i.priority_score ?? 50,
          status: 'pending' as const,
          project_name: i.project_name,
        })),
        totalMinutes: dayItems.reduce((s, i) => s + i.estimated_minutes, 0),
      };
    }
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FocusWeekView: React.FC<FocusWeekViewProps> = ({ agendaItems, weekStart }) => {
  const today        = useMemo(() => toIso(new Date()), []);
  const initialMonday = useMemo(() => getMondayOfWeek(weekStart), [weekStart]);

  const [currentMonday, setCurrentMonday] = useState(initialMonday);
  const [weekPlanDays,  setWeekPlanDays]  = useState<WeekPlanDay[]>([]);
  const [loading,       setLoading]       = useState(false);

  // ── Week navigation ─────────────────────────────────────────────────────────

  const goToPrevWeek = useCallback(() => {
    setCurrentMonday(prev => toIso(addDays(prev, -7)));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentMonday(prev => toIso(addDays(prev, 7)));
  }, []);

  const goToThisWeek = useCallback(() => {
    setCurrentMonday(getMondayOfWeek(toIso(new Date())));
  }, []);

  // ── Days of current week ────────────────────────────────────────────────────

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(currentMonday, i);
      return {
        iso:   toIso(d),
        label: DAYS_IT[i],
        day:   d.getDate(),
        month: d.toLocaleDateString('it-IT', { month: 'short' }),
      };
    }),
  [currentMonday]);

  // ── Load week plan ──────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    focusApi.getWeekPlan(currentMonday)
      .then(data => setWeekPlanDays(data))
      .catch(() => setWeekPlanDays([])) // fallback to agendaItems
      .finally(() => setLoading(false));
  }, [currentMonday]);

  // ── Merge data ──────────────────────────────────────────────────────────────

  const dayData = useMemo(
    () => mergeWeekData(weekDays, weekPlanDays, agendaItems),
    [weekDays, weekPlanDays, agendaItems]
  );

  // ── Week label ──────────────────────────────────────────────────────────────

  const weekLabel = useMemo(() => {
    const from = addDays(currentMonday, 0);
    const to   = addDays(currentMonday, 6);
    return `${from.getDate()} ${from.toLocaleDateString('it-IT', { month: 'short' })} – ${to.getDate()} ${to.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`;
  }, [currentMonday]);

  const isThisWeek = currentMonday === getMondayOfWeek(today);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="focus-week">
      {/* Week navigation header */}
      <div className="fwv-header">
        <button
          type="button"
          className="fwv-nav-btn"
          onClick={goToPrevWeek}
          aria-label="Settimana precedente"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="fwv-header-center">
          <span className="fwv-week-label">{weekLabel}</span>
          {!isThisWeek && (
            <button
              type="button"
              className="fwv-this-week-btn"
              onClick={goToThisWeek}
            >
              Questa settimana
            </button>
          )}
        </div>
        <button
          type="button"
          className="fwv-nav-btn"
          onClick={goToNextWeek}
          aria-label="Settimana successiva"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Grid */}
      <div className="focus-week__grid">
        {weekDays.map(day => {
          const isToday   = day.iso === today;
          const data      = dayData[day.iso] ?? { tasks: [], totalMinutes: 0 };
          const totalHours = data.totalMinutes / 60;
          const isOverloaded = totalHours > MAX_HOURS;

          return (
            <div
              key={day.iso}
              className={`focus-week__col${isToday ? ' focus-week__col--today' : ''}`}
            >
              {/* Day header */}
              <div className="focus-week__day-header">
                <span className="focus-week__day-name">{day.label}</span>
                <span className={`focus-week__day-num${isToday ? ' focus-week__day-num--today' : ''}`}>
                  {day.day}
                </span>
                <span className="focus-week__day-month">{day.month}</span>
                {data.tasks.length > 0 && (
                  <span className="fwv-day-count">{data.tasks.length}</span>
                )}
              </div>

              {/* Tasks */}
              <div className="focus-week__tasks">
                {loading && isToday && (
                  <div className="fwv-loading">
                    <div className="focus-spinner" style={{ width: 14, height: 14 }} />
                  </div>
                )}

                {!loading && data.tasks.length === 0 && (
                  <div className="focus-week__empty">
                    <Calendar size={14} style={{ opacity: 0.2 }} />
                  </div>
                )}

                {data.tasks.map((task, idx) => (
                  <motion.div
                    key={task.id || idx}
                    className="focus-week__card"
                    style={{
                      borderLeftColor: task.priority === 'high' || task.priority_score >= 80
                        ? '#ef4444'
                        : task.priority === 'medium' || task.priority_score >= 40
                          ? '#f59e0b'
                          : '#22c55e',
                    }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.03 }}
                  >
                    <div className="focus-week__card-top">
                      {getCognitiveIcon(task.cognitive_load)}
                      {task.project_name && (
                        <span className="focus-week__card-badge" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          {task.project_name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="focus-week__card-title">{task.title}</div>
                    {task.estimated_minutes > 0 && (
                      <div className="fwv-task-time">
                        <Clock size={8} />
                        {formatMinutes(task.estimated_minutes)}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Day footer: total + warning */}
              {data.tasks.length > 0 && (
                <div className={`fwv-day-footer${isOverloaded ? ' fwv-day-footer--warning' : ''}`}>
                  {isOverloaded && <AlertTriangle size={10} />}
                  <span>{formatMinutes(data.totalMinutes)}</span>
                </div>
              )}

              {/* Add button */}
              <button
                type="button"
                className="fwv-add-btn"
                title={`Aggiungi task per ${day.label} ${day.day}`}
                onClick={() => {
                  // TODO: aprire selezione task dal backlog per questo giorno
                  console.log('Add task for day:', day.iso);
                }}
              >
                <Plus size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FocusWeekView;
