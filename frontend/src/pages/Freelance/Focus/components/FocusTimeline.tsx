import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Palette,
  RefreshCw,
  Users,
  Coffee,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Loader2,
  Zap,
  ChevronDown,
} from 'lucide-react';
import type { AgendaItem, CognitiveLoad, FocusSessionSlot, SlotType } from '../../../../types/focus';

interface FocusTimelineProps {
  slots: FocusSessionSlot[];
  agendaItems: AgendaItem[];
  currentTime: string;
  activeSlotId: number | null;
  onSlotClick: (slot: FocusSessionSlot) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

function getSlotColorKey(slot: FocusSessionSlot): string {
  if (slot.slot_type === 'break') return 'break';
  if (slot.slot_type === 'lunch') return 'lunch';
  if (slot.slot_type === 'buffer') return 'buffer';
  if (slot.task?.cognitive_load) return slot.task.cognitive_load;
  return 'task';
}

function getSlotIcon(slot: FocusSessionSlot, size = 12) {
  const key = getSlotColorKey(slot);
  const props = { size, className: 'focus-slot__icon' };
  switch (key as CognitiveLoad | SlotType) {
    case 'deep_work':   return <Brain {...props} style={{ color: '#a78bfa' }} />;
    case 'creative':    return <Palette {...props} style={{ color: '#fb923c' }} />;
    case 'repetitive':  return <RefreshCw {...props} style={{ color: '#9ca3af' }} />;
    case 'meetings':    return <Users {...props} style={{ color: '#60a5fa' }} />;
    case 'admin':       return <Zap {...props} style={{ color: '#a1a1aa' }} />;
    case 'break':       return <Coffee {...props} style={{ color: '#34d399' }} />;
    case 'lunch':       return <UtensilsCrossed {...props} style={{ color: '#fbbf24' }} />;
    default:            return <Clock {...props} style={{ color: 'rgba(255,255,255,0.4)' }} />;
  }
}

// Border-left colors per source
const AGENDA_SOURCE_BORDER: Record<AgendaItem['source'], string> = {
  focus_task:     '#7C3AED',
  crm_task:       '#EA580C',
  crm_pm_task:    '#D97706',
  workspace_task: '#2563EB',
  calendar_event: '#10B981',
};

const SOURCE_LABELS: Record<AgendaItem['source'], string> = {
  focus_task:     'Focus',
  crm_task:       'CRM',
  crm_pm_task:    'CRM PM',
  workspace_task: 'WS',
  calendar_event: 'Cal',
};

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const TIMELINE_START = 8 * 60;  // 08:00
const TIMELINE_END   = 20 * 60; // 20:00
const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;
const PX_PER_MIN = 2;

const FocusTimeline: React.FC<FocusTimelineProps> = ({
  slots,
  agendaItems,
  currentTime,
  activeSlotId,
  onSlotClick,
  onRegenerate,
  regenerating,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const nowMinutes = useMemo(() => parseTime(currentTime), [currentTime]);
  const totalHeight = TIMELINE_RANGE * PX_PER_MIN;

  const hourMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let h = 8; h <= 20; h++) markers.push(h);
    return markers;
  }, []);

  // Agenda items that have a due_time — place them on the timeline
  const timedAgendaItems = useMemo(() =>
    agendaItems.filter(item => item.due_time),
  [agendaItems]);

  // Agenda items without due_time — show as sidebar list
  const untimedAgendaItems = useMemo(() =>
    agendaItems.filter(item => !item.due_time),
  [agendaItems]);

  const handleSlotClick = (slot: FocusSessionSlot) => {
    setExpandedId(prev => (prev === slot.id ? null : slot.id));
    onSlotClick(slot);
  };

  const totalBlocks = slots.length + timedAgendaItems.length;

  return (
    <div className="focus-timeline">
      {/* Header */}
      <div className="focus-timeline__header">
        <div>
          <div className="focus-timeline__date-sub">
            {totalBlocks} blocchi · {untimedAgendaItems.length} task senza orario
          </div>
        </div>
        <button
          className="focus-timeline__regen-btn"
          onClick={onRegenerate}
          disabled={regenerating}
          title="Rigenera giornata con AI"
        >
          {regenerating
            ? <Loader2 size={12} className="focus-spin" />
            : <RefreshCw size={12} />}
          {regenerating ? 'Rigenerando…' : 'Rigenera'}
        </button>
      </div>

      {/* Scrollable timeline */}
      <div className="focus-timeline__scroll">
        <div
          className="focus-timeline__inner"
          style={{ height: `${totalHeight}px`, position: 'relative' }}
        >
          {/* Hour markers */}
          {hourMarkers.map(h => {
            const top = (h * 60 - TIMELINE_START) * PX_PER_MIN;
            return (
              <React.Fragment key={h}>
                <span
                  className="focus-timeline__hour"
                  style={{ top: `${top}px` }}
                >
                  {String(h).padStart(2, '0')}:00
                </span>
                <div
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'rgba(255,255,255,0.05)',
                  }}
                />
              </React.Fragment>
            );
          })}

          {/* Current time line */}
          {nowMinutes >= TIMELINE_START && nowMinutes <= TIMELINE_END && (
            <div
              className="focus-timeline__now-line"
              style={{
                top: `${(nowMinutes - TIMELINE_START) * PX_PER_MIN}px`,
                position: 'absolute',
                left: 0,
                right: 0,
              }}
            >
              <div className="focus-timeline__now-dot" />
              <div className="focus-timeline__now-dash" />
            </div>
          )}

          {/* AI-planned slot blocks */}
          {slots.map(slot => {
            const startMin = parseTime(slot.start_time);
            const endMin   = parseTime(slot.end_time);
            const top    = Math.max((startMin - TIMELINE_START) * PX_PER_MIN, 0);
            const height = Math.max((endMin - startMin) * PX_PER_MIN - 3, 18);
            const colorKey  = getSlotColorKey(slot);
            const isActive  = slot.id === activeSlotId;
            const isExpanded = expandedId === slot.id;

            return (
              <motion.div
                key={`slot-${slot.id}`}
                className={[
                  'focus-slot',
                  `focus-slot--${colorKey}`,
                  isActive   ? 'focus-slot--active'    : '',
                  slot.is_completed ? 'focus-slot--completed' : '',
                ].join(' ')}
                style={{
                  position: 'absolute',
                  top: `${top}px`,
                  left: 0,
                  right: 0,
                  minHeight: `${height}px`,
                }}
                onClick={() => handleSlotClick(slot)}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <div className="focus-slot__header">
                  {getSlotIcon(slot, 11)}
                  <span className="focus-slot__title">{slot.title}</span>
                  {slot.is_completed && (
                    <CheckCircle2 size={11} className="focus-slot__check" />
                  )}
                  {height > 30 && (
                    <ChevronDown
                      size={10}
                      style={{
                        marginLeft: 'auto',
                        opacity: 0.5,
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.18s',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>

                {height > 24 && (
                  <div className="focus-slot__time">
                    <span>{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</span>
                    <span className="focus-slot__duration">· {formatDuration(slot.duration_minutes)}</span>
                  </div>
                )}

                <AnimatePresence>
                  {isExpanded && slot.notes && (
                    <motion.div
                      className="focus-slot__detail"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      {slot.notes}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Timed agenda item overlays */}
          {timedAgendaItems.map((item, idx) => {
            if (!item.due_time) return null;
            const startMin  = parseTime(item.due_time);
            const endMin    = startMin + (item.estimated_minutes ?? 60);
            const top    = Math.max((startMin - TIMELINE_START) * PX_PER_MIN, 0);
            const height = Math.max((endMin - startMin) * PX_PER_MIN - 3, 32);
            const borderColor = AGENDA_SOURCE_BORDER[item.source];

            return (
              <motion.div
                key={item.id}
                className="focus-agenda-block"
                style={{
                  position: 'absolute',
                  top: `${top}px`,
                  left: '55%',
                  right: 0,
                  minHeight: `${height}px`,
                  borderLeftColor: borderColor,
                }}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <div className="focus-agenda-block__header">
                  <span
                    className="focus-agenda-block__badge"
                    style={{ background: `${borderColor}33` }}
                  >
                    {SOURCE_LABELS[item.source]}
                  </span>
                  <span className="focus-agenda-block__title">{item.title}</span>
                </div>
                {height > 28 && (
                  <div className="focus-agenda-block__meta">
                    {item.due_time} · {formatDuration(item.estimated_minutes)}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Empty state */}
          {slots.length === 0 && timedAgendaItems.length === 0 && (
            <div className="focus-state-center" style={{ position: 'absolute', inset: 0 }}>
              <Clock size={24} style={{ opacity: 0.3 }} />
              <span>Nessun blocco pianificato</span>
            </div>
          )}
        </div>

        {/* Untimed agenda items as a compact list below the timeline */}
        {untimedAgendaItems.length > 0 && (
          <div className="focus-timeline__untimed">
            <div className="focus-timeline__untimed-label">Senza orario</div>
            {untimedAgendaItems.map(item => (
              <div
                key={item.id}
                className="focus-timeline__untimed-item"
                style={{ borderLeftColor: AGENDA_SOURCE_BORDER[item.source] }}
              >
                <span
                  className="focus-agenda-block__badge"
                  style={{ background: `${AGENDA_SOURCE_BORDER[item.source]}33` }}
                >
                  {SOURCE_LABELS[item.source]}
                </span>
                <span className="focus-timeline__untimed-title">{item.title}</span>
                {item.project_name && (
                  <span className="focus-timeline__untimed-project">{item.project_name}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
};

export default FocusTimeline;
