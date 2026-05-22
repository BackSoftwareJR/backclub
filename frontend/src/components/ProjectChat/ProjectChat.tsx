import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, User, MessageSquare, Users as UsersIcon } from 'lucide-react';
import './ProjectChat.css';

interface ChatMessage {
    id: number;
    user_id: number;
    user: {
        id: number;
        name: string;
        avatar?: string;
    };
    message: string;
    created_at: string;
    is_read: boolean;
    parent_message_id?: number;
}

interface ProjectChatProps {
    projectId: number;
    isPmChat: boolean; // true = PM chat, false = General chat
    currentUserId: number;
}

const ProjectChat: React.FC<ProjectChatProps> = ({ projectId, isPmChat, currentUserId }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load messages
    useEffect(() => {
        loadMessages();
        // Polling every 5 seconds for new messages
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [projectId, isPmChat]);

    const loadMessages = async () => {
        try {
            // TODO: Implement API call
            // const response = await chatApi.getMessages(projectId, { is_pm_chat: isPmChat });
            // setMessages(response.data);

            // Mock data - in produzione questo caricherà dalla API
            // Non fare nulla per ora per evitare di sovrascrivere i messaggi locali
            // In produzione, fare merge intelligente basato su message ID
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const tempMessage = newMessage;
        setNewMessage(''); // Clear immediately for better UX

        setSending(true);
        try {
            // TODO: Implement API call
            // await chatApi.sendMessage(projectId, { message: tempMessage, is_pm_chat: isPmChat });

            // Add message to list
            const mockMessage: ChatMessage = {
                id: Date.now(),
                user_id: currentUserId,
                user: { id: currentUserId, name: 'Tu' },
                message: tempMessage,
                created_at: new Date().toISOString(),
                is_read: false
            };
            setMessages(prev => [...prev, mockMessage]);
            inputRef.current?.focus();
        } catch (error) {
            console.error('Error sending message:', error);
            // Restore message on error
            setNewMessage(tempMessage);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="project-chat-container">
            <div className="chat-header">
                <h3>
                    {isPmChat ? (
                        <>
                            <MessageSquare size={20} style={{ marginRight: '8px' }} />
                            Chat Project Manager
                        </>
                    ) : (
                        <>
                            <UsersIcon size={20} style={{ marginRight: '8px' }} />
                            Chat Generale
                        </>
                    )}
                </h3>
                <p className="chat-description">
                    {isPmChat
                        ? 'Comunicazioni riservate con il PM'
                        : 'Chat condivisa con tutto il team'}
                </p>
            </div>

            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <p>Nessun messaggio ancora</p>
                        <small>Inizia la conversazione!</small>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.user_id === currentUserId;
                        return (
                            <div key={msg.id} className={`message ${isOwn ? 'message-own' : 'message-other'}`}>
                                {!isOwn && (
                                    <div className="message-avatar">
                                        {msg.user.avatar ? (
                                            <img src={msg.user.avatar} alt={msg.user.name} />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                <User size={16} />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="message-content">
                                    {!isOwn && <div className="message-author">{msg.user.name}</div>}
                                    <div className="message-bubble">
                                        <p>{msg.message}</p>
                                    </div>
                                    <div className="message-time">{formatTime(msg.created_at)}</div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSendMessage}>
                <button type="button" className="btn-attach" title="Allega file">
                    <Paperclip size={20} />
                </button>
                <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scrivi un messaggio..."
                    rows={1}
                    disabled={sending}
                />
                <button type="button" className="btn-emoji" title="Emoji">
                    <Smile size={20} />
                </button>
                <button
                    type="submit"
                    className="btn-send"
                    disabled={!newMessage.trim() || sending}
                    title="Invia messaggio"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default ProjectChat;
