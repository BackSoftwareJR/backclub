import React, { useState } from 'react';
import {
  Bot,
  User,
  CheckCircle2,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  Zap,
} from 'lucide-react';
import type { CrmProjectTask } from '../../../api/crmProjects';
import { isAgentTask, getN8nBadge } from './taskListUtils';

interface TaskListRowProps {
  task: CrmProjectTask;
  projectId: number;
  onOpen: (task: CrmProjectTask) => void;
  onMarkCompleted: (task: CrmProjectTask) => void;
  completingTaskId: number | null;
  canManage: boolean;
  onOpenEdit?: (task: CrmProjectTask) => void;
  onDelete?: (task: CrmProjectTask) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#FF3B30',
  high:   '#FF9500',
  medium: '#007AFF',
  low:    'rgba(255,255,255,0.18)',
};

const STATUS_LABEL: Record<string, string> = {
  pending:     'In attesa',
  in_progress: 'In corso',
  review:      'Revisione',
  completed:   'Completato',
  cancelled:   'Annullato',
};

function formatDateShort(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Oggi';
  if (diff === 1) return 'Domani';
  if (diff === -1) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function isDueDateOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

const TaskListRow: React.FC<TaskListRowProps> = ({
  task,
  onOpen,
  onMarkCompleted,
  completingTaskId,
  canManage,
  onOpenEdit,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAgent = isAgentTask(task);
  const n8nBadge = getN8nBadge(task);
  const isCompleted = task.status === 'completed';
  const isProcessing = task.n8n_status === 'processing' || task.n8n_status === 'pending';
  const progress = task.progress ?? 0;
  const dueStr = formatDateShort(task.due_date);
  const overdue = !isCompleted && isDueDateOverdue(task.due_date);

  const activeAssignees = task.assignments?.filter((a) => a.is_active) ?? [];

  return (
    <div
      className={`tlr-root${isCompleted ? ' tlr-root--completed' : ''}${isAgent ? ' tlr-root--agent' : ''}`}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(task)}
    >
      {/* ── Checkbox ── */}
      <button
        className={`tlr-check${isCompleted ? ' tlr-check--done' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isCompleted) onMarkCompleted(task);
        }}
        disabled={completingTaskId === task.id || isCompleted}
        title={isCompleted ? 'Completato' : 'Segna completato'}
        aria-label={isCompleted ? 'Completato' : 'Segna completato'}
      >
        {isCompleted && <CheckCircle2 size={9} />}
      </button>

      {/* ── Priority dot ── */}
      <span
        className="tlr-priority-dot"
        style={{ background: PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.low }}
        title={task.priority}
      />

      {/* ── Main content ── */}
      <div className="tlr-main">
        <div className="tlr-top">
          {/* Execution icon */}
          <span className={`tlr-mode-icon${isAgent ? ' tlr-mode-icon--agent' : ''}`}>
            {isAgent ? (
              task.execution_mode === 'agent_human' ? <Zap size={10} /> : <Bot size={10} />
            ) : (
              <User size={10} />
            )}
          </span>

          {/* Title */}
          <span className={`tlr-title${isCompleted ? ' tlr-title--done' : ''}`}>
            {task.title}
          </span>

          {/* n8n animated pulse if processing */}
          {isProcessing && <span className="tlr-processing-dot" title="In esecuzione" />}
        </div>

        {/* ── Agent progress bar ── */}
        {isAgent && progress > 0 && (
          <div className="tlr-progress-bar" title={`${progress}%`}>
            <div
              className={`tlr-progress-fill${isProcessing ? ' tlr-progress-fill--animated' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* ── Meta row ── */}
        <div className="tlr-meta">
          {/* n8n badge */}
          {n8nBadge && (
            <span className={`tlr-n8n-badge tlr-n8n-badge--${n8nBadge.variant}`}>
              {n8nBadge.label}
            </span>
          )}

          {/* Task status (only for human tasks or if different from n8n status) */}
          {(!isAgent || !n8nBadge) && (
            <span className={`tlr-status-badge tlr-status-badge--${task.status}`}>
              {STATUS_LABEL[task.status] ?? task.status}
            </span>
          )}

          {/* Due date */}
          {dueStr && (
            <span className={`tlr-due${overdue ? ' tlr-due--overdue' : ''}`}>
              {dueStr}
            </span>
          )}

          {/* Assignees */}
          {activeAssignees.length > 0 && (
            <div className="tlr-avatars">
              {activeAssignees.slice(0, 3).map((a, i) => (
                <div
                  key={a.id}
                  className="tlr-avatar"
                  style={{ zIndex: 10 - i, marginLeft: i > 0 ? '-5px' : '0' }}
                  title={a.user?.name}
                >
                  {a.user?.avatar ? (
                    <img src={a.user.avatar} alt={a.user.name} />
                  ) : (
                    <span>{a.user?.name?.charAt(0) ?? '?'}</span>
                  )}
                </div>
              ))}
              {activeAssignees.length > 3 && (
                <span className="tlr-avatar-more">+{activeAssignees.length - 3}</span>
              )}
            </div>
          )}

          {/* Progress % for agent */}
          {isAgent && (
            <span className="tlr-progress-pct">{progress}%</span>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      <div
        className="tlr-actions"
        onClick={(e) => e.stopPropagation()}
      >
        {canManage && (
          <div className="tlr-menu-wrap">
            <button
              className="tlr-more-btn"
              onClick={() => setMenuOpen((p) => !p)}
              aria-label="Azioni"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div className="tlr-menu" role="menu">
                <button
                  className="tlr-menu-item"
                  role="menuitem"
                  onClick={() => { onOpen(task); setMenuOpen(false); }}
                >
                  <Eye size={12} /> Apri
                </button>
                {onOpenEdit && (
                  <button
                    className="tlr-menu-item"
                    role="menuitem"
                    onClick={() => { onOpenEdit(task); setMenuOpen(false); }}
                  >
                    <Edit size={12} /> Modifica
                  </button>
                )}
                {onDelete && (
                  <button
                    className="tlr-menu-item tlr-menu-item--danger"
                    role="menuitem"
                    onClick={() => { onDelete(task); setMenuOpen(false); }}
                  >
                    <Trash2 size={12} /> Elimina
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <ChevronRight size={12} className="tlr-chevron-right" />
      </div>
    </div>
  );
};

export default TaskListRow;
