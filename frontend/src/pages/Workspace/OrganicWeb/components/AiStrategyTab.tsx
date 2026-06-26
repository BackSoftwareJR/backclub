import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Brain, Send, Loader, Sparkles, Bot, User, RefreshCw, AlertCircle,
    Plus, Trash2, FileText, X, MessageSquare,
} from 'lucide-react';
import organicWebApi from '../../../../api/organicWeb';
import type { AiReport, ChatSession, ChatMessage } from '../../../../api/organicWeb';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiStrategyTabProps {
    projectId: number;
}

interface AttachedFile {
    name: string;
    content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderMarkdown = (md: string): string =>
    md
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
        .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
        .replace(/^---$/gm, '<hr/>')
        .replace(/\n\n/g, '<br/><br/>');

const groupSessions = (sessions: ChatSession[]) => {
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayStr = new Date(now.getTime() - 86_400_000).toDateString();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const groups: { label: string; items: ChatSession[] }[] = [
        { label: 'Oggi', items: [] },
        { label: 'Ieri', items: [] },
        { label: 'Questo mese', items: [] },
        { label: 'Precedenti', items: [] },
    ];

    for (const s of sessions) {
        const d = new Date(s.created_at);
        if (d.toDateString() === todayStr) groups[0].items.push(s);
        else if (d.toDateString() === yesterdayStr) groups[1].items.push(s);
        else if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) groups[2].items.push(s);
        else groups[3].items.push(s);
    }

    return groups.filter(g => g.items.length > 0);
};

// ─── Session Sidebar ──────────────────────────────────────────────────────────

interface SessionSidebarProps {
    sessions: ChatSession[];
    activeSessionId: number | null;
    loading: boolean;
    onSelect: (id: number) => void;
    onNew: () => void;
    onDelete: (id: number) => void;
}

