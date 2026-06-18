import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Paperclip,
  ChevronLeft,
  Search,
  Plus,
  Briefcase,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { freelanceApi } from '../../api/freelance';
import { freelanceCrmApi } from '../../api/freelanceCrm';
import { crmProjectPmChatApi, type CrmProjectPmChatMessage } from '../../api/crmProjects';
import type { ProjectChatChannel } from '../../types/freelance';
import type { FreelanceProject } from '../../types/freelance';
import GuideTour from '../../components/Guide/GuideTour';
import { freelanceChatTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import BottomSheet from '../../components/Mobile/BottomSheet';
import { hapticButtonPress } from '../../utils/hapticFeedback';
import './FreelanceChatPage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatListTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
  if (isToday) return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Ieri';
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

const formatDateSeparator = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  if (date.toDateString() === now.toDateString()) return 'Oggi';
  if (date.toDateString() === yesterday.toDateString()) return 'Ieri';
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
};

const isSameDay = (a: string, b: string): boolean =>
  new Date(a).toDateString() === new Date(b).toDateString();

const isSameGroup = (a: CrmProjectPmChatMessage, b: CrmProjectPmChatMessage): boolean => {
  if (a.user_id !== b.user_id) return false;
  const diff = Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return diff < 5 * 60 * 1000; // 5 minutes
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar: React.FC<{ name?: string; size?: number }> = ({ name, size = 28 }) => {
  const initial = name?.charAt(0).toUpperCase() ?? 'U';
  const colors = [
    '#5856D6', '#AF52DE', '#FF2D55', '#FF9500', '#34C759',
    '#007AFF', '#5AC8FA', '#FFCC00', '#FF6B6B', '#6BCB77',
  ];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div
      className="fcp-avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.43 }}
    >
      {initial}
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: CrmProjectPmChatMessage;
  isMine: boolean;
  showMeta: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine, showMeta }) => (
  <motion.div
    className={`fcp-msg-wrap ${isMine ? 'fcp-msg-wrap--sent' : 'fcp-msg-wrap--received'}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
  >
    {!isMine && (
      <div className="fcp-msg-avatar-slot">
        {showMeta ? <Avatar name={message.user?.name} /> : <div style={{ width: 28 }} />}
      </div>
    )}
    <div className={`fcp-msg-content ${isMine ? 'fcp-msg-content--sent' : ''}`}>
      {!isMine && showMeta && message.user?.name && (
        <span className="fcp-msg-sender">{message.user.name}</span>
      )}
      <div className={`fcp-bubble ${isMine ? 'fcp-bubble--sent' : 'fcp-bubble--received'}`}>
        {message.message && (
          <p className="fcp-bubble-text">{message.message}</p>
        )}
        {message.media_path && (
          <div className="fcp-bubble-media">
            <a
              href={message.media_url || message.media_path}
              target="_blank"
              rel="noopener noreferrer"
              className="fcp-bubble-media-link"
            >
              📎 {message.media_name || 'Allegato'}
            </a>
          </div>
        )}
      </div>
      <span className="fcp-msg-time">{formatMessageTime(message.created_at)}</span>
    </div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const FreelanceChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ProjectChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [messages, setMessages] = useState<CrmProjectPmChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatSheet, setShowNewChatSheet] = useState(false);
  const [projectsForNewChat, setProjectsForNewChat] = useState<FreelanceProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [mobileView, setMobileView] = useState<'list' | 'conversation'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch channels ──────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchChannels = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const data = isCrmScoped && crmDepartmentCode
          ? await freelanceCrmApi.getChatChannels(crmDepartmentCode)
          : await freelanceApi.getChatChannels();
        setChannels(data);
        if (data.length > 0 && !selectedChannel) {
          setSelectedChannel(data[0].projectId);
        }
      } catch (error) {
        console.error('Error loading chat channels:', error);
        setChannels([]);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isCrmScoped, crmDepartmentCode]);

  // ── Fetch + poll messages ───────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (!selectedChannel) return;
    try {
      const response = await crmProjectPmChatApi.getMessages(selectedChannel);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  }, [selectedChannel]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Auto-resize textarea ────────────────────────────────────────────────────

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!selectedChannel || !messageText.trim() || sending) return;
    setSending(true);
    try {
      await crmProjectPmChatApi.sendMessage(selectedChannel, {
        message: messageText,
        message_type: 'text',
      });
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      const response = await crmProjectPmChatApi.getMessages(selectedChannel);
      setMessages(response.data || []);
      setChannels((prev) =>
        prev.map((ch) =>
          ch.projectId === selectedChannel ? { ...ch, unreadCount: 0 } : ch
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      alert("Errore nell'invio del messaggio");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── New chat project ────────────────────────────────────────────────────────

  const openNewChatProject = (project: FreelanceProject) => {
    hapticButtonPress();
    const exists = channels.some((c) => c.projectId === project.id);
    if (!exists) {
      setChannels((prev) => [
        { projectId: project.id, projectName: project.name, lastMessage: undefined, unreadCount: 0, manager: undefined },
        ...prev,
      ]);
    }
    setSelectedChannel(project.id);
    setMobileView('conversation');
    setShowNewChatSheet(false);
  };

  const loadProjectsForNewChat = async () => {
    setLoadingProjects(true);
    try {
      const list = isCrmScoped && crmDepartmentCode
        ? await freelanceCrmApi.getProjects(crmDepartmentCode)
        : await freelanceApi.getFreelancerProjects();
      setProjectsForNewChat(list || []);
    } catch (e) {
      console.error(e);
      setProjectsForNewChat([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const currentChannel = channels.find((ch) => ch.projectId === selectedChannel);

  const filteredChannels = searchQuery.trim()
    ? channels.filter((ch) =>
        ch.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : channels;

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fcp-root fcp-loading">
        <div className="fcp-spinner" />
      </div>
    );
  }

  // ── Render: messages list ───────────────────────────────────────────────────

  const renderMessages = () => (
    <div className="fcp-messages" ref={messagesContainerRef}>
      {messages.length === 0 ? (
        <div className="fcp-messages-empty">
          <MessageSquare size={40} strokeWidth={1.2} />
          <p>{t('freelance.no_message')}</p>
          <span>Invia un messaggio per iniziare</span>
        </div>
      ) : (
        messages.map((message, index) => {
          const isMine = message.user_id === user?.id;
          const isFirst = index === 0;
          const prevMsg = isFirst ? null : messages[index - 1];
          const showDateSep = isFirst || !isSameDay(messages[index - 1].created_at, message.created_at);
          const isGroupStart = isFirst || !prevMsg || !isSameGroup(prevMsg, message);

          return (
            <React.Fragment key={message.id}>
              {showDateSep && (
                <div className="fcp-date-sep">
                  <span>{formatDateSeparator(message.created_at)}</span>
                </div>
              )}
              <MessageBubble
                message={message}
                isMine={isMine}
                showMeta={isGroupStart}
              />
            </React.Fragment>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // ── Render: input bar ───────────────────────────────────────────────────────

  const renderInputBar = () => (
    <div className="fcp-input-bar">
      <button
        type="button"
        className="fcp-input-attach"
        title="Allega file"
        aria-label="Allega"
      >
        <Paperclip size={20} />
      </button>
      <textarea
        ref={textareaRef}
        className="fcp-input"
        placeholder="Messaggio"
        value={messageText}
        onChange={(e) => { setMessageText(e.target.value); autoResize(); }}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={sending}
      />
      <AnimatePresence>
        {messageText.trim() && (
          <motion.button
            type="button"
            className="fcp-input-send"
            onClick={handleSendMessage}
            disabled={sending}
            aria-label="Invia"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 20 }}
            whileTap={{ scale: 0.9 }}
          >
            <Send size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );

  // ── Mobile: list view ───────────────────────────────────────────────────────

  const renderMobileList = () => (
    <div className="fcp-mobile-list">
      <div className="fcp-mobile-list-header">
        <h1 className="fcp-mobile-list-title">Chat</h1>
        <button
          type="button"
          className="fcp-mobile-new-btn"
          onClick={() => { hapticButtonPress(); setShowNewChatSheet(true); loadProjectsForNewChat(); }}
          aria-label="Nuova chat"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="fcp-search-wrap">
        <Search size={15} className="fcp-search-icon" />
        <input
          type="search"
          className="fcp-search-input"
          placeholder="Cerca..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="fcp-channel-list">
        {filteredChannels.length === 0 ? (
          <div className="fcp-channel-list-empty">
            <MessageSquare size={48} strokeWidth={1.2} />
            <p>{searchQuery.trim() ? t('freelance.no_chat_found') : t('freelance.no_chat_yet')}</p>
            {!searchQuery.trim() && (
              <button
                type="button"
                className="fcp-channel-list-empty-btn"
                onClick={() => { setShowNewChatSheet(true); loadProjectsForNewChat(); }}
              >
                Nuova chat
              </button>
            )}
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <button
              key={channel.projectId}
              type="button"
              className="fcp-channel-item"
              onClick={() => { hapticButtonPress(); setSelectedChannel(channel.projectId); setMobileView('conversation'); }}
            >
              <div className="fcp-channel-item-icon">
                <Briefcase size={18} />
              </div>
              <div className="fcp-channel-item-body">
                <div className="fcp-channel-item-row">
                  <span className="fcp-channel-item-name">{channel.projectName}</span>
                  {channel.lastMessage && (
                    <span className="fcp-channel-item-time">
                      {formatListTime(channel.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                <p className="fcp-channel-item-preview">
                  {channel.lastMessage
                    ? `${channel.lastMessage.user_id === user?.id ? 'Tu: ' : ''}${(channel.lastMessage.message ?? 'Messaggio').substring(0, 55)}${(channel.lastMessage.message?.length ?? 0) > 55 ? '…' : ''}`
                    : <em>{t('freelance.no_message')}</em>}
                </p>
              </div>
              {channel.unreadCount > 0 && (
                <span className="fcp-badge">{channel.unreadCount}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  // ── Mobile: conversation view ───────────────────────────────────────────────

  const renderMobileConversation = () => {
    if (!selectedChannel || !currentChannel) return null;
    return (
      <div className="fcp-mobile-conv">
        <header className="fcp-conv-header">
          <button
            type="button"
            className="fcp-conv-back"
            onClick={() => { hapticButtonPress(); setMobileView('list'); }}
            aria-label="Indietro"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="fcp-conv-info">
            <h2 className="fcp-conv-title">{currentChannel.projectName}</h2>
            {currentChannel.manager && (
              <p className="fcp-conv-subtitle">{currentChannel.manager.name}</p>
            )}
          </div>
          <button type="button" className="fcp-conv-action" aria-label="Info">
            <Info size={20} />
          </button>
        </header>
        {renderMessages()}
        {renderInputBar()}
      </div>
    );
  };

  // ── Desktop: channel sidebar ────────────────────────────────────────────────

  const renderSidebar = () => (
    <div className="fcp-sidebar">
      <div className="fcp-sidebar-top">
        <h2 className="fcp-sidebar-title">Messaggi</h2>
        <div className="fcp-search-wrap fcp-search-wrap--sidebar">
          <Search size={13} className="fcp-search-icon" />
          <input
            type="search"
            className="fcp-search-input"
            placeholder="Cerca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="fcp-sidebar-section-label">CANALI</div>

      <div className="fcp-channel-list fcp-channel-list--sidebar">
        {filteredChannels.length === 0 ? (
          <div className="fcp-sidebar-empty">
            <MessageSquare size={28} strokeWidth={1.2} />
            <p>{t('freelance.no_projects_available')}</p>
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <button
              key={channel.projectId}
              type="button"
              className={`fcp-channel-item fcp-channel-item--sidebar${selectedChannel === channel.projectId ? ' fcp-channel-item--active' : ''}`}
              onClick={() => setSelectedChannel(channel.projectId)}
            >
              <div className="fcp-channel-item-icon">
                <MessageSquare size={15} />
              </div>
              <div className="fcp-channel-item-body">
                <div className="fcp-channel-item-row">
                  <span className="fcp-channel-item-name">{channel.projectName}</span>
                  {channel.lastMessage && (
                    <span className="fcp-channel-item-time">
                      {formatListTime(channel.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                {channel.lastMessage && (
                  <p className="fcp-channel-item-preview">
                    {(channel.lastMessage.message ?? 'Messaggio').substring(0, 40)}
                    {(channel.lastMessage.message?.length ?? 0) > 40 ? '…' : ''}
                  </p>
                )}
              </div>
              {channel.unreadCount > 0 && (
                <span className="fcp-badge">{channel.unreadCount}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  // ── Desktop: main conversation area ────────────────────────────────────────

  const renderDesktopMain = () => (
    <div className="fcp-main">
      <AnimatePresence mode="wait">
        {selectedChannel && currentChannel ? (
          <motion.div
            key={selectedChannel}
            className="fcp-main-inner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <header className="fcp-conv-header">
              <div className="fcp-conv-info">
                <h2 className="fcp-conv-title">{currentChannel.projectName}</h2>
                {currentChannel.manager && (
                  <p className="fcp-conv-subtitle">
                    Manager: {currentChannel.manager.name}
                  </p>
                )}
              </div>
              <div className="fcp-conv-actions">
                <button type="button" className="fcp-conv-action" aria-label="Cerca">
                  <Search size={18} />
                </button>
                <button type="button" className="fcp-conv-action" aria-label="Info">
                  <Info size={18} />
                </button>
              </div>
            </header>

            {renderMessages()}
            {renderInputBar()}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="fcp-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="fcp-empty-icon">
              <MessageSquare size={56} strokeWidth={1} />
            </div>
            <h2>Seleziona una conversazione</h2>
            <p>Scegli un progetto per iniziare a chattare</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ── Root render ─────────────────────────────────────────────────────────────

  return (
    <div className={`fcp-root${isMobile ? ' fcp-root--mobile' : ''}`}>
      <GuideTour steps={freelanceChatTourSteps} tourId="freelance-chat-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />

      {isMobile ? (
        <>
          {mobileView === 'list' && renderMobileList()}
          {mobileView === 'conversation' && renderMobileConversation()}
        </>
      ) : (
        <>
          {renderSidebar()}
          {renderDesktopMain()}
        </>
      )}

      <BottomSheet
        isOpen={showNewChatSheet}
        onClose={() => setShowNewChatSheet(false)}
        title="Nuova chat"
        snapPoints={[70, 90]}
      >
        <div className="fcp-new-sheet">
          {loadingProjects ? (
            <div className="fcp-new-sheet-loading">
              <div className="fcp-spinner" />
              <p>{t('freelance.loading_projects')}</p>
            </div>
          ) : projectsForNewChat.length === 0 ? (
            <p className="fcp-new-sheet-empty">{t('freelance.no_projects_available')}</p>
          ) : (
            <ul className="fcp-new-sheet-list">
              {projectsForNewChat.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    className="fcp-new-sheet-item"
                    onClick={() => openNewChatProject(project)}
                  >
                    <div className="fcp-new-sheet-avatar">
                      <Briefcase size={20} />
                    </div>
                    <span className="fcp-new-sheet-name">{project.name}</span>
                    <ChevronLeft size={18} className="fcp-new-sheet-chevron" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};

export default FreelanceChatPage;
