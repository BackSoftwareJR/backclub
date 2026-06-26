import React, { useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AgentDayGroup } from './taskListUtils';
import type { CrmProjectTask } from '../../../api/crmProjects';
import TaskListRow from './TaskListRow';

interface TaskAgentDayGroupProps {
  group: AgentDayGroup;
  collapsed: boolean;
  onToggle: (key: string) => void;
  projectId: number;
  onOpenTask: (task: CrmProjectTask) => void;
  onMarkCompleted: (task: CrmProjectTask) => void;
  completingTaskId: number | null;
  canManage: boolean;
  onOpenEdit?: (task: CrmProjectTask) => void;
  onDelete?: (task: CrmProjectTask) => void;
}

const TaskAgentDayGroup: React.FC<TaskAgentDayGroupProps> = ({
  group,
  collapsed,
  onToggle,
  projectId,
  onOpenTask,
  onMarkCompleted,
  completingTaskId,
  canManage,
  onOpenEdit,
  onDelete,
}) => {
  const handleToggle = useCallback(() => onToggle(group.key), [onToggle, group.key]);

  const activeCount = group.tasks.filter(
    (t) => t.n8n_status === 'processing' || t.n8n_status === 'pending',
  ).length;

  return (
    <div className="tagd-root">
      <button
        className="tagd-header"
        onClick={handleToggle}
        aria-expanded={!collapsed}
      >
        <motion.span
          className="tagd-chevron"
          animate={{ rotate: collapsed ? 0 : 90 }}
          transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <ChevronRight size={12} />
        </motion.span>

        <span className="tagd-label">{group.label}</span>

        {activeCount > 0 && (
          <span className="tagd-pulse-dot" title={`${activeCount} in esecuzione`} />
        )}

        <span className="tagd-count">{group.tasks.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="tagd-body">
              {group.tasks.map((task) => (
                <TaskListRow
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  onOpen={onOpenTask}
                  onMarkCompleted={onMarkCompleted}
                  completingTaskId={completingTaskId}
                  canManage={canManage}
                  onOpenEdit={onOpenEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskAgentDayGroup;
