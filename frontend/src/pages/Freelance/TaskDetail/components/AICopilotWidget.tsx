import React, { useState } from 'react';
import type { TaskAiBrief } from '../../../../api/taskDetailAi';
import TaskDetailCopilot from './TaskDetailCopilot';

interface AICopilotWidgetProps {
  projectId: number;
  taskId: number;
}

const AICopilotWidget: React.FC<AICopilotWidgetProps> = ({ projectId, taskId }) => {
  const [expanded, setExpanded] = useState(true);
  const [brief, setBrief] = useState<TaskAiBrief | null>(null);

  return (
    <div className="h-full flex flex-col min-h-0">
      <TaskDetailCopilot
        projectId={projectId}
        taskId={taskId}
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        brief={brief}
        onBriefLoaded={setBrief}
      />
    </div>
  );
};

export default AICopilotWidget;
