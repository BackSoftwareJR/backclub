import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ChevronDown, ChevronRight, X } from 'lucide-react';

interface TaskHeaderWidgetProps {
  task: {
    title: string;
    priority: string;
    status: string;
    description: string;
    projectName: string;
  };
  onTakeCharge?: () => void;
  onStartWork?: () => void;
  loading?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#8E8E93',
  medium: '#0A84FF',
  normal: '#0A84FF',
  high: '#FF9500',
  urgent: '#FF3B30',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#8E8E93',
  in_progress: '#0A84FF',
  review: '#FF9F0A',
  completed: '#34C759',
  cancelled: '#FF3B30',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Da fare',
  in_progress: 'In corso',
  review: 'In revisione',
  completed: 'Completato',
  cancelled: 'Annullato',
};

const LONG_DESCRIPTION_THRESHOLD = 220;

const TaskHeaderWidget: React.FC<TaskHeaderWidgetProps> = ({
  task,
  onTakeCharge,
  onStartWork,
  loading,
}) => {
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const priorityColor = PRIORITY_COLORS[task.priority] ?? '#8E8E93';
  const statusColor = STATUS_COLORS[task.status] ?? '#8E8E93';
  const statusLabel = STATUS_LABELS[task.status] ?? task.status;

  const showReadMore =
    descriptionOverflows || (task.description?.length ?? 0) > LONG_DESCRIPTION_THRESHOLD;

  useEffect(() => {
    setShowDescriptionModal(false);
  }, [task.description]);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setDescriptionOverflows(el.scrollHeight > el.clientHeight + 2);
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [task.description]);

  useEffect(() => {
    if (!showDescriptionModal) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDescriptionModal(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showDescriptionModal]);

  return (
    <>
      <div className="flex items-start justify-between gap-4 px-4 py-3">
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-neutral-500 mb-1">
            <Building2 size={11} />
            <span className="truncate">{task.projectName}</span>
            <ChevronRight size={10} />
            <span className="text-neutral-400 truncate">{task.title}</span>
          </div>

          {/* Title + priority bar */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1 h-5 rounded-full shrink-0"
              style={{ backgroundColor: priorityColor }}
            />
            <h1 className="text-base font-semibold text-white leading-tight truncate">
              {task.title}
            </h1>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
              style={{
                color: statusColor,
                borderColor: `${statusColor}30`,
                backgroundColor: `${statusColor}14`,
              }}
            >
              {statusLabel}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
              style={{
                color: priorityColor,
                borderColor: `${priorityColor}30`,
                backgroundColor: `${priorityColor}14`,
              }}
            >
              {task.priority}
            </span>
          </div>

          {/* Description preview */}
          {task.description && (
            <div className="task-header-description">
              <div
                ref={descriptionRef}
                className="task-header-description-text text-xs leading-relaxed whitespace-pre-wrap line-clamp-3"
              >
                {task.description}
              </div>
              {showReadMore && (
                <button
                  type="button"
                  className="task-header-description-toggle"
                  onClick={() => setShowDescriptionModal(true)}
                >
                  <ChevronDown size={12} />
                  Leggi di più
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {task.status === 'pending' && (
            <button
              type="button"
              onClick={onTakeCharge}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Attendere...' : 'Prendi in carico'}
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              type="button"
              onClick={onStartWork}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              Avvia lavorazione
            </button>
          )}
        </div>
      </div>

      {showDescriptionModal && createPortal(
        <div
          className="task-description-modal-overlay"
          onClick={() => setShowDescriptionModal(false)}
          role="presentation"
        >
          <div
            className="task-description-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-description-modal-title"
          >
            <div className="task-description-modal-header">
              <div className="task-description-modal-header-text">
                <span className="task-description-modal-eyebrow">{task.projectName}</span>
                <h2 id="task-description-modal-title" className="task-description-modal-title">
                  {task.title}
                </h2>
              </div>
              <button
                type="button"
                className="task-description-modal-close"
                onClick={() => setShowDescriptionModal(false)}
                aria-label="Chiudi"
              >
                <X size={16} />
              </button>
            </div>

            <div className="task-description-modal-body">
              {task.description}
            </div>

            <div className="task-description-modal-footer">
              <button
                type="button"
                className="task-description-modal-close-btn"
                onClick={() => setShowDescriptionModal(false)}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default TaskHeaderWidget;
