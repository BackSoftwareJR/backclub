import React, { useCallback, useEffect, useState } from 'react';
import { crmProjectTasksApi, type CrmProjectTaskComment, type CrmProjectTaskEvent } from '../../../../api/crmProjects';
import { useAuth } from '../../../../context/AuthContext';
import TaskActivityFeed from './TaskActivityFeed';
import TaskCommentComposer from './TaskCommentComposer';

interface ActivityWidgetProps {
  projectId: number;
  taskId: number;
}

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ActivityWidget: React.FC<ActivityWidgetProps> = ({ projectId, taskId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CrmProjectTaskComment[]>([]);
  const [events, setEvents] = useState<CrmProjectTaskEvent[]>([]);

  const loadFeed = useCallback(async () => {
    try {
      const [notesRes, eventsRes] = await Promise.all([
        crmProjectTasksApi.getNotes(projectId, taskId),
        crmProjectTasksApi.getEvents(projectId, taskId),
      ]);
      setComments(notesRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (err) {
      console.error('ActivityWidget: failed to load feed', err);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const handleSubmit = async (data: { comment: string; files: File[] }) => {
    await crmProjectTasksApi.createNote(projectId, taskId, data);
    await loadFeed();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable feed */}
      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <TaskActivityFeed
          comments={comments}
          events={events}
          formatDateTime={formatDateTime}
          currentUserId={user?.id}
        />
      </div>

      {/* Sticky composer */}
      <div className="shrink-0 border-t border-white/5">
        <TaskCommentComposer onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default ActivityWidget;
