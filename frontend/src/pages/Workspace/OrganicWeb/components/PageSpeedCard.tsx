import React, { useState, useEffect, useCallback } from 'react';
import { Loader, Zap } from 'lucide-react';
import organicWebApi from '../../../../api/organicWeb';
import type { PageSpeedAudit } from '../../../../api/organicWeb';

interface PageSpeedCardProps {
    projectId: number;
    sitemapUrls?: string[];
}

interface ProgressRingProps {
    score: number | null;
    size?: number;
    label: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ score, size = 72, label }) => {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const displayScore = score ?? 0;
    const progress = (displayScore / 100) * circumference;
    const color = displayScore >= 90 ? '#22c55e' : displayScore >= 50 ? '#eab308' : '#ef4444';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="ow-ps-ring" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ transform: 'rotate(-90deg)' }}
                    aria-hidden="true"
                >
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={5}
                    />
                    {score !== null && (
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={color}
                            strokeWidth={5}
                            strokeLinecap="round"
                            strokeDasharray={`${progress} ${circumference - progress}`}
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                    )}
                </svg>
                <span
                    className="ow-ps-ring__score"
                    style={{ color: score === null ? 'var(--ws-text-tertiary)' : color }}
                >
                    {score !== null ? displayScore : '—'}
                </span>
            </div>
            <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)' }}>
                {label}
            </span>
        </div>
    );
};

const PageSpeedCard: React.FC<PageSpeedCardProps> = ({ projectId, sitemapUrls = [] }) => {
    const [audits, setAudits] = useState<PageSpeedAudit[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    const loadAudits = useCallback(async () => {
        try {
            const res = await organicWebApi.getPageSpeedAudits(projectId);
            setAudits(res.audits);
        } catch {
            // silent — data is optional
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadAudits();
    }, [loadAudits]);

    const handleAnalyze = async () => {
        const urlsToAnalyze = sitemapUrls.slice(0, 3);
        if (urlsToAnalyze.length === 0) return;

        setAnalyzing(true);
        try {
            const calls: Promise<unknown>[] = [];
            for (const url of urlsToAnalyze) {
                calls.push(organicWebApi.analyzePageSpeed(projectId, url, 'mobile'));
                calls.push(organicWebApi.analyzePageSpeed(projectId, url, 'desktop'));
            }
            await Promise.allSettled(calls);
            await loadAudits();
        } catch {
            // silent
        } finally {
            setAnalyzing(false);
        }
    };

    const mobileAudits = audits.filter(a => a.device === 'mobile');
    const desktopAudits = audits.filter(a => a.device === 'desktop');

    const avgMobile = mobileAudits.length > 0
        ? Math.round(mobileAudits.reduce((s, a) => s + (a.performance_score ?? 0), 0) / mobileAudits.length)
        : null;

    const avgDesktop = desktopAudits.length > 0
        ? Math.round(desktopAudits.reduce((s, a) => s + (a.performance_score ?? 0), 0) / desktopAudits.length)
        : null;

    // Top 3 opportunities by highest LCP
    const topOpportunities = [...audits]
        .sort((a, b) => (b.lcp ?? 0) - (a.lcp ?? 0))
        .slice(0, 3)
        .flatMap(a => (a.opportunities ?? []).slice(0, 1));

    return (
        <div className="ow-bento-card">
            <div className="ow-card-header">
                <span className="ow-card-icon"><Zap size={16} /></span>
                <span className="ow-card-title">PageSpeed Score</span>
                <button
                    className="ow-btn ow-btn--secondary"
                    style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 'var(--ws-font-xs)' }}
                    onClick={handleAnalyze}
                    disabled={analyzing || sitemapUrls.length === 0}
                    title={sitemapUrls.length === 0 ? 'Nessun URL sitemap disponibile' : 'Analizza le top 3 pagine per mobile e desktop'}
                >
                    {analyzing
                        ? <><Loader size={11} className="ws-spin" /> Analisi…</>
                        : 'Analizza Pagine Top'}
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                    <Loader size={20} className="ws-spin" style={{ color: 'var(--ws-accent)' }} />
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: 28, justifyContent: 'center', padding: '16px 0 12px' }}>
                        <ProgressRing score={avgMobile} label="Mobile" />
                        <ProgressRing score={avgDesktop} label="Desktop" />
                    </div>

                    {audits.length === 0 && (
                        <p style={{
                            margin: '0 0 4px',
                            fontSize: 'var(--ws-font-xs)',
                            color: 'var(--ws-text-tertiary)',
                            textAlign: 'center',
                        }}>
                            Nessun dato — clicca "Analizza Pagine Top" per avviare
                        </p>
                    )}

                    {topOpportunities.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            <p style={{
                                margin: '0 0 6px',
                                fontSize: 10,
                                color: 'var(--ws-text-tertiary)',
                                fontWeight: 600,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                            }}>
                                Opportunità principali
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {topOpportunities.map((op, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '5px 8px',
                                            borderRadius: 6,
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            fontSize: 'var(--ws-font-xs)',
                                            color: 'var(--ws-text-secondary)',
                                        }}
                                    >
                                        {op.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PageSpeedCard;
