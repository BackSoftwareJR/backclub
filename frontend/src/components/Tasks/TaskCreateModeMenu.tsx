import React, { useEffect, useRef, useState } from 'react';
import { Bot, BotMessageSquare, User, ChevronDown, Plus } from 'lucide-react';
import type { TaskExecutionMode } from '../../api/crmProjects';
import './TaskCreateModeMenu.css';

export interface TaskCreateModeOption {
  mode: TaskExecutionMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const OPTIONS: TaskCreateModeOption[] = [
  {
    mode: 'agent',
    label: 'Agente',
    description: 'N8N elabora e completa la task automaticamente',
    icon: <Bot size={18} />,
  },
  {
    mode: 'agent_human',
    label: 'Agente + Umano',
    description: 'N8N avvia il lavoro; un umano completa la task',
    icon: <BotMessageSquare size={18} />,
  },
  {
    mode: 'human',
    label: 'Umano',
    description: 'Solo assegnazione, nessuna automazione N8N',
    icon: <User size={18} />,
  },
];

interface TaskCreateModeMenuProps {
  onSelect: (mode: TaskExecutionMode) => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

const TaskCreateModeMenu: React.FC<TaskCreateModeMenuProps> = ({
  onSelect,
  disabled = false,
  loading = false,
  loadingLabel = 'Creazione in corso...',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePick = (mode: TaskExecutionMode) => {
    setOpen(false);
    onSelect(mode);
  };

  return (
    <div className="task-create-mode-menu" ref={containerRef}>
      <button
        type="button"
        className="btn-primary task-create-mode-trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Plus size={16} />
        {loading ? loadingLabel : 'Crea'}
        {!loading && <ChevronDown size={16} className={open ? 'rotated' : ''} />}
      </button>

      {open && !loading && (
        <div className="task-create-mode-dropdown" role="menu">
          {OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              className="task-create-mode-option"
              role="menuitem"
              onClick={() => handlePick(opt.mode)}
            >
              <span className="task-create-mode-option-icon">{opt.icon}</span>
              <span className="task-create-mode-option-text">
                <span className="task-create-mode-option-label">{opt.label}</span>
                <span className="task-create-mode-option-desc">{opt.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskCreateModeMenu;
