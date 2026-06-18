import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Send } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';

interface Message {
    id: number;
    user_id: number;
    message: string;
    created_at: string;
    user: {
        name: string;
        avatar?: string;
    };
    is_me: boolean;
}

interface ChatProps {
    projectId: string;
}

export function Chat({ projectId }: ChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [projectId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const response = await api.get(`/projects/${projectId}/messages`);
            // Add is_me flag
            const formattedMessages = response.data.map((msg: any) => ({
                ...msg,
                is_me: msg.user_id === user?.id
            }));
            setMessages(formattedMessages);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to fetch messages', error);
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await api.post(`/projects/${projectId}/messages`, {
                message: newMessage
            });
            setNewMessage('');
            fetchMessages();
        } catch (error) {
            console.error('Failed to send message', error);
        }
    };

    return (
        <div className="glass-card rounded-xl flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white">
                    Chat del Progetto
                </h3>
                <div className="text-xs text-slate-500">
                    {messages.length} messaggi
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="text-center text-slate-500 mt-10">Caricamento messaggi...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-slate-500 mt-10">Nessun messaggio. Inizia la conversazione!</div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.is_me ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[80%] ${msg.is_me ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                                    {msg.user.avatar ? (
                                        <img src={msg.user.avatar} alt={msg.user.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-slate-400">
                                            {msg.user.name.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <div className={`flex items-baseline gap-2 mb-1 ${msg.is_me ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-xs font-medium text-slate-300">{msg.user.name}</span>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div
                                        className={`p-3 rounded-2xl text-sm ${msg.is_me
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-slate-800 text-slate-200 rounded-tl-none'
                                            }`}
                                    >
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
}
