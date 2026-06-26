import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Lightbulb, RefreshCw, Loader, X } from 'lucide-react';
import organicWebApi from '../../../../api/organicWeb';
import type { SeoAdvisorResult } from '../../../../api/organicWeb';

interface SeoAdvisorPanelProps {
    projectId: number;
    url: string;
    onClose: () => void;
}

// Circular progress ring for the health score
const HealthScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color = score >= 70
        ? 'var(--ws-green)'
        : score >= 40 ? 'var(--ws-orange)' : 'var(--ws-red)';

    return (
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx="36" cy="36" r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="7"
                />
                <circle
                    cx="36" cy="36" r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: 9, color: 'var(--ws-text-tertiary)', letterSpacing: '0.04em' }}>SCORE</span>
            </div>
        </div>
    );
};

const SeoAdvisorPanel: React.FC<SeoAdvisorPanelProps> = ({ projectId, url, onClose }) => {
    const [result, setResult] = useState<SeoAdvisorResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const analyze = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await organicWebApi.analyzeUrl(projectId, url);
            setResult(res);
        } catch {
            setError('Errore durante l\'analisi. Riprova tra qualche istante.');
        } finally {
            setLoading(false);
        }
    }, [projectId, url]);

    useEffect(() => {
        analyze();
    }, [analyze]);

    return (
        <div className="ow-advisor-panel">
            {/* Header */}
            <div className="ow-advisor-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="ow-advisor-ai-badge">
                        <span className="ow-advisor-ai-dot" />
                        AI Advisor
                    </div>
                    <span
                        className="ow-advisor-url"
                        title={url}
                    >
                        {url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!loading && (
                        <button
                            className="ow-btn ow-btn--ghost ow-btn--sm"
                            onClick={analyze}
                            title="Ri-analizza"
                        >
                            <RefreshCw size={12} />
                            Ri-analizza
                        </button>
                    )}
                    <button className="ow-btn ow-btn--ghost ow-btn--sm" onClick={onClose} title="Chiudi">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <div className="ow-advisor-loading">
                    <div className="ow-advisor-skeleton-ring" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="ow-skeleton" style={{ height: 16, width: '60%', borderRadius: 6 }} />
                        <div className="ow-skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
                        <div className="ow-skeleton" style={{ height: 12, width: '70%', borderRadius: 4 }} />
                        <div className="ow-skeleton" style={{ height: 12, width: '50%', borderRadius: 4 }} />
                    </div>
                    <span style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'var(--ws-text-tertiary)' }}>
                        <Loader size={10} className="ws-spin" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        Analisi Groq AI in corso…
                    </span>
                </div>
            ) : error ? (
                <div className="ow-advisor-error">
                    <AlertTriangle size={16} style={{ color: 'var(--ws-red)', flexShrink: 0 }} />
                    <span>{error}</span>
                    <button className="ow-btn ow-btn--secondary ow-btn--sm" onClick={analyze}>Riprova</button>
                </div>
            ) : result ? (
                <div className="ow-advisor-body">
                    {/* Health Score */}
                    <HealthScoreRing score={result.health_score} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Main Problem */}
                        <div className="ow-advisor-problem">
                            <AlertTriangle
                                size={14}
                                style={{
                                    color: result.health_score >= 70
                                        ? 'var(--ws-green)'
                                        : result.health_score >= 40 ? 'var(--ws-orange)' : 'var(--ws-red)',
                                    flexShrink: 0,
                                    marginTop: 1,
                                }}
                            />
                            <span className="ow-advisor-problem-text">{result.main_problem}</span>
                        </div>

                        {/* Actionable Advice */}
                        <div className="ow-advisor-advice-list">
                            {result.actionable_advice.map((advice, idx) => (
                                <div key={idx} className="ow-advisor-advice-item">
                                    <Lightbulb size={13} style={{ color: 'var(--ws-accent)', flexShrink: 0, marginTop: 1 }} />
                                    <span>{advice}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default SeoAdvisorPanel;