const SessionSidebar: React.FC<SessionSidebarProps> = ({
    sessions, activeSessionId, loading, onSelect, onNew, onDelete,
}) => {
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const groups = groupSessions(sessions);

    return (
        <div className="ow-ai-sessions-sidebar">
            <button className="ow-ai-new-session-btn" onClick={onNew}>
                <Plus size={13} /> Nuova Chat
            </button>

            {loading ? (
                <div style={{ padding: '16px 12px', color: 'var(--ws-text-tertiary)', fontSize: 12 }}>
                    Caricamento sessioni…
                </div>
            ) : sessions.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--ws-text-tertiary)' }}>
                    <MessageSquare size={22} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                        Nessuna sessione.<br />Genera un report o avvia una chat.
                    </p>
                </div>
            ) : (
                groups.map(group => (
                    <div key={group.label}>
                        <div className="ow-ai-session-group-label">{group.label}</div>
                        {group.items.map(s => (
                            <div
                                key={s.id}
                                className={`ow-ai-session-item${activeSessionId === s.id ? ' ow-ai-session-item--active' : ''}`}
                                onClick={() => onSelect(s.id)}
                                onMouseEnter={() => setHoveredId(s.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <MessageSquare size={11} style={{ flexShrink: 0, color: 'var(--ws-text-tertiary)' }} />
                                <span style={{
                                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap', fontSize: 13,
                                }}>
                                    {s.title}
                                </span>
                                {hoveredId === s.id && (
                                    <button
                                        className="ow-ai-session-delete-btn"
                                        onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                                        title="Elimina sessione"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GENERATE_STEPS = [
    'Raccolta dati GSC…',
    'Analisi del sito…',
    'Invio a Kimi K2.6…',
    'Elaborazione report…',
    'Finalizzazione analisi…',
];

// ─── Main Component ───────────────────────────────────────────────────────────

const AiStrategyTab: React.FC<AiStrategyTabProps> = ({ projectId }) => {
    // Sessions
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

    // Messages
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);

    // Report generation
    const [reportTitle, setReportTitle] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [generating, setGenerating] = useState(false);
    const [generateStep, setGenerateStep] = useState('');
    const [report, setReport] = useState<AiReport | null>(null);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Chat
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Load sessions ─────────────────────────────────────────────────────────

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const res = await organicWebApi.listChatSessions(projectId);
            setSessions(res.sessions);
        } catch {
            // silent — no sessions yet is normal
        } finally {
            setSessionsLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    // ── Load messages when active session changes ─────────────────────────────

    const loadMessages = useCallback(async (sessionId: number) => {
        setMessagesLoading(true);
        setChatError(null);
        try {
            const res = await organicWebApi.getChatMessages(projectId, sessionId);
            setMessages(res.messages);
        } catch {
            setChatError('Errore nel caricamento dei messaggi.');
        } finally {
            setMessagesLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (activeSessionId !== null) {
            loadMessages(activeSessionId);
        } else {
            setMessages([]);
        }
    }, [activeSessionId, loadMessages]);

    // ── Auto-scroll chat ──────────────────────────────────────────────────────

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, chatLoading]);

    // ── File handling ─────────────────────────────────────────────────────────

    const readFileAsText = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve((e.target?.result as string) ?? '');
            reader.onerror = reject;
            reader.readAsText(file);
        });

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const results: AttachedFile[] = [];
        for (const file of Array.from(files)) {
            const content = await readFileAsText(file);
            results.push({ name: file.name, content });
        }
        setAttachedFiles(prev => [...prev, ...results]);
    }, []);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        await handleFiles(e.dataTransfer.files);
    };

    // ── Generate report ───────────────────────────────────────────────────────

    const handleGenerateReport = async () => {
        setGenerating(true);
        setGenerateError(null);
        let stepIdx = 0;
        setGenerateStep(GENERATE_STEPS[0]);

        const interval = window.setInterval(() => {
            stepIdx = Math.min(stepIdx + 1, GENERATE_STEPS.length - 1);
            setGenerateStep(GENERATE_STEPS[stepIdx]);
        }, 3_500);

        try {
            const res = await organicWebApi.generateReport(projectId, {
                title: reportTitle.trim() || undefined,
                attached_texts: attachedFiles.map(f => f.content),
            });
            setReport(res.report);
            setReportTitle('');
            setAttachedFiles([]);

            // Auto-create a session linked to this report and activate it
            const sessionRes = await organicWebApi.createChatSession(projectId, {
                title: res.report.title ?? `Analisi ${new Date().toLocaleDateString('it-IT')}`,
                report_id: res.report.id,
            });
            setSessions(prev => [sessionRes.session, ...prev]);
            setActiveSessionId(sessionRes.session.id);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Errore durante la generazione del report.';
            setGenerateError(msg);
        } finally {
            window.clearInterval(interval);
            setGenerating(false);
            setGenerateStep('');
        }
    };

    // ── Session management ────────────────────────────────────────────────────

    const handleNewSession = async () => {
        try {
            const now = new Date();
            const label = now.toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit',
            });
            const res = await organicWebApi.createChatSession(projectId, { title: `Chat ${label}` });
            setSessions(prev => [res.session, ...prev]);
            setActiveSessionId(res.session.id);
        } catch {
            // silent
        }
    };

    const handleDeleteSession = async (sessionId: number) => {
        try {
            await organicWebApi.deleteChatSession(projectId, sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMessages([]);
            }
        } catch {
            // silent
        }
    };

    // ── Send message ──────────────────────────────────────────────────────────

    const handleSendMessage = async () => {
        if (!activeSessionId || !chatInput.trim() || chatLoading) return;
        const text = chatInput.trim();

        const optimistic: ChatMessage = {
            id: Date.now(),
            session_id: activeSessionId,
            role: 'user',
            content: text,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setChatInput('');
        setChatLoading(true);
        setChatError(null);

        try {
            const res = await organicWebApi.sendChatMessage(projectId, activeSessionId, text);
            const assistant: ChatMessage = {
                id: res.message_id,
                session_id: activeSessionId,
                role: 'assistant',
                content: res.reply,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, assistant]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Errore durante la chat.';
            setChatError(msg);
        } finally {
            setChatLoading(false);
        }
    };

    const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="ow-ai-layout">
            {/* ── Sessions Sidebar ── */}
            <SessionSidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                loading={sessionsLoading}
                onSelect={id => setActiveSessionId(id)}
                onNew={handleNewSession}
                onDelete={handleDeleteSession}
            />

            {/* ── Main Content Pane ── */}
            <div className="ow-ai-content-pane">

                {/* ── Report Generation Panel ── */}
                <div className="ow-ai-report-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <Brain size={17} style={{ color: 'var(--ws-accent)', flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--ws-font-base)', fontWeight: 600, color: 'var(--ws-text)' }}>
                            Analisi Profonda
                        </span>
                        <span className="ow-badge ow-badge--blue ow-badge--sm">Kimi K2.6</span>
                    </div>

                    {/* File drop zone */}
                    <div
                        className={`ow-file-drop${isDragOver ? ' ow-file-drop--active' : ''}`}
                        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FileText size={18} style={{ color: 'var(--ws-text-tertiary)', marginBottom: 4 }} />
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--ws-text-secondary)' }}>
                            Trascina file <span style={{ color: 'var(--ws-text-tertiary)', fontSize: 11 }}>(.txt, .md, .pdf)</span>{' '}
                            o <span style={{ color: 'var(--ws-accent)', fontWeight: 500 }}>sfoglia</span>
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,.md,.pdf"
                            multiple
                            style={{ display: 'none' }}
                            onChange={e => handleFiles(e.target.files)}
                        />
                    </div>

                    {/* Attached file badges */}
                    {attachedFiles.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {attachedFiles.map((f, idx) => (
                                <span
                                    key={idx}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 8px', borderRadius: 20,
                                        background: 'var(--ws-surface-elevated)',
                                        border: '1px solid var(--ws-border)',
                                        fontSize: 12, color: 'var(--ws-text-secondary)',
                                    }}
                                >
                                    {f.name}
                                    <button
                                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                                        style={{
                                            display: 'inline-flex', background: 'none', border: 'none',
                                            cursor: 'pointer', color: 'var(--ws-text-tertiary)', padding: 0, lineHeight: 1,
                                        }}
                                    >
                                        <X size={11} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Title + generate button row */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                        <input
                            type="text"
                            className="ow-input"
                            placeholder="Titolo report (opzionale)"
                            value={reportTitle}
                            onChange={e => setReportTitle(e.target.value)}
                            style={{ flex: 1 }}
                            disabled={generating}
                        />
                        <button
                            className="ow-ai-generate-btn"
                            onClick={handleGenerateReport}
                            disabled={generating}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {generating ? (
                                <><Loader size={14} className="ws-spin" /> {generateStep}</>
                            ) : (
                                <><Sparkles size={14} /> Avvia Analisi</>
                            )}
                        </button>
                    </div>

                    {/* Progress bar */}
                    {generating && (
                        <div className="ow-ai-progress-bar-container" style={{ marginTop: 10 }}>
                            <div className="ow-ai-progress-bar" />
                            <span className="ow-ai-progress-hint">Attendi ~15-20 secondi</span>
                        </div>
                    )}

                    {/* Error */}
                    {generateError && (
                        <div className="ow-ai-error-banner" style={{ marginTop: 8 }}>
                            <AlertCircle size={14} /> {generateError}
                        </div>
                    )}

                    {/* Markdown report */}
                    {report?.deep_analysis_markdown && (
                        <div className="ow-ai-report-markdown-wrapper">
                            <div
                                className="ow-markdown-content"
                                // Content is server-generated; we escape HTML above in renderMarkdown
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(report.deep_analysis_markdown) }}
                            />
                        </div>
                    )}
                </div>

                {/* ── Chat Panel ── */}
                <div className="ow-ai-chat-panel">
                    {/* Messages area */}
                    <div className="ow-ai-chat-messages">
                        {!activeSessionId && !sessionsLoading && (
                            <div className="ow-ai-chat-disabled">
                                <Bot size={28} style={{ color: 'var(--ws-text-tertiary)', marginBottom: 8 }} />
                                <p style={{ margin: 0, fontSize: 13 }}>
                                    Seleziona una sessione dalla barra laterale o avvia una nuova chat.
                                </p>
                            </div>
                        )}

                        {activeSessionId && messagesLoading && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
                                <div className="ow-bento-skeleton" style={{ height: 38, borderRadius: 10, width: '60%' }} />
                                <div className="ow-bento-skeleton" style={{ height: 52, borderRadius: 10, width: '75%', alignSelf: 'flex-end' }} />
                            </div>
                        )}

                        {activeSessionId && !messagesLoading && messages.length === 0 && (
                            <div className="ow-ai-chat-welcome">
                                <Bot size={22} style={{ color: 'var(--ws-accent)', marginBottom: 8 }} />
                                <p>Fai domande sui tuoi dati SEO o sul report generato.</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`ow-chat-bubble ow-chat-bubble--${msg.role === 'user' ? 'user' : 'ai'}`}
                            >
                                <div className="ow-chat-bubble-icon">
                                    {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                </div>
                                <div className="ow-chat-bubble-text">{msg.content}</div>
                            </div>
                        ))}

                        {chatLoading && (
                            <div className="ow-chat-bubble ow-chat-bubble--ai">
                                <div className="ow-chat-bubble-icon"><Bot size={12} /></div>
                                <div className="ow-chat-bubble-text ow-chat-typing">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}

                        {chatError && (
                            <div className="ow-ai-error-banner" style={{ margin: '4px 0' }}>
                                <AlertCircle size={13} /> {chatError}
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input row */}
                    <div className="ow-chat-input-row">
                        <textarea
                            className="ow-chat-input"
                            placeholder={
                                activeSessionId
                                    ? 'Scrivi un messaggio… (Invio per inviare)'
                                    : 'Seleziona una sessione per chattare'
                            }
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={handleChatKeyDown}
                            rows={2}
                            disabled={chatLoading || !activeSessionId}
                        />
                        <button
                            className="ow-chat-send-btn"
                            onClick={handleSendMessage}
                            disabled={chatLoading || !chatInput.trim() || !activeSessionId}
                            title="Invia"
                        >
                            {chatLoading ? <RefreshCw size={14} className="ws-spin" /> : <Send size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiStrategyTab;
