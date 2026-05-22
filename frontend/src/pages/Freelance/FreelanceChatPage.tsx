import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Send,
  Paperclip,
  ChevronLeft,
  Search,
  Plus,
  Briefcase,
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

  /** Su mobile: 'list' = lista chat, 'conversation' = conversazione aperta */
  const [mobileView, setMobileView] = useState<'list' | 'conversation'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const data =
          isCrmScoped && crmDepartmentCode
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
  }, [user?.id, isCrmScoped, crmDepartmentCode]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChannel) return;
      try {
        const response = await crmProjectPmChatApi.getMessages(selectedChannel);
        setMessages(response.data || []);
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!selectedChannel || !messageText.trim() || sending) return;
    setSending(true);
    try {
      await crmProjectPmChatApi.sendMessage(selectedChannel, {
        message: messageText,
        message_type: 'text',
      });
      setMessageText('');
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const formatListTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    if (isToday) return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return 'Ieri';
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const currentChannel = channels.find((ch) => ch.projectId === selectedChannel);

  /** Canali filtrati per ricerca (nome progetto) */
  const filteredChannels = searchQuery.trim()
    ? channels.filter((ch) =>
        ch.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : channels;

  const openNewChatProject = (project: FreelanceProject) => {
    hapticButtonPress();
    const exists = channels.some((c) => c.projectId === project.id);
    if (!exists) {
      setChannels((prev) => [
        {
          projectId: project.id,
          projectName: project.name,
          lastMessage: undefined,
          unreadCount: 0,
          manager: undefined,
        },
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

  if (loading) {
    return (
      <div className="freelance-chat freelance-chat-loading">
        <div className="freelance-spinner" />
      </div>
    );
  }

  // ---------- Mobile: vista lista (stile WhatsApp) ----------
  const renderMobileList = () => (
    <div className="freelance-chat-mobile-list">
      <div className="freelance-chat-mobile-list-header">
        <h1 className="freelance-chat-mobile-list-title">Chat</h1>
        <button
          type="button"
          className="freelance-chat-mobile-new-btn"
          onClick={() => {
            hapticButtonPress();
            setShowNewChatSheet(true);
            loadProjectsForNewChat();
          }}
          aria-label="Nuova chat"
        >
          <Plus size={24} />
        </button>
      </div>
      <div className="freelance-chat-mobile-search-wrap">
        <Search size={18} className="freelance-chat-mobile-search-icon" />
        <input
          type="search"
          className="freelance-chat-mobile-search"
          placeholder={t('freelance.search_chat')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Cerca"
        />
      </div>
      <div className="freelance-chat-mobile-channels">
        {filteredChannels.length > 0 ? (
          filteredChannels.map((channel) => (
            <button
              key={channel.projectId}
              type="button"
              className="freelance-chat-mobile-channel"
              onClick={() => {
                hapticButtonPress();
                setSelectedChannel(channel.projectId);
                setMobileView('conversation');
              }}
            >
              <div className="freelance-chat-mobile-channel-avatar">
                <Briefcase size={20} />
              </div>
              <div className="freelance-chat-mobile-channel-body">
                <div className="freelance-chat-mobile-channel-row">
                  <span className="freelance-chat-mobile-channel-name">{channel.projectName}</span>
                  {channel.lastMessage && (
                    <span className="freelance-chat-mobile-channel-time">
                      {formatListTime(channel.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                {channel.lastMessage ? (
                  <p className="freelance-chat-mobile-channel-preview">
                    {channel.lastMessage.user_id === user?.id ? 'Tu: ' : ''}
                    {channel.lastMessage.message?.substring(0, 60) || 'Messaggio'}
                    {(channel.lastMessage.message?.length ?? 0) > 60 ? '...' : ''}
                  </p>
                ) : (
                  <p className="freelance-chat-mobile-channel-preview freelance-chat-mobile-channel-preview-empty">
                    {t('freelance.no_message')}
                  </p>
                )}
              </div>
              {channel.unreadCount > 0 && (
                <span className="freelance-chat-mobile-channel-badge">{channel.unreadCount}</span>
              )}
            </button>
          ))
        ) : (
          <div className="freelance-chat-mobile-empty-list">
            <MessageSquare size={48} />
            <p>
              {searchQuery.trim() ? t('freelance.no_chat_found') : t('freelance.no_chat_yet')}
            </p>
            {!searchQuery.trim() && (
              <button
                type="button"
                className="freelance-chat-mobile-empty-new"
                onClick={() => {
                  setShowNewChatSheet(true);
                  loadProjectsForNewChat();
                }}
              >
                Nuova chat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ---------- Mobile: vista conversazione ----------
  const renderMobileConversation = () => {
    if (!selectedChannel || !currentChannel) return null;
    return (
      <div className="freelance-chat-mobile-conv">
        <header className="freelance-chat-mobile-conv-header">
          <button
            type="button"
            className="freelance-chat-mobile-conv-back"
            onClick={() => {
              hapticButtonPress();
              setMobileView('list');
            }}
            aria-label="Indietro"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="freelance-chat-mobile-conv-info">
            <h2 className="freelance-chat-mobile-conv-title">{currentChannel.projectName}</h2>
            {currentChannel.manager && (
              <p className="freelance-chat-mobile-conv-subtitle">
                {currentChannel.manager.name}
              </p>
            )}
          </div>
        </header>
        <div
          className="freelance-chat-mobile-messages"
          ref={messagesContainerRef}
        >
          {messages.length > 0 ? (
            messages.map((message, index) => {
              const isMyMessage = message.user_id === user?.id;
              const showAvatar =
                index === 0 || messages[index - 1].user_id !== message.user_id;
              return (
                <div
                  key={message.id}
                  className={`freelance-chat-bubble-wrap ${isMyMessage ? 'sent' : 'received'}`}
                >
                  {!isMyMessage && showAvatar && (
                    <div className="freelance-chat-bubble-avatar">
                      {message.user?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                  )}
                  <div className="freelance-chat-bubble-content">
                    {!isMyMessage && showAvatar && (
                      <span className="freelance-chat-bubble-name">
                        {message.user?.name || 'Utente'}
                      </span>
                    )}
                    <div className="freelance-chat-bubble">
                      {message.message && (
                        <p className="freelance-chat-bubble-text">{message.message}</p>
                      )}
                      {message.media_path && (
                        <div className="freelance-chat-bubble-media">
                          <a
                            href={message.media_url || message.media_path}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {message.media_name || 'Allegato'}
                          </a>
                        </div>
                      )}
                      <span className="freelance-chat-bubble-time">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="freelance-chat-mobile-empty-messages">
              <MessageSquare size={40} />
              <p>{t('freelance.no_message')}</p>
              <p className="freelance-chat-mobile-empty-messages-hint">
                Invia un messaggio per iniziare
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="freelance-chat-mobile-input-bar">
          <button
            type="button"
            className="freelance-chat-mobile-input-attach"
            title="Allega file"
            aria-label="Allega"
          >
            <Paperclip size={22} />
          </button>
          <textarea
            className="freelance-chat-mobile-input"
            placeholder="Messaggio"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
            disabled={sending}
          />
          <button
            type="button"
            className="freelance-chat-mobile-input-send"
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sending}
            aria-label="Invia"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    );
  };

  // ---------- Render: mobile = list o conversation, desktop = layout sidebar + main ----------
  return (
    <div className={`freelance-chat ${isMobile ? 'freelance-chat-mobile' : ''}`}>
      <GuideTour steps={freelanceChatTourSteps} tourId="freelance-chat-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />

      {isMobile ? (
        <>
          {mobileView === 'list' && renderMobileList()}
          {mobileView === 'conversation' && renderMobileConversation()}
        </>
      ) : (
        <>
          <div className="freelance-chat-sidebar">
            <div className="freelance-chat-sidebar-header">
              <h2 className="freelance-chat-sidebar-title">Chat</h2>
              <div className="freelance-chat-desktop-search-wrap">
                <Search size={16} />
                <input
                  type="search"
                  className="freelance-chat-desktop-search"
                  placeholder={t('freelance.search_projects')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="freelance-chat-sidebar-channels">
              {filteredChannels.length > 0 ? (
                filteredChannels.map((channel) => (
                  <div
                    key={channel.projectId}
                    role="button"
                    tabIndex={0}
                    className={`freelance-chat-channel ${selectedChannel === channel.projectId ? 'active' : ''}`}
                    onClick={() => setSelectedChannel(channel.projectId)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && setSelectedChannel(channel.projectId)
                    }
                  >
                    <div className="freelance-chat-channel-icon">
                      <MessageSquare size={20} />
                      {channel.unreadCount > 0 && (
                        <span className="freelance-chat-channel-badge">
                          {channel.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="freelance-chat-channel-content">
                      <div className="freelance-chat-channel-name">{channel.projectName}</div>
                      {channel.lastMessage && (
                        <div className="freelance-chat-channel-preview">
                          {channel.lastMessage.message?.substring(0, 50) || 'Messaggio'}
                          {(channel.lastMessage.message?.length ?? 0) > 50 && '...'}
                        </div>
                      )}
                    </div>
                    {channel.lastMessage && (
                      <div className="freelance-chat-channel-time">
                        {formatListTime(channel.lastMessage.created_at)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="freelance-empty-state">
                  <MessageSquare size={32} />
                  <p>{t('freelance.no_projects_available')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="freelance-chat-main">
            {selectedChannel && currentChannel ? (
              <>
                <div className="freelance-chat-header">
                  <div>
                    <h2 className="freelance-chat-header-title">
                      {currentChannel.projectName}
                    </h2>
                    {currentChannel.manager && (
                      <p className="freelance-chat-header-subtitle">
                        Manager: {currentChannel.manager.name}
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="freelance-chat-messages"
                  ref={messagesContainerRef}
                >
                  {messages.length > 0 ? (
                    messages.map((message, index) => {
                      const isMyMessage = message.user_id === user?.id;
                      const showAvatar =
                        index === 0 || messages[index - 1].user_id !== message.user_id;
                      return (
                        <div
                          key={message.id}
                          className={`freelance-chat-message ${isMyMessage ? 'my-message' : 'other-message'}`}
                        >
                          {!isMyMessage && showAvatar && (
                            <div className="freelance-chat-message-avatar">
                              {message.user?.name?.charAt(0).toUpperCase() ?? 'U'}
                            </div>
                          )}
                          <div className="freelance-chat-message-content">
                            {!isMyMessage && showAvatar && (
                              <div className="freelance-chat-message-name">
                                {message.user?.name || 'Utente'}
                              </div>
                            )}
                            <div className="freelance-chat-message-bubble">
                              {message.message && (
                                <p className="freelance-chat-message-text">{message.message}</p>
                              )}
                              {message.media_path && (
                                <div className="freelance-chat-message-media">
                                  <a
                                    href={message.media_url || message.media_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="freelance-chat-message-media-link"
                                  >
                                    {message.media_name || 'Allegato'}
                                  </a>
                                </div>
                              )}
                              <div className="freelance-chat-message-time">
                                {formatMessageTime(message.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="freelance-empty-state">
                      <MessageSquare size={48} />
                      <p>{t('freelance.no_message')} ancora</p>
                      <p className="freelance-empty-state-subtitle">
                        Inizia la conversazione inviando un messaggio
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="freelance-chat-input-area">
                  <button className="freelance-chat-input-attach" title="Allega file">
                    <Paperclip size={20} />
                  </button>
                  <textarea
                    className="freelance-chat-input"
                    placeholder="Scrivi un messaggio..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows={1}
                    disabled={sending}
                  />
                  <button
                    className="freelance-chat-input-send"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                    title="Invia"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="freelance-chat-empty">
                <MessageSquare size={64} />
                <h2>Seleziona un progetto</h2>
                <p>Scegli un progetto dalla lista per iniziare a chattare</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom sheet: Nuova chat - Scegli progetto */}
      <BottomSheet
        isOpen={showNewChatSheet}
        onClose={() => setShowNewChatSheet(false)}
        title="Nuova chat"
        snapPoints={[70, 90]}
      >
        <div className="freelance-chat-new-sheet">
          {loadingProjects ? (
            <div className="freelance-chat-new-sheet-loading">
              <div className="freelance-spinner" />
              <p>{t('freelance.loading_projects')}</p>
            </div>
          ) : projectsForNewChat.length === 0 ? (
            <p className="freelance-chat-new-sheet-empty">{t('freelance.no_projects_available')}</p>
          ) : (
            <ul className="freelance-chat-new-sheet-list">
              {projectsForNewChat.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    className="freelance-chat-new-sheet-item"
                    onClick={() => openNewChatProject(project)}
                  >
                    <div className="freelance-chat-new-sheet-avatar">
                      <Briefcase size={20} />
                    </div>
                    <span className="freelance-chat-new-sheet-name">{project.name}</span>
                    <ChevronLeft size={20} className="freelance-chat-new-sheet-chevron" />
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
