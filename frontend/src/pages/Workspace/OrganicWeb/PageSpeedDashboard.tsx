import React, { useState, useEffect, useCallback } from 'react';
import {
    Loader, Zap, ChevronDown, ChevronRight, X, Check,
    AlertCircle, Copy, Monitor, Smartphone,
} from 'lucide-react';
import organicWebApi from '../../../api/organicWeb';
import type { PageSpeedAuditFull, PageSpeedAuditItem, AiSuggestionGroup } from '../../../api/organicWeb';
import ImplementationVerifier from '../../../components/ImplementationVerifier';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageSpeedDashboardProps {
    projectId: number;
    sitemapUrls?: string[];
}

type AuditTab = 'opportunities' | 'diagnostics' | 'passed' | 'ai-fix';

// ─── ProgressRing ─────────────────────────────────────────────────────────────

interface ProgressRingProps {
    score: number | null;
    size?: number;
    label: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ score, size = 88, label }) => {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const displayScore = score ?? 0;
    const progress = (displayScore / 100) * circumference;
    const color = displayScore >= 90 ? '#22c55e' : displayScore >= 50 ? '#eab308' : '#ef4444';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div className="ow-ps-ring" style={{ width: size, height: size, position: 'relative' }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
                    aria-hidden="true"
                >
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={7}
                    />
                    {score !== null && (
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={color}
                            strokeWidth={7}
                            strokeLinecap="round"
                            strokeDasharray={`${progress} ${circumference - progress}`}
                            style={{ transition: 'stroke-dasharray 0.6s ease' }}
                        />
                    )}
                </svg>
                <span
                    style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: score !== null ? 22 : 18,
                        fontWeight: 700,
                        color: score === null ? 'var(--ws-text-tertiary)' : color,
                        lineHeight: 1,
                    }}
                >
                    {score !== null ? displayScore : '—'}
                </span>
            </div>
            <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)', fontWeight: 500 }}>
                {label}
            </span>
        </div>
    );
};

// ─── Metric Color Helper ───────────────────────────────────────────────────────

function lcpClass(val: number | null): string {
    if (val === null) return '';
    if (val <= 2500) return 'ow-metric-good';
    if (val <= 4000) return 'ow-metric-medium';
    return 'ow-metric-poor';
}

function clsClass(val: number | null): string {
    if (val === null) return '';
    if (val <= 0.1) return 'ow-metric-good';
    if (val <= 0.25) return 'ow-metric-medium';
    return 'ow-metric-poor';
}

function fcpClass(val: number | null): string {
    if (val === null) return '';
    if (val <= 1800) return 'ow-metric-good';
    if (val <= 3000) return 'ow-metric-medium';
    return 'ow-metric-poor';
}

function tbtClass(val: number | null): string {
    if (val === null) return '';
    if (val <= 200) return 'ow-metric-good';
    if (val <= 600) return 'ow-metric-medium';
    return 'ow-metric-poor';
}

function siClass(val: number | null): string {
    if (val === null) return '';
    if (val <= 3400) return 'ow-metric-good';
    if (val <= 5800) return 'ow-metric-medium';
    return 'ow-metric-poor';
}

function fmtMs(val: number | null): string {
    if (val === null) return '—';
    if (val >= 1000) return `${(val / 1000).toFixed(1)} s`;
    return `${Math.round(val)} ms`;
}

function fmtCls(val: number | null): string {
    if (val === null) return '—';
    return val.toFixed(3);
}

// ─── Core Metrics Panel ───────────────────────────────────────────────────────

interface CoreMetricsPanelProps {
    audit: PageSpeedAuditFull | null;
    device: 'mobile' | 'desktop';
    loading: boolean;
}

