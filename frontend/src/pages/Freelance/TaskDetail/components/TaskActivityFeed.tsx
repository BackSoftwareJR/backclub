import React, { useMemo, useState } from 'react';
import { Activity, MessageSquare, Paperclip, ChevronDown } from 'lucide-react';
import type { CrmProjectTaskComment, CrmProjectTaskEvent } from '../../../../api/crmProjects';

export type ActivityFeedItem =
  | { kind: 'comment'; id: string; created_at: string; data: CrmProjectTaskComment }
  | { kind: 'event'; id: string; created_at: string; data: CrmProjectTaskEvent };

interface TaskActivityFeedProps {
  comments: CrmProjectTaskComment[];
  events: CrmProjectTaskEvent[];
  formatDateTime: (date: string | null) => string;
  currentUserId?: number;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const avatarColor = (userId: number | string) => {
  const colors = ['#0A84FF', '#34C759', '#FF9F0A', '#BF5AF2', '#FF453A', '#64D2FF', '#FF6B35', '#4CD964'];
  const str = String(userId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Oggi';
  if (sameDay(d, yesterday)) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
};

const PAGE_SIZE = 10;

const TaskActivityFeed: React.FC<TaskActivityFeedProps> = ({ comments, events, formatDateTime, currentUserId }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const items = useMemo<ActivityFeedItem[]>(() => {
    const commentItems: ActivityFeedItem[] = comments.map((comment) => ({
      kind: 'comment',
      id: `comment-${comment.id}`,
      created_at: comment.created_at,
      data: comment,
    }));

    const eventItems: ActivityFeedItem[] = events.map((event) => ({
      kind: 'event',
      id: `event-${event.id}`,
      created_at: event.created_at,
      data: event,
    }));

    return [...commentItems, ...eventItems].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [comments, events]);

  const visibleItems = items.slice(-visibleCount);
  const hasMore = items.length > visibleCount;

  if (items.length === 0) {
    return (
      <div className="feed-empty">
        <div className="feed-empty-icon">
          <MessageSquare size={22} strokeWidth={1.5} />
        </div>
        <p className="feed-empty-title">Nessuna attività ancora</p>
        <p className="feed-empty-sub">Inizia la discussione con il tuo team</p>
      </div>
    );
  }

  let lastDateLabel = '';

  return (
    <div className="feed-container">
      {hasMore && (
        <button
          type="button"
          className="feed-load-more"
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
        >
          <ChevronDown size={14} />
          Carica messaggi precedenti ({items.length - visibleCount} rimasti)
        </button>
      )}

      <div className="feed-timeline">
        {visibleItems.map((item, idx) => {
          const dateLabel = getDateLabel(item.created_at);
          const showDateHeader = dateLabel !== lastDateLabel;
          if (showDateHeader) lastDateLabel = dateLabel;

          if (item.kind === 'comment') {
            const comment = item.data;
            const authorName = comment.user?.name || 'Utente';
            const authorId = comment.user_id ?? 0;
            const isOwn = currentUserId != null && comment.user_id === currentUserId;
            const color = avatarColor(authorId);

            return (
              <React.Fragment key={item.id}>
                {showDateHeader && (
                  <div className="feed-date-header">
                    <span>{dateLabel}</span>
                  </div>
                )}
                <div className={`feed-comment-row${isOwn ? ' own' : ''}`}>
                  {!isOwn && (
                    <div className="feed-avatar" style={{ background: `${color}22`, color }}>
                      {getInitials(authorName)}
                    </div>
                  )}
                  <div className="feed-comment-content">
                    {!isOwn && <div className="feed-comment-author">{authorName}</div>}
                    <div className={`feed-bubble${isOwn ? ' feed-bubble-own' : ' feed-bubble-other'}`}>
                      <div className="feed-bubble-text">{comment.comment}</div>
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="feed-attachments">
                          {comment.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="feed-attachment-link"
                            >
                              <Paperclip size={11} />
                              {att.file_name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`feed-comment-time${isOwn ? ' own' : ''}`}>{formatDateTime(comment.created_at)}</div>
                  </div>
                  {isOwn && (
                    <div className="feed-avatar feed-avatar-own" style={{ background: `${color}22`, color }}>
                      {getInitials(authorName)}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          }

          const event = item.data;
          const eventUser = event.user?.name || 'Sistema';
          const isLast = idx === visibleItems.length - 1;

          return (
            <React.Fragment key={item.id}>
              {showDateHeader && (
                <div className="feed-date-header">
                  <span>{dateLabel}</span>
                </div>
              )}
              <div className="feed-event-row">
                <div className="feed-event-spine">
                  <div className="feed-event-dot">
                    <Activity size={9} />
                  </div>
                  {!isLast && <div className="feed-event-line" />}
                </div>
                <div className="feed-event-body">
                  <span className="feed-event-user">{eventUser}</span>
                  <span className="feed-event-text">{event.description || event.event_type}</span>
                  <span className="feed-event-time">{formatDateTime(event.created_at)}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default TaskActivityFeed;
