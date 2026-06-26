import React from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HealthTrendPoint } from '../../../../api/organicWeb';

interface SitemapHealthCardProps {
    score: number;
    breakdown: Record<string, number>;
    trend: HealthTrendPoint[];
    loading?: boolean;
}

function getScoreColor(score: number): string {
    if (score >= 75) return 'var(--ws-green)';
    if (score >= 50) return 'var(--ws-orange)';
    return 'var(--ws-red)';
}

function getScoreLabel(score: number): string {
    if (score >= 75) return 'Ottimo';
    if (score >= 50) return 'Discreto';
    if (score >= 25) return 'Scarso';
    return 'Critico';
}

const BREAKDOWN_LABELS: Record<string, string> = {
    no_sitemap: 'Nessuna sitemap',
    sitemap_errors: 'Errori sitemap',
    stale_sitemaps: 'Sitemap non aggiornata',
    low_coverage: 'Copertura bassa',
    critical_alerts: 'Alert critici',
};

const SitemapHealthCard: React.FC<SitemapHealthCardProps> = ({ score, breakdown, trend, loading }) => {
    const prevScore = trend.length >= 2 ? trend[trend.length - 2].score : null;
    const delta = prevScore !== null ? score - prevScore : null;

    const scoreColor = getScoreColor(score);
    const scoreLabel = getScoreLabel(score);

    const TrendIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
    const trendColor = delta === null || delta === 0
        ? 'var(--ws-text-secondary)'
        : delta > 0 ? 'var(--ws-green)' : 'var(--ws-red)';

    return (
        <div className="ow-gsc-bento-card ow-gsc-bento-card--wide ow-sitemap-health-card">
            <div className="ow-gsc-bento-card-header">
                <Activity size={15} style={{ color: scoreColor }} />
                <span className="ow-gsc-bento-card-title">Health Score</span>
                {delta !== null && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--ws-font-xs)', color: trendColor }}>
                        <TrendIcon size={12} />
                        {delta > 0 ? `+${delta}` : delta}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="ow-gsc-bento-loading">Caricamento…</div>
            ) : (
                <div className="ow-sitemap-health-body">
                    <div className="ow-sitemap-score-circle" style={{ borderColor: scoreColor }}>
                        <span className="ow-sitemap-score-value" style={{ color: scoreColor }}>{score}</span>
                        <span className="ow-sitemap-score-label">{scoreLabel}</span>
                    </div>

                    <div className="ow-sitemap-health-details">
                        {Object.keys(breakdown).length === 0 ? (
                            <p style={{ fontSize: 'var(--ws-font-sm)', color: 'var(--ws-green)' }}>
                                Nessun problema rilevato ✓
                            </p>
                        ) : (
                            Object.entries(breakdown).map(([key, penalty]) => (
                                <div key={key} className="ow-sitemap-breakdown-item">
                                    <span className="ow-sitemap-breakdown-label">
                                        {BREAKDOWN_LABELS[key] ?? key}
                                    </span>
                                    <span className="ow-sitemap-breakdown-penalty" style={{ color: 'var(--ws-red)' }}>
                                        {penalty}
                                    </span>
                                </div>
                            ))
                        )}

                        {trend.length > 1 && (
                            <div className="ow-sitemap-trend-bar">
                                {trend.map((point, i) => (
                                    <div
                                        key={i}
                                        className="ow-sitemap-trend-seg"
                                        style={{
                                            height: `${point.score}%`,
                                            background: getScoreColor(point.score),
                                            opacity: i === trend.length - 1 ? 1 : 0.5,
                                        }}
                                        title={`Score: ${point.score}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SitemapHealthCard;
