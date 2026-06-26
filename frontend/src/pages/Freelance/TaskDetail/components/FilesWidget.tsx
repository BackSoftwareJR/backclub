import React from 'react';
import TaskAttachmentZone from './TaskAttachmentZone';

interface FilesWidgetProps {
  projectId: number;
  taskId: number;
  onAttachmentChange?: () => void;
}

const FilesWidget: React.FC<FilesWidgetProps> = ({ projectId, taskId, onAttachmentChange }) => {
  return (
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <TaskAttachmentZone
        projectId={projectId}
        taskId={taskId}
        onAttachmentChange={onAttachmentChange}
      />
    </div>
  );
};

export default FilesWidget;
