import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import organicWebApi, { type GscData } from '../../../../api/organicWeb';

interface GscBentoDashboardProps {
    projectId: number;
}

const GscBentoDashboard: React.FC<GscBentoDashboardProps> = ({ projectId }) => {
    const [data, setData] = useState<GscData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setError(null);
            const gscData = await organicWebApi.getGscData(projectId);
            setData(gscData);
        } catch (err) {
            setError('Errore nel caricamento dei dati GSC');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await organicWebApi.refreshGscData(projectId);
            await loadData();
        } catch (err) {
            setError('Errore durante l\'aggiornamento');
            console.error(err);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="ow-gsc-bento-loading">
                <Loader size={20} className="ws-spin" style={{ color: 'var(--ws-accent)' }} />
                <span style={{ fontSize: 'var(--ws-font-sm)', color: 'var(--ws-text-secondary)' }}>
                    Caricamento dati Search Console...
                </span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="ow-gsc-bento-error">
                <AlertCircle size={16} style={{ color: 'var(--ws-red)' }} />
                <span>{error ?? 'Dati non disponibili'}</span>
            </div>
        );
    }

    const totalClicks = data.performance.reduce((sum, p) => sum + p.clicks, 0);
    const totalImpressions = data.performance.reduce((sum, p) => sum + p.impressions, 0);
    const avgCtr = data.performance.length > 0
        ? (data.performance.reduce((sum, p) => sum + (p.ctr ?? 0), 0) / data.performance.length).toFixed(2)
        : '0.00';
    const avgPosition = data.performance.length > 0
        ? (data.performance.reduce((sum, p) => sum + (p.position ?? 0), 0) / data.performance.length).toFixed(1)
        : '0.0';

    const chartData = data.performance.map(p => ({
        date: new Date(p.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        clicks: p.clicks,
        impressions: p.impressions,
    }));

    const activeSitemaps = data.sitemaps.filter(s => s.status === 'success' || !s.status);
    const totalIndexedUrls = data.sitemaps.reduce((sum, s) => sum + s.downloaded_urls, 0);

    return (
        <div className="ow-gsc-bento-container">
            {/* Header con pulsante refresh */}
            <div className="ow-gsc-bento-header">
                <div className="ow-gsc-bento-header-left">
                    <TrendingUp size={18} style={{ color: 'var(--ws-accent)' }} />
                    <span className="ow-gsc-bento-title">Dati Search Console</span>
                </div>
                <button
                    className="ow-btn ow-btn--secondary ow-btn--sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? (
                        <><Loader size={13} className="ws-spin" /> Aggiornamento...</>
                    ) : (
                        <><RefreshCw size={13} /> Aggiorna Dati</>
                    )}
                </button>
            </div>

            {/* Griglia Bento */}
            <div className="ow-gsc-bento-grid">
                {/* Card 1: Trend Performance (2 colonne) */}
                <div className="ow-gsc-bento-card ow-gsc-bento-card--wide">
                    <div className="ow-gsc-bento-card-header">
                        <span className="ow-gsc-bento-card-title">Performance Ultimi 30 Giorni</span>
                        <span className="ow-gsc-bento-card-subtitle">
                            {data.performance.length} giorni di dati
                        </span>
                    </div>
                    <div className="ow-gsc-bento-kpi-row">
                        <div className="ow-gsc-bento-kpi">
                            <span className="ow-gsc-bento-kpi-value">{totalClicks.toLocaleString('it-IT')}</span>
                            <span className="ow-gsc-bento-kpi-label">Click Totali</span>
                        </div>
                        <div className="ow-gsc-bento-kpi">
                            <span className="ow-gsc-bento-kpi-value">{totalImpressions.toLocaleString('it-IT')}</span>
                            <span className="ow-gsc-bento-kpi-label">Impressions</span>
                        </div>
                        <div className="ow-gsc-bento-kpi">
                            <span className="ow-gsc-bento-kpi-value">{avgCtr}%</span>
                            <span className="ow-gsc-bento-kpi-label">CTR Medio</span>
                        </div>
                        <div className="ow-gsc-bento-kpi">
                            <span className="ow-gsc-bento-kpi-value">{avgPosition}</span>
                            <span className="ow-gsc-bento-kpi-label">Posizione Media</span>
                        </div>
                    </div>
                    {chartData.length > 0 ? (
                        <div className="ow-gsc-bento-chart">
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ws-border)" opacity={0.3} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: 'var(--ws-text-secondary)' }}
                                        tickLine={false}
                                        axisLine={{ stroke: 'var(--ws-border)' }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: 'var(--ws-text-secondary)' }}
                                        tickLine={false}
                                        axisLine={{ stroke: 'var(--ws-border)' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--ws-surface-elevated)',
                                            border: '1px solid var(--ws-border)',
                                            borderRadius: 'var(--ws-radius)',
                                            fontSize: '12px',
                                        }}
                                        labelStyle={{ color: 'var(--ws-text)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="clicks"
                                        stroke="var(--ws-accent)"
                                        strokeWidth={2}
                                        dot={false}
                                        name="Click"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="impressions"
                                        stroke="var(--ws-purple)"
                                        strokeWidth={2}
                                        dot={false}
                                        name="Impressions"
                                        opacity={0.6}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="ow-gsc-bento-empty">
                            <span>Nessun dato disponibile per gli ultimi 30 giorni</span>
                        </div>
                    )}
                </div>

                {/* Card 2: Stato Sitemap (1 colonna) */}
                <div className="ow-gsc-bento-card">
                    <div className="ow-gsc-bento-card-header">
                        <span className="ow-gsc-bento-card-title">Sitemap</span>
                    </div>
                    {data.sitemaps.length > 0 ? (
                        <div className="ow-gsc-bento-sitemap-list">
                            {data.sitemaps.slice(0, 3).map((sitemap, idx) => (
                                <div key={idx} className="ow-gsc-bento-sitemap-item">
                                    <div className="ow-gsc-bento-sitemap-icon">
                                        {sitemap.status === 'success' || !sitemap.status ? (
                                            <CheckCircle size={14} style={{ color: 'var(--ws-green)' }} />
                                        ) : (
                                            <AlertCircle size={14} style={{ color: 'var(--ws-orange)' }} />
                                        )}
                                    </div>
                                    <div className="ow-gsc-bento-sitemap-info">
                                        <span className="ow-gsc-bento-sitemap-path">
                                            {new URL(sitemap.path).pathname.split('/').pop() || sitemap.path}
                                        </span>
                                        <span className="ow-gsc-bento-sitemap-meta">
                                            {sitemap.downloaded_urls.toLocaleString('it-IT')} URL indicizzati
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {activeSitemaps.length > 0 && (
                                <div className="ow-gsc-bento-sitemap-summary">
                                    <FileText size={13} />
                                    <span>{totalIndexedUrls.toLocaleString('it-IT')} URL totali</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="ow-gsc-bento-empty" style={{ minHeight: 120 }}>
                            <FileText size={20} style={{ color: 'var(--ws-text-secondary)', opacity: 0.5 }} />
                            <span>Nessuna sitemap rilevata</span>
                        </div>
                    )}
                </div>

                {/* Card 3: Alert Indicizzazione (1 colonna) */}
                <div className="ow-gsc-bento-card">
                    <div className="ow-gsc-bento-card-header">
                        <span className="ow-gsc-bento-card-title">Stato Indicizzazione</span>
                    </div>
                    {data.indexing_errors.length > 0 ? (
                        <div className="ow-gsc-bento-errors-list">
                            {data.indexing_errors.slice(0, 5).map((err, idx) => (
                                <div key={idx} className="ow-gsc-bento-error-item">
                                    <AlertCircle size={12} style={{ color: 'var(--ws-red)', flexShrink: 0 }} />
                                    <span className="ow-gsc-bento-error-url" title={err.url}>
                                        {err.url.length > 40 ? `...${err.url.slice(-37)}` : err.url}
                                    </span>
                                </div>
                            ))}
                            {data.indexing_errors.length > 5 && (
                                <span className="ow-gsc-bento-errors-more">
                                    +{data.indexing_errors.length - 5} altri problemi
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="ow-gsc-bento-empty ow-gsc-bento-empty--success" style={{ minHeight: 120 }}>
                            <CheckCircle size={24} style={{ color: 'var(--ws-green)' }} />
                            <span style={{ fontWeight: 600, color: 'var(--ws-text)' }}>Tutte le pagine in salute</span>
                            <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)' }}>
                                Nessun errore di indicizzazione rilevato
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GscBentoDashboard;
