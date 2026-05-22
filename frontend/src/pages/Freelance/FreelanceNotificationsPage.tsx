import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Check, 
  AlertCircle,
  CheckSquare,
  FolderKanban,
  MessageSquare,
  Calendar,
  Clock,
  Bell
} from 'lucide-react';
import { notificationsApi, type Notification } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceNotificheTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceNotificationsPage.css';

const FreelanceNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'tutte' | 'non_lette' | 'lette' | 'urgenti'>('tutte');
  const [, setSwipedId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const response = await notificationsApi.getAll({ limit: 100 });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setSwipedId(null);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // const handleDelete = async (id: string) => {
  //   // For now, just mark as read (Laravel doesn't have soft delete by default)
  //   // In future, we can add a delete endpoint
  //   await handleMarkAsRead(id);
  //   setSwipedId(null);
  // };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read_at) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate based on notification data
    if (notification.data?.url) {
      navigate(notification.data.url);
    } else if (notification.data?.task_id) {
      navigate(`/freelance/task/${notification.data.task_id}`);
    } else if (notification.data?.project_id) {
      navigate(`/freelance/progetti/${notification.data.project_id}`);
    } else {
      // Default navigation based on type
      const type = notification.type || notification.data?.type;
      if (type?.includes('task')) {
        navigate('/freelance/task');
      } else if (type?.includes('project')) {
        navigate('/freelance/progetti');
      } else if (type?.includes('message') || type?.includes('chat')) {
        navigate('/freelance/chat');
      } else if (type?.includes('calendar') || type?.includes('reminder')) {
        navigate('/freelance/calendario');
      }
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    const type = notification.type || notification.data?.type || '';
    
    if (type.includes('task') || type.includes('Task')) {
      return <CheckSquare size={18} />;
    } else if (type.includes('project') || type.includes('Project')) {
      return <FolderKanban size={18} />;
    } else if (type.includes('message') || type.includes('chat') || type.includes('Message')) {
      return <MessageSquare size={18} />;
    } else if (type.includes('calendar') || type.includes('reminder') || type.includes('deadline')) {
      return <Calendar size={18} />;
    } else if (type.includes('scadenza') || type.includes('deadline')) {
      return <Clock size={18} />;
    }
    return <Bell size={18} />;
  };

  const getNotificationTypeLabel = (notification: Notification): string => {
    const type = notification.type || notification.data?.type || '';
    
    if (type.includes('task_assigned') || type.includes('TaskAssigned')) {
      return 'Task Assegnato';
    } else if (type.includes('task_request') || type.includes('TaskRequest')) {
      return 'Richiesta Task';
    } else if (type.includes('project_added') || type.includes('ProjectAdded')) {
      return 'Aggiunto al Progetto';
    } else if (type.includes('message') || type.includes('chat')) {
      return 'Messaggio';
    } else if (type.includes('reminder')) {
      return 'Promemoria';
    } else if (type.includes('deadline') || type.includes('scadenza')) {
      return 'Scadenza';
    }
    return 'Notifica';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const filteredNotifications = notifications.filter(n => {
    // Filter by status
    if (filterStatus === 'non_lette' && n.read_at) return false;
    if (filterStatus === 'lette' && !n.read_at) return false;
    if (filterStatus === 'urgenti') {
      // Check if urgent based on type or data
      const type = n.type || n.data?.type || '';
      const isUrgent = type.includes('urgent') || 
                      type.includes('deadline') || 
                      type.includes('scadenza') ||
                      (n.data?.status === 'urgent');
      if (!isUrgent) return false;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const title = n.data?.title || '';
      const message = n.data?.message || '';
      return (
        title.toLowerCase().includes(query) ||
        message.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;
  const urgentCount = notifications.filter(n => {
    const type = n.type || n.data?.type || '';
    return type.includes('urgent') || type.includes('deadline') || type.includes('scadenza');
  }).length;

  if (loading) {
    return (
      <div className="freelance-notifications-loading">
        <div className="freelance-notifications-spinner"></div>
      </div>
    );
  }

  return (
    <div className="freelance-notifications-page">
      <GuideTour steps={freelanceNotificheTourSteps} tourId="freelance-notifiche-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      {/* Header */}
      <div className="freelance-notifications-header">
        <button className="freelance-notifications-back" onClick={() => navigate('/freelance')}>
          <ArrowLeft size={18} />
          Indietro
        </button>

        <div className="freelance-notifications-title-section">
          <h1>Centro Notifiche</h1>
          {unreadCount > 0 && (
            <span className="freelance-notifications-unread-badge">{unreadCount} non lette</span>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="freelance-notifications-controls">
        <div className="freelance-notifications-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Cerca notifiche..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="freelance-notifications-filters">
          {[
            { key: 'tutte', label: 'Tutte' },
            { key: 'non_lette', label: 'Non lette' },
            { key: 'lette', label: 'Lette' },
            { key: 'urgenti', label: `Urgenti${urgentCount > 0 ? ` (${urgentCount})` : ''}` },
          ].map(filter => (
            <button
              key={filter.key}
              className={`freelance-notifications-filter-tab ${filterStatus === filter.key ? 'active' : ''}`}
              onClick={() => setFilterStatus(filter.key as any)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button 
            className="freelance-notifications-mark-all-read"
            onClick={handleMarkAllAsRead}
          >
            Segna tutte come lette
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="freelance-notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="freelance-notifications-empty">
            <Bell size={48} />
            <p>Nessuna notifica trovata</p>
          </div>
        ) : (
          filteredNotifications.map(notification => {
            const isRead = !!notification.read_at;
            const isUrgent = (notification.type || notification.data?.type || '').includes('urgent') ||
                           (notification.type || notification.data?.type || '').includes('deadline') ||
                           (notification.type || notification.data?.type || '').includes('scadenza');
            
            return (
              <div
                key={notification.id}
                className={`freelance-notification-card ${!isRead ? 'unread' : ''} ${isUrgent ? 'urgent' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="freelance-notification-icon">
                  {getNotificationIcon(notification)}
                </div>
                <div className="freelance-notification-content">
                  <div className="freelance-notification-header">
                    <span className="freelance-notification-type">
                      {getNotificationTypeLabel(notification)}
                    </span>
                    <span className="freelance-notification-time">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  <div className="freelance-notification-title">
                    {notification.data?.title || 'Notifica'}
                  </div>
                  <div className="freelance-notification-message">
                    {notification.data?.message || ''}
                  </div>
                  {isUrgent && (
                    <div className="freelance-notification-urgent-badge">
                      <AlertCircle size={12} />
                      Urgente
                    </div>
                  )}
                </div>
                {!isRead && (
                  <div className="freelance-notification-unread-dot" />
                )}
                <div className="freelance-notification-actions">
                  {!isRead && (
                    <button
                      className="freelance-notification-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      title="Segna come letta"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FreelanceNotificationsPage;
