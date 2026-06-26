import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  X,
  Sparkles,
  Bot,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Paperclip,
  Settings2,
  Eye,
  EyeOff,
  RotateCcw,
  GripVertical,
  CheckSquare,
  Clock,
  Timer,
  Wand2,
} from 'lucide-react';
import type { FreelanceTask } from '../../../types/freelance';
import {
  useBentoStore,
  type WidgetConfig,
  type TemplateId,
  LAYOUT_TEMPLATES,
  BENTO_GRID_COLS,
  BENTO_GRID_ROW_PX,
} from '../../../stores/useBentoStore';
import { taskDetailAiApi } from '../../../api/taskDetailAi';
import type { IntentType } from '../../../api/taskDetailAi';
import BentoWidget from './components/BentoWidget';
import TaskHeaderWidget from './components/TaskHeaderWidget';
import AICopilotWidget from './components/AICopilotWidget';
import AIAssistantWidget from './components/AIAssistantWidget';
import PMActionsWidget from './components/PMActionsWidget';
import ActivityWidget from './components/ActivityWidget';
import NotesWidget from './components/NotesWidget';
import FilesWidget from './components/FilesWidget';
import ChecklistWidget from './components/ChecklistWidget';
import ClockWidget from './components/ClockWidget';
import FocusTimerWidget from './components/FocusTimerWidget';
import WorkspaceAgentWidget from './components/WorkspaceAgentWidget';

interface TaskBentoDashboardProps {
  projectId: number;
  taskId: number;
  task: FreelanceTask;
  isPmView?: boolean;
  onPmComplete?: () => void;
  onPmEdit?: () => void;
  onPmReassign?: () => void;
  onPmChangeDeadline?: () => void;
  onPmDelete?: () => void;
  onTakeCharge?: () => void;
  onStartWork?: () => void;
  lifecycleLoading?: boolean;
  onAttachmentChange?: () => void;
}

// ─── Widget metadata ─────────────────────────────────────────────────────────

const WIDGET_META: Record<string, { title: string; icon: React.ReactNode }> = {
  header:    { title: 'Dettaglio Task', icon: <LayoutDashboard size={12} /> },
  copilot:   { title: 'AI Copilot',     icon: <Sparkles size={12} /> },
  assistant: { title: 'AI Assistant',   icon: <Bot size={12} /> },
  pm:        { title: 'Azioni PM',      icon: <Settings2 size={12} /> },
  activity:  { title: 'Attività',       icon: <MessageSquare size={12} /> },
  notes:     { title: 'Note',           icon: <FileText size={12} /> },
  files:     { title: 'File',           icon: <Paperclip size={12} /> },
  checklist: { title: 'Checklist',      icon: <CheckSquare size={12} /> },
  clock:     { title: 'Orologio',       icon: <Clock size={12} /> },
  timer:     { title: 'Focus Timer',    icon: <Timer size={12} /> },
  agent:     { title: 'AI Agent',       icon: <Bot size={12} /> },
};

// Fine-grained grid constants for custom mode
const GRID_COLS    = BENTO_GRID_COLS;
const GRID_ROW_PX  = BENTO_GRID_ROW_PX;
const CUSTOM_GAP   = 10;

// ─── Resize handle ───────────────────────────────────────────────────────────

interface ResizeHandleProps {
  widgetId: string;
  colSpan: number;
  rowSpan: number;
  getCellSize: () => { w: number; h: number };
  onResize: (id: string, col: number, row: number) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  widgetId,
  colSpan,
  rowSpan,
  getCellSize,
  onResize,
}) => {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;

      const onMove = (mv: PointerEvent) => {
        const { w: cw, h: ch } = getCellSize();
        const dc = Math.round((mv.clientX - startX) / cw);
        const dr = Math.round((mv.clientY - startY) / ch);
        const newCol = Math.max(4, Math.min(GRID_COLS, colSpan + dc));
        const newRow = Math.max(12, rowSpan + dr);
        onResize(widgetId, newCol, newRow);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [widgetId, colSpan, rowSpan, getCellSize, onResize],
  );

  return (
    <div
      className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-20 group"
      onPointerDown={handlePointerDown}
      title="Ridimensiona"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        className="absolute bottom-1.5 right-1.5 text-neutral-500 group-hover:text-blue-400 transition-colors"
        fill="currentColor"
      >
        <circle cx="8" cy="8" r="1.2" />
        <circle cx="5" cy="8" r="1.2" />
        <circle cx="8" cy="5" r="1.2" />
      </svg>
    </div>
  );
};

