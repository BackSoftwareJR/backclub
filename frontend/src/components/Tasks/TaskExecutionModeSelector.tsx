import React from 'react';
import { Bot, BotMessageSquare, User } from 'lucide-react';
import type { TaskExecutionMode } from '../../api/crmProjects';
import './TaskExecutionModeSelector.css';

const OPTIONS: Array<{
  mode: TaskExecutionMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    mode: 'agent',
    label: 'Agente',
    description: 'N8N elabora in automatico e completa la task al termine del workflow.',
    icon: <Bot size={22} />,
  },
  {
    mode: 'agent_human',
    label: 'Agente + Umano',
    description: 'N8N avvia il lavoro; un umano completa la task dopo la risposta dell\'agente.',
    icon: <BotMessageSquare size={22} />,
  },
  {
    mode: 'human',
    label: 'Umano',
    description: 'Solo assegnazione al team, senza automazione N8N.',
    icon: <User size={22} />,
  },
];

interface TaskExecutionModeSelectorProps {
  value: TaskExecutionMode;
  onChange: (mode: TaskExecutionMode) => void;
  disabled?: boolean;
}

const TaskExecutionModeSelector: React.FC<TaskExecutionModeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="task-execution-mode-selector">
      <label className="task-execution-mode-label">Modalità esecuzione *</label>
      <p className="task-execution-mode-hint">
        Scegli come deve essere gestita questa task dopo la creazione.
      </p>
      <div className="task-execution-mode-grid" role="radiogroup" aria-label="Modalità esecuzione task">
        {OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={value === opt.mode}
            disabled={disabled}
            className={`task-execution-mode-card ${value === opt.mode ? 'selected' : ''}`}
            onClick={() => onChange(opt.mode)}
          >
            <span className="task-execution-mode-card-icon">{opt.icon}</span>
            <span className="task-execution-mode-card-title">{opt.label}</span>
            <span className="task-execution-mode-card-desc">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaskExecutionModeSelector;
