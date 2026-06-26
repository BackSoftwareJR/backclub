import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, Send, Loader, Sparkles, Bot, User, RefreshCw, AlertCircle } from 'lucide-react';
import organicWebApi from '../../../../api/organicWeb';
import type { AiAudit } from '../../../../api/organicWeb';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AiStrategyTabProps {
    projectId: number;
}

// ─── Markdown renderer (lightweight, no extra deps) ───────────────────────────

const renderMarkdown = (md: string): string => {
    return md
        // Escape HTML entities to prevent XSS from content before we add our own HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold / italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Ordered / unordered list items (wrap in <li>)
        .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
        .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> with <ul>
        .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
        // Horizontal rule
        .replace(/^---$/gm, '<hr/>')
        // Paragraphs: blank lines become <br/> separators
        .replace(/\n\n/g, '<br/><br/>');
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBlock: React.FC<{ height?: number; width?: string }> = ({
    height = 16,
    width = '100%',
}) => (
    <div
        className="ow-bento-skeleton"
        style={{ height, width, borderRadius: 6, marginBottom: 8 }}
    />
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AiStrategyTab: React.FC<AiStrategyTabProps> = ({ projectId }) => {
    const [audit, setAudit] = useState<AiAudit | null>(null);
    const [auditLoading, setAuditLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // ── Load latest audit on mount ──────────────────────────────────────────

    const loadLatestAudit = useCallback(async () => {
        setAuditLoading(true);
        try {
            const res = await organicWebApi.getLatestAudit(projectId);
            setAudit(res.audit ?? null);
        } catch {
            // silent — no audit yet is a normal state
        } finally {
            setAuditLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadLatestAudit();
    }, [loadLatestAudit]);

    // ── Auto-scroll chat ────────────────────────────────────────────────────

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, chatLoading]);

    // ── Generate audit ──────────────────────────────────────────────────────

    const handleGenerateAudit = async () => {
        setGenerating(true);
        setGenerateError(null);
        try {
            const res = await organicWebApi.generateAudit(projectId);
            if (res.success) {
                setAudit(res.audit);
                setMessages([]);
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : 'Errore durante la generazione dell\'audit.';
            setGenerateError(msg);
        } finally {
            setGenerating(false);
        }
    };

    // ── Send chat message ───────────────────────────────────────────────────

    const handleSendMessage = async () => {
        if (!audit || !inputValue.trim() || chatLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: inputValue.trim() };
        const updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
        setInputValue('');
        setChatLoading(true);
        setChatError(null);

        try {
            const res = await organicWebApi.chatWithAudit(
                projectId,
                audit.id,
                userMsg.content,
                messages
            );
            if (res.success) {
                setMessages([...updatedHistory, { role: 'assistant', content: res.reply }]);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Errore durante la chat.';
            setChatError(msg);
        } finally {
            setChatLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // ── Formatted date ──────────────────────────────────────────────────────

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="ow-ai-split">
            {/* ─── Left: Report Panel ─────────────────────────────────────── */}
            <div className="ow-ai-main">
                {/* Header */}
                <div className="ow-ai-main-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Brain size={18} style={{ color: 'var(--ws-accent)' }} />
                        <span className="ow-ai-main-title">AI Strategy Audit</span>
                        {audit && (
                            <span className="ow-badge ow-badge--blue ow-badge--sm">
                                {audit.model_used ?? 'AI'}
                            </span>
                        )}
                    </div>
                    {audit && (
                        <span className="ow-ai-timestamp">
                            Generato il {formatDate(audit.created_at)}
                        </span>
                    )}
                </div>

                {/* Generate button */}
                <button
                    className="ow-ai-generate-btn"
                    onClick={handleGenerateAudit}
                    disabled={generating}
                >
                    {generating ? (
                        <>
                            <Loader size={16} className="ws-spin" />
                            Canopy Wave sta analizzando i tuoi dati GSC…
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            {audit ? 'Avvia Nuova Analisi Profonda' : 'Avvia Analisi Profonda'}
                        </>
                    )}
                </button>

                {/* Progress bar during generation */}
                {generating && (
                    <div className="ow-ai-progress-bar-container">
                        <div className="ow-ai-progress-bar" />
                        <span className="ow-ai-progress-hint">Attendi ~15-20 secondi</span>
                    </div>
                )}

                {/* Generate error */}
                {generateError && (
                    <div className="ow-ai-error-banner">
                        <AlertCircle size={14} />
                        {generateError}
                    </div>
                )}

                {/* Skeleton while loading */}
                {auditLoading && !generating && (
                    <div style={{ marginTop: 24 }}>
                        <SkeletonBlock height={24} width="60%" />
                        <SkeletonBlock height={14} />
                        <SkeletonBlock height={14} width="80%" />
                        <SkeletonBlock height={14} />
                        <SkeletonBlock height={24} width="50%" />
                        <SkeletonBlock height={14} />
                        <SkeletonBlock height={14} width="90%" />
                    </div>
                )}

                {/* Markdown report */}
                {!auditLoading && audit?.generated_markdown && (
                    <div
                        className="ow-markdown-content"
                        // Content comes from our own AI call, rendered server-side escaping above
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(audit.generated_markdown) }}
                    />
                )}

                {/* Empty state */}
                {!auditLoading && !audit && !generating && (
                    <div className="ow-ai-empty-state">
                        <Brain size={40} style={{ color: 'var(--ws-text-tertiary)', marginBottom: 12 }} />
                        <p>Nessun audit disponibile. Avvia la prima analisi per ottenere insights dettagliati.</p>
                    </div>
                )}
            </div>

            {/* ─── Right: Chat Sidebar ────────────────────────────────────── */}
            <div className="ow-ai-sidebar">
                <div className="ow-ai-sidebar-header">
                    <Bot size={15} style={{ color: 'var(--ws-accent)' }} />
                    <span className="ow-ai-sidebar-title">Chatta con i tuoi dati</span>
                </div>

                {!audit ? (
                    <div className="ow-ai-chat-disabled">
                        <Bot size={32} style={{ color: 'var(--ws-text-tertiary)', marginBottom: 10 }} />
                        <p>Genera un audit per abilitare la chat con i tuoi dati SEO.</p>
                    </div>
                ) : (
                    <>
                        {/* Messages area */}
                        <div className="ow-ai-chat-messages">
                            {messages.length === 0 && (
                                <div className="ow-ai-chat-welcome">
                                    <Bot size={24} style={{ color: 'var(--ws-accent)', marginBottom: 8 }} />
                                    <p>Fai domande sull&apos;audit SEO. Posso analizzare trend, spiegare problemi e suggerire priorità.</p>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`ow-chat-bubble ${
                                        msg.role === 'user'
                                            ? 'ow-chat-bubble--user'
                                            : 'ow-chat-bubble--ai'
                                    }`}
                                >
                                    <div className="ow-chat-bubble-icon">
                                        {msg.role === 'user' ? (
                                            <User size={12} />
                                        ) : (
                                            <Bot size={12} />
                                        )}
                                    </div>
                                    <div className="ow-chat-bubble-text">{msg.content}</div>
                                </div>
                            ))}

                            {chatLoading && (
                                <div className="ow-chat-bubble ow-chat-bubble--ai">
                                    <div className="ow-chat-bubble-icon">
                                        <Bot size={12} />
                                    </div>
                                    <div className="ow-chat-bubble-text ow-chat-typing">
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>
                            )}

                            {chatError && (
                                <div className="ow-ai-error-banner" style={{ margin: '8px 0' }}>
                                    <AlertCircle size={13} />
                                    {chatError}
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Input row */}
                        <div className="ow-chat-input-row">
                            <textarea
                                ref={inputRef}
                                className="ow-chat-input"
                                placeholder="Scrivi una domanda… (Invio per inviare)"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={2}
                                disabled={chatLoading}
                            />
                            <button
                                className="ow-chat-send-btn"
                                onClick={handleSendMessage}
                                disabled={chatLoading || !inputValue.trim()}
                                title="Invia"
                            >
                                {chatLoading ? (
                                    <RefreshCw size={14} className="ws-spin" />
                                ) : (
                                    <Send size={14} />
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AiStrategyTab;
