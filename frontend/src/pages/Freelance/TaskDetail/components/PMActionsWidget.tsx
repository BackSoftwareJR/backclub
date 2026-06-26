import React from 'react';
import { CheckCircle2, Pencil, UserRound, CalendarClock, Trash2 } from 'lucide-react';

interface PMActionsWidgetProps {
  taskId: number;
  onComplete?: () => void;
  onReassign?: () => void;
  onChangeDeadline?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PMActionsWidget: React.FC<PMActionsWidgetProps> = ({
  onComplete,
  onReassign,
  onChangeDeadline,
  onEdit,
  onDelete,
}) => {
  const actions = [
    {
      label: 'Segna completata',
      icon: <CheckCircle2 size={14} />,
      onClick: onComplete,
      className: 'text-emerald-400 hover:bg-emerald-500/10',
    },
    {
      label: 'Modifica task',
      icon: <Pencil size={14} />,
      onClick: onEdit,
      className: 'text-neutral-300 hover:bg-white/5',
    },
    {
      label: 'Riassegna',
      icon: <UserRound size={14} />,
      onClick: onReassign,
      className: 'text-neutral-300 hover:bg-white/5',
    },
    {
      label: 'Modifica scadenza',
      icon: <CalendarClock size={14} />,
      onClick: onChangeDeadline,
      className: 'text-neutral-300 hover:bg-white/5',
    },
    {
      label: 'Elimina',
      icon: <Trash2 size={14} />,
      onClick: onDelete,
      className: 'text-red-400 hover:bg-red-500/10',
    },
  ];

  return (
    <div className="pm-actions-widget p-2 flex flex-col gap-1 h-full overflow-y-auto">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={`pm-actions-widget-btn flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg transition-colors w-full text-left ${action.className}`}
        >
          <span className="shrink-0">{action.icon}</span>
          <span className="leading-tight">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PMActionsWidget;
