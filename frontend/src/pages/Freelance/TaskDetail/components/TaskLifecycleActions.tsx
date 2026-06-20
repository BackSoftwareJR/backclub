import React from 'react';
import type { FreelanceTask } from '../../../../types/freelance';

interface TaskLifecycleActionsProps {
  task: FreelanceTask;
  currentUserId?: number;
  isPmView: boolean;
  loading: boolean;
  onTakeCharge: () => void;
  onStartWork: () => void;
  onDeliver: () => void;
  onPmComplete?: () => void;
  /** 'header' renders inline buttons only (no sticky wrapper) */
  variant?: 'sticky' | 'header';
}

const TaskLifecycleActions: React.FC<TaskLifecycleActionsProps> = ({
  task,
  currentUserId,
  isPmView,
  loading,
  onTakeCharge,
  onStartWork,
  onDeliver,
  onPmComplete,
  variant = 'sticky',
}) => {
  const isAssignedToCurrentUser = currentUserId
    ? (task.assignments?.some((a) => a.is_active && a.user_id === currentUserId) ?? false)
    : false;

  const renderBadge = (label: string, color: string) => (
    <div className="task-lifecycle-badge" style={{ backgroundColor: `${color}18`, color, borderColor: `${color}30` }}>
      {label}
    </div>
  );

  const getButtons = (): React.ReactNode => {
    if (task.status === 'review') {
      return (
        <>
          {renderBadge('In revisione', '#FF9F0A')}
          {isPmView && onPmComplete && (
            <button type="button" className="task-lifecycle-btn success" onClick={onPmComplete} disabled={loading}>
              {loading ? 'Aggiornamento...' : 'Approva e completa'}
            </button>
          )}
        </>
      );
    }

    if (task.status === 'completed') {
      return renderBadge('Completata', '#34C759');
    }

    if (task.status === 'cancelled') {
      return renderBadge('Annullata', '#FF3B30');
    }

    if (task.status === 'pending') {
      return (
        <>
          <button type="button" className="task-lifecycle-btn primary" onClick={onTakeCharge} disabled={loading}>
            {loading ? 'Attendere...' : 'Prendi in carico'}
          </button>
          {isAssignedToCurrentUser && (
            <button type="button" className="task-lifecycle-btn secondary" onClick={onStartWork} disabled={loading}>
              Avvia lavorazione
            </button>
          )}
        </>
      );
    }

    if (task.status === 'in_progress') {
      return (
        <>
          {renderBadge('In lavorazione', '#0A84FF')}
          <button type="button" className="task-lifecycle-btn success" onClick={onDeliver} disabled={loading}>
            Consegna
          </button>
        </>
      );
    }

    return null;
  };

  const buttons = getButtons();
  if (!buttons) return null;

  if (variant === 'header') {
    return <div className="task-lifecycle-bar">{buttons}</div>;
  }

  return (
    <div className="task-lifecycle-sticky">
      <div className="task-lifecycle-bar">{buttons}</div>
    </div>
  );
};

export default TaskLifecycleActions;