const CoreMetricsPanel: React.FC<CoreMetricsPanelProps> = ({ audit, device, loading }) => {
    const icon = device === 'mobile'
        ? <Smartphone size={14} style={{ color: 'var(--ws-accent)' }} />
        : <Monitor size={14} style={{ color: '#a78bfa' }} />;

    return (
        <div className="ow-bento-card" style={{ flex: 1 }}>
            <div className="ow-card-header" style={{ marginBottom: 16 }}>
                <span className="ow-card-icon">{icon}</span>
                <span className="ow-card-title">{device === 'mobile' ? 'Mobile' : 'Desktop'}</span>
                {audit?.status && audit.status !== 'completed' && (
                    <span className={`ow-badge ow-badge--sm ow-badge--${audit.status === 'failed' ? 'red' : 'yellow'}`}>
                        {audit.status}
                    </span>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                    <Loader size={20} className="ws-spin" style={{ color: 'var(--ws-accent)' }} />
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                        <ProgressRing score={audit?.performance_score ?? null} label="Performance" size={96} />
                    </div>

                    <div>
                        <MetricRow label="LCP" value={fmtMs(audit?.lcp ?? null)} className={lcpClass(audit?.lcp ?? null)} />
                        <MetricRow label="CLS" value={fmtCls(audit?.cls ?? null)} className={clsClass(audit?.cls ?? null)} />
                        <MetricRow label="FCP" value={fmtMs(audit?.fcp ?? null)} className={fcpClass(audit?.fcp ?? null)} />
                        <MetricRow label="TBT" value={fmtMs(audit?.tbt ?? null)} className={tbtClass(audit?.tbt ?? null)} />
                        <MetricRow label="Speed Index" value={fmtMs(audit?.speed_index ?? null)} className={siClass(audit?.speed_index ?? null)} />
                    </div>

                    {(audit?.accessibility_score != null || audit?.seo_score != null) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                            {audit?.accessibility_score != null && (
                                <ScoreChip label="Accessibility" score={audit.accessibility_score} />
                            )}
                            {audit?.best_practices_score != null && (
                                <ScoreChip label="Best Practices" score={audit.best_practices_score} />
                            )}
                            {audit?.seo_score != null && (
                                <ScoreChip label="SEO" score={audit.seo_score} />
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const MetricRow: React.FC<{ label: string; value: string; className: string }> = ({ label, value, className }) => (
    <div className="ow-metric-row">
        <span className="ow-metric-label">{label}</span>
        <span className={`ow-metric-value ${className}`}>{value}</span>
    </div>
);

const ScoreChip: React.FC<{ label: string; score: number }> = ({ label, score }) => {
    const color = score >= 90 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '4px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}</span>
            <span style={{ fontSize: 10, color: 'var(--ws-text-tertiary)', marginTop: 1 }}>{label}</span>
        </div>
    );
};

// ─── Audit Table ──────────────────────────────────────────────────────────────

const AuditTable: React.FC<{ items: PageSpeedAuditItem[] }> = ({ items }) => {
    const [expanded, setExpanded] = useState<string | null>(null);

    if (items.length === 0) {
        return (
            <div className="ow-empty" style={{ padding: '24px 0' }}>
                <p className="ow-empty-text">Nessun elemento da mostrare.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map(item => {
                const scoreVal = item.score !== null ? Math.round((item.score ?? 0) * 100) : null;
                const barColor = scoreVal === null ? '#666' : scoreVal >= 90 ? '#22c55e' : scoreVal >= 50 ? '#eab308' : '#ef4444';
                const isOpen = expanded === item.id;

                return (
                    <div
                        key={item.id}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 10,
                            overflow: 'hidden',
                        }}
                    >
                        <button
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 14px', background: 'none', border: 'none',
                                cursor: 'pointer', textAlign: 'left',
                            }}
                            onClick={() => setExpanded(isOpen ? null : item.id)}
                        >
                            <div className="ow-score-bar-wrap" style={{ flexShrink: 0 }}>
                                <div
                                    className="ow-score-bar-fill"
                                    style={{ width: `${scoreVal ?? 0}%`, background: barColor }}
                                />
                            </div>
                            <span style={{ flex: 1, fontSize: 'var(--ws-font-sm)', color: 'var(--ws-text)', fontWeight: 500 }}>
                                {item.title}
                            </span>
                            {item.displayValue && (
                                <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)', whiteSpace: 'nowrap' }}>
                                    {item.displayValue}
                                </span>
                            )}
                            {isOpen
                                ? <ChevronDown size={13} style={{ color: 'var(--ws-text-tertiary)', flexShrink: 0 }} />
                                : <ChevronRight size={13} style={{ color: 'var(--ws-text-tertiary)', flexShrink: 0 }} />}
                        </button>
                        {isOpen && item.description && (
                            <div style={{
                                padding: '0 14px 12px',
                                fontSize: 'var(--ws-font-xs)',
                                color: 'var(--ws-text-secondary)',
                                lineHeight: 1.6,
                            }}>
                                {item.description}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Prompt Modal ─────────────────────────────────────────────────────────────

interface PromptModalProps {
    group: AiSuggestionGroup;
    onClose: () => void;
    onSent: () => void;
}

const PromptModal: React.FC<PromptModalProps> = ({ group, onClose, onSent }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(group.developer_prompt);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                onSent();
            }, 1800);
        } catch {
            // Fallback for browsers that don't support clipboard API
            const el = document.createElement('textarea');
            el.value = group.developer_prompt;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                onSent();
            }, 1800);
        }
    };

    return (
        <div className="ow-modal-overlay" onClick={onClose}>
            <div className="ow-modal" style={{ maxWidth: 640, width: '100%' }} onClick={e => e.stopPropagation()}>
                <div className="ow-modal-header">
                    <h2 className="ow-modal-title">
                        Prompt per l'Agente Dev — {group.area}
                    </h2>
                    <button className="ow-modal-close" onClick={onClose}><X size={14} /></button>
                </div>
                <div className="ow-modal-body">
                    <div style={{
                        background: 'rgba(0,0,0,0.3)', borderRadius: 10,
                        padding: 16, marginBottom: 16,
                        border: '1px solid rgba(255,255,255,0.08)',
                        maxHeight: 320, overflowY: 'auto',
                    }}>
                        <pre style={{
                            margin: 0, fontSize: 'var(--ws-font-xs)',
                            color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap',
                            fontFamily: 'var(--ws-font-mono, monospace)', lineHeight: 1.7,
                        }}>
                            {group.developer_prompt}
                        </pre>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-tertiary)' }}>
                        Copia il prompt e incollalo nell'Orchestratore Dev del workspace sviluppo.
                    </p>
                </div>
                <div className="ow-modal-footer">
                    <button className="ow-btn ow-btn--ghost" onClick={onClose}>Chiudi</button>
                    <button
                        className={`ow-btn ${copied ? 'ow-btn--secondary' : 'ow-btn--primary'}`}
                        onClick={handleCopy}
                        disabled={copied}
                    >
                        {copied
                            ? <><Check size={13} /> Prompt copiato — incollalo nell'Orchestratore Dev</>
                            : <><Copy size={13} /> Copia prompt</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── AI Fix Tab ────────────────────────────────────────────────────────────────

interface AiFixTabProps {
    suggestions: AiSuggestionGroup[];
    onSendToAgent: (group: AiSuggestionGroup) => void;
    sentGroups: Set<string>;
}

const AiFixTab: React.FC<AiFixTabProps> = ({ suggestions, onSendToAgent, sentGroups }) => {
    if (suggestions.length === 0) {
        return (
            <div className="ow-empty" style={{ padding: '32px 0' }}>
                <Zap size={32} className="ow-empty-icon" />
                <p className="ow-empty-text">
                    Nessun suggerimento AI disponibile. Esegui un'analisi per generarli.
                </p>
            </div>
        );
    }

    const sorted = [...suggestions].sort((a, b) => {
        const order = { Alto: 0, Medio: 1, Basso: 2 };
        return order[a.impact] - order[b.impact];
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sorted.map((group, i) => (
                <div key={i} className="ow-suggestion-group">
                    <div className="ow-sg-header">
                        <span className={`ow-impact-badge ow-impact-${group.impact.toLowerCase()}`}>
                            {group.impact}
                        </span>
                        <h4 style={{ margin: 0, fontSize: 'var(--ws-font-md)', color: 'var(--ws-text)', flex: 1 }}>
                            {group.area}
                        </h4>
                        <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-tertiary)' }}>
                            {group.issues.length} {group.issues.length === 1 ? 'problema' : 'problemi'}
                        </span>
                    </div>

                    <div className="ow-sg-issues">
                        {group.issues.map((issue, j) => (
                            <span key={j} className="ow-sg-entity">{issue}</span>
                        ))}
                    </div>

                    {group.developer_prompt && (
                        <div className="ow-sg-prompt-preview">
                            <p className="ow-sg-prompt-text">
                                {group.developer_prompt.length > 200
                                    ? `${group.developer_prompt.slice(0, 200)}…`
                                    : group.developer_prompt}
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                        {sentGroups.has(group.area) ? (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '5px 12px', borderRadius: 8,
                                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                                fontSize: 'var(--ws-font-xs)', color: '#4ade80',
                            }}>
                                <Check size={12} /> In elaborazione…
                            </div>
                        ) : (
                            <button
                                className="ow-btn ow-btn--primary"
                                style={{ fontSize: 'var(--ws-font-xs)', padding: '5px 12px' }}
                                onClick={() => onSendToAgent(group)}
                            >
                                <Zap size={13} /> Invia all'Agente Dev
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const PageSpeedDashboard: React.FC<PageSpeedDashboardProps> = ({ projectId, sitemapUrls = [] }) => {
    const [selectedUrl, setSelectedUrl] = useState(sitemapUrls[0] ?? '');
    const [customUrl, setCustomUrl] = useState('');
    const [mobileAudit, setMobileAudit] = useState<PageSpeedAuditFull | null>(null);
    const [desktopAudit, setDesktopAudit] = useState<PageSpeedAuditFull | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeProgress, setAnalyzeProgress] = useState('');
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<AuditTab>('opportunities');
    const [activeDevice, setActiveDevice] = useState<'mobile' | 'desktop'>('mobile');
    const [modalGroup, setModalGroup] = useState<AiSuggestionGroup | null>(null);
    const [sentGroups, setSentGroups] = useState<Set<string>>(new Set());
    const [lastAuditId, setLastAuditId] = useState<number | undefined>(undefined);

    const urlToAnalyze = customUrl.trim() || selectedUrl;

    const loadLatestAudits = useCallback(async () => {
        try {
            const res = await organicWebApi.getPageSpeedAudits(projectId);
            const audits = res.audits ?? [];
            const mobile = audits
                .filter(a => a.device === 'mobile')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const desktop = audits
                .filter(a => a.device === 'desktop')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            if (mobile) {
                try {
                    const full = await organicWebApi.getPageSpeedAudit(projectId, mobile.id);
                    setMobileAudit(full.audit);
                    setLastAuditId(full.audit.id);
                } catch {
                    setMobileAudit(mobile as PageSpeedAuditFull);
                }
            }
            if (desktop) {
                try {
                    const full = await organicWebApi.getPageSpeedAudit(projectId, desktop.id);
                    setDesktopAudit(full.audit);
                } catch {
                    setDesktopAudit(desktop as PageSpeedAuditFull);
                }
            }
        } catch {
            // silent — data is optional on load
        }
    }, [projectId]);

    useEffect(() => {
        loadLatestAudits();
    }, [loadLatestAudits]);

    useEffect(() => {
        if (sitemapUrls.length > 0 && !selectedUrl) {
            setSelectedUrl(sitemapUrls[0]);
        }
    }, [sitemapUrls, selectedUrl]);

    const handleAnalyze = async () => {
        if (!urlToAnalyze) return;
        setIsAnalyzing(true);
        setAnalyzeError(null);
        setMobileAudit(null);
        setDesktopAudit(null);

        try {
            setAnalyzeProgress('Analisi Mobile in corso…');
            const mRes = await organicWebApi.analyzePageSpeedFull(projectId, urlToAnalyze, 'mobile');
            setMobileAudit(mRes.audit);
            setLastAuditId(mRes.audit.id);

            setAnalyzeProgress('Analisi Desktop in corso…');
            const dRes = await organicWebApi.analyzePageSpeedFull(projectId, urlToAnalyze, 'desktop');
            setDesktopAudit(dRes.audit);

            setAnalyzeProgress('');
        } catch {
            // Fallback to basic analyze if full endpoint doesn't exist yet
            try {
                setAnalyzeProgress('Analisi Mobile (base)…');
                const mRes = await organicWebApi.analyzePageSpeed(projectId, urlToAnalyze, 'mobile');
                setMobileAudit(mRes.audit as PageSpeedAuditFull);

                setAnalyzeProgress('Analisi Desktop (base)…');
                const dRes = await organicWebApi.analyzePageSpeed(projectId, urlToAnalyze, 'desktop');
                setDesktopAudit(dRes.audit as PageSpeedAuditFull);

                setAnalyzeProgress('');
            } catch {
                setAnalyzeError('Errore durante l\'analisi PageSpeed. Riprova tra qualche istante.');
            }
        } finally {
            setIsAnalyzing(false);
            setAnalyzeProgress('');
        }
    };

    const handleSendToDevAgent = (group: AiSuggestionGroup) => {
        setModalGroup(group);
    };

    const handleModalSent = () => {
        if (modalGroup) {
            setSentGroups(prev => new Set([...prev, modalGroup.area]));
        }
        setModalGroup(null);
    };

    const currentAudit = activeDevice === 'mobile' ? mobileAudit : desktopAudit;
    const opportunities = currentAudit?.audits_json ?? [];
    const diagnostics = currentAudit?.diagnostics_json ?? [];
    const passed = currentAudit?.passed_audits_json ?? [];
    const suggestions = (mobileAudit?.ai_suggestions_json ?? desktopAudit?.ai_suggestions_json ?? []);

    const AUDIT_TABS: { id: AuditTab; label: string; count?: number }[] = [
        { id: 'opportunities', label: 'Opportunità', count: opportunities.length || undefined },
        { id: 'diagnostics', label: 'Diagnostica', count: diagnostics.length || undefined },
        { id: 'passed', label: 'Superati', count: passed.length || undefined },
        { id: 'ai-fix', label: 'AI Fix', count: suggestions.length || undefined },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Header: URL selector + Analyze button ── */}
            <div className="ow-bento-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label className="ow-label">URL da analizzare</label>
                        {sitemapUrls.length > 0 ? (
                            <select
                                className="ow-select"
                                value={selectedUrl}
                                onChange={e => { setSelectedUrl(e.target.value); setCustomUrl(''); }}
                            >
                                {sitemapUrls.map(url => (
                                    <option key={url} value={url}>{url}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="url"
                                className="ow-input"
                                placeholder="https://esempio.com/pagina"
                                value={customUrl}
                                onChange={e => setCustomUrl(e.target.value)}
                            />
                        )}
                    </div>

                    {sitemapUrls.length > 0 && (
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <label className="ow-label">Oppure inserisci URL personalizzato</label>
                            <input
                                type="url"
                                className="ow-input"
                                placeholder="https://esempio.com/altra-pagina"
                                value={customUrl}
                                onChange={e => setCustomUrl(e.target.value)}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label className="ow-label" style={{ opacity: 0 }}>_</label>
                            <button
                                className="ow-btn ow-btn--primary"
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !urlToAnalyze}
                                title={!urlToAnalyze ? 'Seleziona o inserisci un URL' : 'Analizza Mobile + Desktop'}
                            >
                                {isAnalyzing ? (
                                    <><Loader size={13} className="ws-spin" /> {analyzeProgress || 'Analisi in corso…'}</>
                                ) : (
                                    <><Zap size={13} /> Analizza Mobile + Desktop</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {analyzeError && (
                    <div className="ow-error-row" style={{ marginTop: 12, marginBottom: 0 }}>
                        <AlertCircle size={13} /> {analyzeError}
                    </div>
                )}

                {urlToAnalyze && (
                    <p style={{ margin: '10px 0 0', fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-tertiary)' }}>
                        URL selezionato: <strong style={{ color: 'var(--ws-text-secondary)' }}>{urlToAnalyze}</strong>
                    </p>
                )}
            </div>

            {/* ── Score Panels ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <CoreMetricsPanel audit={mobileAudit} device="mobile" loading={isAnalyzing && !mobileAudit} />
                <CoreMetricsPanel audit={desktopAudit} device="desktop" loading={isAnalyzing && !desktopAudit} />
            </div>

            {/* ── Audit Tabs ── */}
            {(mobileAudit || desktopAudit) && (
                <div className="ow-bento-card">
                    {/* Device Switcher */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <button
                            className={`ow-btn ow-btn--sm ${activeDevice === 'mobile' ? 'ow-btn--primary' : 'ow-btn--secondary'}`}
                            onClick={() => setActiveDevice('mobile')}
                        >
                            <Smartphone size={12} /> Mobile
                        </button>
                        <button
                            className={`ow-btn ow-btn--sm ${activeDevice === 'desktop' ? 'ow-btn--primary' : 'ow-btn--secondary'}`}
                            onClick={() => setActiveDevice('desktop')}
                        >
                            <Monitor size={12} /> Desktop
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="ow-subtabs" style={{ marginBottom: 16 }}>
                        {AUDIT_TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`ow-subtab ${activeTab === tab.id ? 'ow-subtab--active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span style={{
                                        marginLeft: 5, padding: '1px 6px', borderRadius: 9999,
                                        background: 'rgba(255,255,255,0.1)',
                                        fontSize: 10, color: 'var(--ws-text-secondary)',
                                    }}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'opportunities' && <AuditTable items={opportunities} />}
                    {activeTab === 'diagnostics' && <AuditTable items={diagnostics} />}
                    {activeTab === 'passed' && <AuditTable items={passed} />}
                    {activeTab === 'ai-fix' && (
                        <AiFixTab
                            suggestions={suggestions}
                            onSendToAgent={handleSendToDevAgent}
                            sentGroups={sentGroups}
                        />
                    )}
                </div>
            )}

            {/* ── Implementation Verifier ── */}
            <ImplementationVerifier
                projectId={projectId}
                lastAuditId={lastAuditId}
                suggestionGroups={suggestions}
                onReanalyze={handleAnalyze}
            />

            {/* ── Prompt Modal ── */}
            {modalGroup && (
                <PromptModal
                    group={modalGroup}
                    onClose={() => setModalGroup(null)}
                    onSent={handleModalSent}
                />
            )}
        </div>
    );
};

export default PageSpeedDashboard;
