import React from 'react';
import TaskWorkNotes from './TaskWorkNotes';

interface NotesWidgetProps {
  projectId: number;
  taskId: number;
  initialNotes?: string;
}

const NotesWidget: React.FC<NotesWidgetProps> = ({ projectId, taskId, initialNotes = '' }) => {
  return (
    <div className="h-full p-1">
      <TaskWorkNotes
        projectId={projectId}
        taskId={taskId}
        initialNotes={initialNotes}
      />
    </div>
  );
};

export default NotesWidget;
