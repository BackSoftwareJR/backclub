import React from 'react';
import { Bot, User, LayoutList } from 'lucide-react';
import type { ExecutionFilter } from './taskListUtils';

interface TaskExecutionFilterProps {
  value: ExecutionFilter;
  onChange: (v: ExecutionFilter) => void;
  agentCount: number;
  humanCount: number;
  totalCount: number;
}

const ITEMS: { key: ExecutionFilter; icon: React.ReactNode; label: string }[] = [
  { key: 'all',    icon: <LayoutList size={12} />, label: 'Tutti' },
  { key: 'agents', icon: <Bot size={12} />,        label: 'Agenti' },
  { key: 'humans', icon: <User size={12} />,       label: 'Umani' },
];

const TaskExecutionFilter: React.FC<TaskExecutionFilterProps> = ({
  value,
  onChange,
  agentCount,
  humanCount,
  totalCount,
}) => {
  const counts: Record<ExecutionFilter, number> = {
    all:    totalCount,
    agents: agentCount,
    humans: humanCount,
  };

  return (
    <div className="tef-root" role="group" aria-label="Filtra per tipo esecuzione">
      {ITEMS.map(({ key, icon, label }) => (
        <button
          key={key}
          className={`tef-btn${value === key ? ' tef-btn--active' : ''}`}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
        >
          <span className="tef-icon">{icon}</span>
          <span className="tef-label">{label}</span>
          {counts[key] > 0 && (
            <span className="tef-count">{counts[key]}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TaskExecutionFilter;
