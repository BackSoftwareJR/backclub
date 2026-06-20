import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskAiBrief } from '../../../../api/taskDetailAi';

interface TaskDetailBriefHintProps {
  brief: TaskAiBrief | null;
  onOpenCopilot: () => void;
}

const TaskDetailBriefHint: React.FC<TaskDetailBriefHintProps> = ({ brief, onOpenCopilot }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!brief?.hint || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="task-ai-hint-bar"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <button type="button" className="task-ai-hint-pill" onClick={onOpenCopilot}>
          <span className="task-ai-hint-icon">
            <Lightbulb size={13} />
          </span>
          <span className="task-ai-hint-text">{brief.hint}</span>
        </button>
        <button
          type="button"
          className="task-ai-hint-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Nascondi suggerimento"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default TaskDetailBriefHint;