// ─── Span stepper (col / row +/- buttons in edit mode) ───────────────────────
// Width step: 1 col = 1/24 of container width
// Height step: 1 row = 5px; coarse step (Shift+click): 10 rows = 50px

interface SpanStepperProps {
  kind: 'col' | 'row';
  value: number;
  min: number;
  max?: number;
  onChange: (v: number) => void;
}

const SpanStepper: React.FC<SpanStepperProps> = ({ kind, value, min, max, onChange }) => {
  const step = kind === 'row' ? 1 : 1; // both step by 1 unit
  const coarseStep = kind === 'row' ? 10 : 3; // shift-click jumps

  const handleClick = (dir: 1 | -1, e: React.MouseEvent) => {
    const s = e.shiftKey ? coarseStep : step;
    const next = value + dir * s;
    const clamped = Math.max(min, max !== undefined ? Math.min(max, next) : next);
    onChange(clamped);
  };

  const label = kind === 'col'
    ? `${Math.round((value / GRID_COLS) * 100)}%`
    : `${value * GRID_ROW_PX}px`;

  const fullLabel = kind === 'col' ? 'W' : 'H';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', minWidth: 10 }}>{fullLabel}</span>
      <button
        type="button"
        onClick={(e) => handleClick(-1, e)}
        disabled={value <= min}
        style={{
          width: 16, height: 16, fontSize: 13, borderRadius: 4, border: 'none',
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
          cursor: value > min ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, opacity: value <= min ? 0.3 : 1,
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { if (value > min) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
        title={`−1 (Shift: −${coarseStep})`}
      >−</button>
      <span style={{
        fontSize: 9, color: 'rgba(255,255,255,0.55)', minWidth: 32, textAlign: 'center',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em',
      }}>
        {label}
      </span>
      <button
        type="button"
        onClick={(e) => handleClick(1, e)}
        disabled={max !== undefined && value >= max}
        style={{
          width: 16, height: 16, fontSize: 13, borderRadius: 4, border: 'none',
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
          cursor: (max === undefined || value < max) ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, opacity: (max !== undefined && value >= max) ? 0.3 : 1,
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
        title={`+1 (Shift: +${coarseStep})`}
      >+</button>
    </div>
  );
};

// ─── Sortable widget (custom mode) ───────────────────────────────────────────

interface SortableWidgetProps {
  widget: WidgetConfig;
  isEditMode: boolean;
  onHide: () => void;
  onResize: (id: string, col: number, row: number) => void;
  getCellSize: () => { w: number; h: number };
  children: React.ReactNode;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({
  widget,
  isEditMode,
  onHide,
  onResize,
  getCellSize,
  children,
}) => {
  const meta = WIDGET_META[widget.type] ?? { title: widget.id, icon: <LayoutGrid size={12} /> };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id, disabled: !isEditMode });

  const style: React.CSSProperties = {
    gridColumn: `span ${widget.colSpan}`,
    gridRow: `span ${widget.rowSpan}`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 60 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative min-h-0 min-w-0">
      <BentoWidget
        id={widget.id}
        title={meta.title}
        icon={meta.icon}
        isEditMode={isEditMode}
        onHide={onHide}
        dragHandleProps={isEditMode ? { ...attributes, ...listeners } : undefined}
      >
        {children}
      </BentoWidget>

      {isEditMode && (
        <>
          {/* Span steppers — bottom-left, appear on hover for less clutter */}
          <div
            className="absolute bottom-2 left-2 z-20 flex items-center gap-2 px-2 py-1 rounded-md border opacity-0 hover:opacity-100 focus-within:opacity-100"
            style={{
              background: 'rgba(12,12,16,0.94)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255,255,255,0.1)',
              transition: 'opacity 0.18s ease',
            }}
          >
            <SpanStepper
              kind="col"
              value={widget.colSpan}
              min={3}
              max={GRID_COLS}
              onChange={(v) => onResize(widget.id, v, widget.rowSpan)}
            />
            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)' }} />
            <SpanStepper
              kind="row"
              value={widget.rowSpan}
              min={10}
              onChange={(v) => onResize(widget.id, widget.colSpan, v)}
            />
          </div>
          {/* Drag resize corner */}
          <ResizeHandle
            widgetId={widget.id}
            colSpan={widget.colSpan}
            rowSpan={widget.rowSpan}
            getCellSize={getCellSize}
            onResize={onResize}
          />
        </>
      )}
    </div>
  );
};

// ─── Template widget (named template mode) ───────────────────────────────────

interface TemplateWidgetProps {
  widget: WidgetConfig;
  children: React.ReactNode;
}

const TemplateWidget: React.FC<TemplateWidgetProps> = ({ widget, children }) => {
  const meta = WIDGET_META[widget.type] ?? { title: widget.id, icon: <LayoutGrid size={12} /> };

  return (
    <div style={{ gridArea: widget.id }} className="bento-template-cell min-h-0 min-w-0">
      <BentoWidget
        id={widget.id}
        title={meta.title}
        icon={meta.icon}
        isEditMode={false}
        onHide={() => {}}
      >
        {children}
      </BentoWidget>
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const TaskBentoDashboard: React.FC<TaskBentoDashboardProps> = ({
  projectId,
  taskId,
  task,
  isPmView,
  onPmComplete,
  onPmEdit,
  onPmReassign,
  onPmChangeDeadline,
  onPmDelete,
  onTakeCharge,
  onStartWork,
  lifecycleLoading,
  onAttachmentChange,
}) => {
  const {
    widgets,
    isEditMode,
    activeTemplate,
    toggleEditMode,
    toggleWidgetVisibility,
    reorderWidgets,
    updateWidgetSpan,
    setTemplate,
    resetLayout,
  } = useBentoStore();

  const [menuOpen, setMenuOpen]           = useState(false);
  const [suggestedTpl, setSuggestedTpl]   = useState<TemplateId | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Intent → template mapping ─────────────────────────────────────────────
  const INTENT_TEMPLATE: Record<IntentType, TemplateId> = {
    communication: 'chat',
    procedure:     'concentrazione',
    creative:      'lavoro',
    analysis:      'lavoro',
    meeting:       'focus',
    generic:       'lavoro',
  };

  // Fetch AI brief to determine suggested layout — runs once when task loads
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSuggestLoading(true);
      try {
        const res = await taskDetailAiApi.getBrief(projectId, taskId);
        if (!cancelled && res.success && res.data?.intent) {
          const tpl = INTENT_TEMPLATE[res.data.intent as IntentType] ?? 'lavoro';
          if (tpl !== activeTemplate) setSuggestedTpl(tpl);
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Returns the pixel size of one grid unit (1 col, 1 row)
  const getCellSize = useCallback((): { w: number; h: number } => {
    const el = gridRef.current;
    if (!el) return { w: 40, h: GRID_ROW_PX };
    const totalW = el.offsetWidth - 24; // subtract p-3 padding
    const colW = (totalW - CUSTOM_GAP * (GRID_COLS - 1)) / GRID_COLS;
    return { w: colW, h: GRID_ROW_PX };
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sortedVisible.map((w) => w.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    reorderWidgets(arrayMove(ids, oldIdx, newIdx));
  };

  const renderContent = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'header':
        return (
          <div
            data-ai-context={`Task: ${task.title} | Stato: ${task.status} | Priorità: ${task.priority} | Progetto: ${task.project?.name ?? ''}`}
            data-task-status={task.status}
            data-ai-heading={task.title}
            style={{ minHeight: 0 }}
          >
            <TaskHeaderWidget
              task={{
                title: task.title,
                priority: task.priority,
                status: task.status,
                description: task.description ?? '',
                projectName: task.project?.name ?? '',
              }}
              onTakeCharge={onTakeCharge}
              onStartWork={onStartWork}
              loading={lifecycleLoading}
            />
          </div>
        );
      case 'copilot':
        return <AICopilotWidget projectId={projectId} taskId={taskId} />;
      case 'assistant':
        return <AIAssistantWidget projectId={projectId} taskId={taskId} />;
      case 'pm':
        return (
          <PMActionsWidget
            taskId={taskId}
            onComplete={isPmView ? onPmComplete : undefined}
            onEdit={isPmView ? onPmEdit : undefined}
            onReassign={isPmView ? onPmReassign : undefined}
            onChangeDeadline={isPmView ? onPmChangeDeadline : undefined}
            onDelete={isPmView ? onPmDelete : undefined}
          />
        );
      case 'activity':
        return <ActivityWidget projectId={projectId} taskId={taskId} />;
      case 'notes':
        return (
          <NotesWidget
            projectId={projectId}
            taskId={taskId}
            initialNotes={task.work_notes ?? ''}
          />
        );
      case 'files':
        return (
          <FilesWidget
            projectId={projectId}
            taskId={taskId}
            onAttachmentChange={onAttachmentChange}
          />
        );
      case 'checklist':
        return <ChecklistWidget projectId={projectId} taskId={taskId} />;
      case 'clock':
        return <ClockWidget />;
      case 'timer':
        return <FocusTimerWidget />;
      case 'agent':
        return <WorkspaceAgentWidget projectId={projectId} taskId={taskId} />;
      default:
        return null;
    }
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const isCustomMode = activeTemplate === 'custom';
  const currentTemplate = LAYOUT_TEMPLATES.find((t) => t.id === activeTemplate);

  // In template mode, only render widgets whose id is defined in the template's
  // gridTemplateAreas. Widgets outside the template are silently excluded.
  const sortedVisible = sortedWidgets.filter((w) => {
    if (!w.isVisible) return false;
    if (isCustomMode || !currentTemplate) return true;
    return currentTemplate.widgetIds.includes(w.id);
  });
  const visibleIds = sortedVisible.map((w) => w.id);

  const closeAll = () => {
    setMenuOpen(false);
  };

  // ── Toolbar ────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'rgb(10 10 12)' }}
      onClick={closeAll}
    >
      {/* Sub-toolbar */}
      <div
        className="flex items-center gap-2 px-3 border-b shrink-0"
        style={{
          height: '40px',
          borderColor: 'rgba(255,255,255,0.05)',
          background: 'rgba(18,18,22,0.95)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Template picker */}
        <div className="flex items-center gap-1">
          {LAYOUT_TEMPLATES.map((tpl) => {
            const active = activeTemplate === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => { setTemplate(tpl.id); closeAll(); }}
                title={tpl.description}
                className="bento-tpl-btn flex items-center gap-1.5 rounded-lg transition-all"
                data-active={active ? 'true' : undefined}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  background: active ? 'rgba(10,132,255,0.14)' : 'transparent',
                  color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.38)',
                  border: active ? '1px solid rgba(10,132,255,0.35)' : '1px solid transparent',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 13 }}>{tpl.emoji}</span>
                <span className="hidden sm:inline">{tpl.name}</span>
              </button>
            );
          })}

          {/* Custom badge — shown when user has customised layout */}
          {isCustomMode && (
            <span
              className="flex items-center gap-1 rounded-md text-xs font-medium ml-1"
              style={{
                padding: '3px 8px',
                background: 'rgba(255,159,10,0.12)',
                color: '#FF9F0A',
                border: '1px solid rgba(255,159,10,0.25)',
                fontSize: 11,
              }}
            >
              <GripVertical size={10} />
              Custom
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Smart layout suggestion */}
        <AnimatePresence>
          {suggestedTpl && suggestedTpl !== activeTemplate && !isEditMode && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => { setTemplate(suggestedTpl); setSuggestedTpl(null); }}
              title={`L'AI suggerisce il layout "${LAYOUT_TEMPLATES.find(t => t.id === suggestedTpl)?.name ?? suggestedTpl}" per questa task`}
              className="flex items-center gap-1 rounded-lg transition-all"
              style={{
                padding: '3px 9px',
                fontSize: 10.5,
                background: 'rgba(94,92,230,0.15)',
                border: '1px solid rgba(94,92,230,0.35)',
                color: '#a78bfa',
                fontWeight: 600,
                letterSpacing: 0.2,
                cursor: 'pointer',
              }}
            >
              <Wand2 size={10} />
              Layout AI
            </motion.button>
          )}
          {suggestLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#5e5ce6', animation: 'pulse 1.2s ease-in-out infinite' }}
            />
          )}
        </AnimatePresence>

        {/* Widget visibility menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="flex items-center gap-1.5 rounded-lg text-xs transition-colors"
            style={{
              padding: '3px 9px',
              fontSize: 11,
              border: '1px solid rgba(255,255,255,0.09)',
              color: menuOpen ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
              background: menuOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
          >
            <LayoutGrid size={11} />
            Widget
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl py-1 shadow-2xl"
                style={{
                  background: 'rgb(26,26,32)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="px-3 py-1.5 text-xs font-medium mb-0.5"
                  style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  Mostra / nascondi widget
                </div>
                {sortedWidgets.map((w) => {
                  const meta = WIDGET_META[w.type];
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWidgetVisibility(w.id)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{meta?.icon}</span>
                        {meta?.title ?? w.id}
                      </div>
                      {w.isVisible
                        ? <Eye size={11} style={{ color: '#0A84FF' }} />
                        : <EyeOff size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reset layout */}
        {isCustomMode && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); resetLayout(); }}
            title="Ripristina layout predefinito"
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: 26, height: 26, border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <RotateCcw size={11} />
          </button>
        )}

        {/* Edit mode toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleEditMode(); closeAll(); }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
          style={
            isEditMode
              ? {
                  background: 'linear-gradient(135deg, #30D158, #34C759)',
                  color: '#fff',
                  border: '1px solid rgba(52,199,89,0.6)',
                  boxShadow: '0 0 14px rgba(52,199,89,0.35)',
                }
              : {
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }
          }
        >
          {isEditMode ? (
            <>
              <X size={11} />
              Fine
            </>
          ) : (
            <>
              <LayoutGrid size={11} />
              Layout
            </>
          )}
        </button>
      </div>

      {/* Edit mode hint bar */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 26, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'linear-gradient(90deg, rgba(94,92,230,0.12), rgba(10,132,255,0.08))',
              borderBottom: '1px solid rgba(94,92,230,0.2)',
              display: 'flex',
              alignItems: 'center',
              paddingInline: 16,
              gap: 6,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <GripVertical size={10} style={{ color: 'rgba(94,92,230,0.7)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
              Trascina per riordinare • Ridimensiona dagli angoli o con W/H • Clicca ✕ per nascondere
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      {isCustomMode ? (
        /* ── CUSTOM MODE: DnD + resize, array-ordered colSpan/rowSpan ── */
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
            <div
              ref={gridRef}
              className="flex-1 overflow-y-auto"
              style={{
                padding: '10px 12px 12px',
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                gridAutoRows: `${GRID_ROW_PX}px`,
                gap: `${CUSTOM_GAP}px`,
                background: isEditMode
                  ? 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(94,92,230,0.06), transparent)'
                  : 'transparent',
                transition: 'background 0.4s ease',
              }}
            >
              {sortedVisible.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  isEditMode={isEditMode}
                  onHide={() => toggleWidgetVisibility(widget.id)}
                  onResize={updateWidgetSpan}
                  getCellSize={getCellSize}
                >
                  {renderContent(widget)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        /* ── TEMPLATE MODE: CSS grid-area placement ── */
        <div
          className="bento-template-grid flex-1 min-h-0"
          style={{
            padding: '10px 14px 14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gridTemplateRows: currentTemplate?.gridTemplateRows ?? 'auto 1fr minmax(140px, auto)',
            gridTemplateAreas: currentTemplate?.gridTemplateAreas ?? '',
            gap: `${CUSTOM_GAP}px`,
            height: '100%',
          }}
        >
          {sortedVisible.map((widget) => (
            <TemplateWidget key={widget.id} widget={widget}>
              {renderContent(widget)}
            </TemplateWidget>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskBentoDashboard;
