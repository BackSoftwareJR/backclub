import React, { useState } from 'react';
import { Map, Trash2, RefreshCw, Plus, Loader, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import type { GscSitemap } from '../../../../api/organicWeb';
import organicWebApi from '../../../../api/organicWeb';

interface SitemapListCardProps {
    projectId: number;
    sitemaps: GscSitemap[];
    loading?: boolean;
    onRefresh: () => void;
}

function getStatusIcon(status: string | null) {
    if (status === 'success') return <CheckCircle size={13} style={{ color: 'var(--ws-green)' }} />;
    if (status === 'warning') return <AlertTriangle size={13} style={{ color: 'var(--ws-orange)' }} />;
    if (status === 'pending') return <Clock size={13} style={{ color: 'var(--ws-text-secondary)' }} />;
    return <Clock size={13} style={{ color: 'var(--ws-text-secondary)' }} />;
}

function getStatusBadgeClass(status: string | null): string {
    if (status === 'success') return 'ow-badge--green';
    if (status === 'warning') return 'ow-badge--yellow';
    if (status === 'pending') return 'ow-badge--gray';
    return 'ow-badge--gray';
}

const SitemapListCard: React.FC<SitemapListCardProps> = ({ projectId, sitemaps, loading, onRefresh }) => {
    const [showSubmit, setShowSubmit] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleDelete = async (sitemapId: number) => {
        if (!window.confirm('Rimuovere questa sitemap da Google Search Console?')) return;
        setDeletingId(sitemapId);
        try {
            await organicWebApi.deleteSitemap(projectId, sitemapId);
            onRefresh();
        } catch {
            // silent
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="ow-gsc-bento-card ow-gsc-bento-card--wide ow-sitemap-list-card">
            <div className="ow-gsc-bento-card-header">
                <Map size={15} style={{ color: 'var(--ws-accent)' }} />
                <span className="ow-gsc-bento-card-title">Sitemaps</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                        className="ow-btn ow-btn--secondary"
                        style={{ padding: '4px 8px', fontSize: 'var(--ws-font-xs)' }}
                        onClick={onRefresh}
                        title="Aggiorna lista"
                    >
                        <RefreshCw size={11} />
                    </button>
                    <button
                        className="ow-btn ow-btn--primary"
                        style={{ padding: '4px 10px', fontSize: 'var(--ws-font-xs)' }}
                        onClick={() => setShowSubmit(!showSubmit)}
                    >
                        <Plus size={11} /> Aggiungi
                    </button>
                </div>
            </div>

            {showSubmit && (
                <SitemapSubmitInline
                    projectId={projectId}
                    onSubmitted={() => { setShowSubmit(false); onRefresh(); }}
                    onCancel={() => setShowSubmit(false)}
                />
            )}

            {loading ? (
                <div className="ow-gsc-bento-loading">Caricamento…</div>
            ) : sitemaps.length === 0 ? (
                <div className="ow-gsc-bento-empty">
                    <Map size={20} />
                    <span>Nessuna sitemap trovata — aggiungine una</span>
                </div>
            ) : (
                <div className="ow-gsc-bento-sitemap-list">
                    {sitemaps.map(sitemap => (
                        <div key={sitemap.id} className="ow-gsc-bento-sitemap-item">
                            <div className="ow-gsc-bento-sitemap-icon">
                                {getStatusIcon(sitemap.status)}
                            </div>
                            <div className="ow-gsc-bento-sitemap-info">
                                <span className="ow-gsc-bento-sitemap-path" title={sitemap.path}>
                                    {sitemap.path.replace(/^https?:\/\/[^/]+/, '')}
                                </span>
                                <div className="ow-gsc-bento-sitemap-meta">
                                    <span className={`ow-badge ow-badge--sm ${getStatusBadgeClass(sitemap.status)}`}>
                                        {sitemap.status ?? 'sconosciuto'}
                                    </span>
                                    {sitemap.downloaded_urls > 0 && (
                                        <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)' }}>
                                            {sitemap.downloaded_urls.toLocaleString('it-IT')} in sitemap
                                            {(sitemap.indexed_urls ?? 0) > 0 && (
                                                <> · {sitemap.indexed_urls!.toLocaleString('it-IT')} indicizzati</>
                                            )}
                                        </span>
                                    )}
                                    {sitemap.last_submitted && (
                                        <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-tertiary)' }}>
                                            {new Date(sitemap.last_submitted).toLocaleDateString('it-IT')}
                                        </span>
                                    )}
                                </div>
                                {sitemap.errors && (
                                    <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-orange)', marginTop: 2, display: 'block' }}>
                                        {sitemap.errors}
                                    </span>
                                )}
                            </div>
                            <button
                                className="ow-btn ow-btn--danger"
                                style={{ padding: '4px 8px', marginLeft: 'auto', flexShrink: 0 }}
                                onClick={() => handleDelete(sitemap.id)}
                                disabled={deletingId === sitemap.id}
                                title="Rimuovi sitemap"
                            >
                                {deletingId === sitemap.id
                                    ? <Loader size={11} className="ws-spin" />
                                    : <Trash2 size={11} />}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface SitemapSubmitInlineProps {
    projectId: number;
    onSubmitted: () => void;
    onCancel: () => void;
}

const SitemapSubmitInline: React.FC<SitemapSubmitInlineProps> = ({ projectId, onSubmitted, onCancel }) => {
    const [url, setUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!url.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await organicWebApi.submitSitemap(projectId, url.trim());
            onSubmitted();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Errore durante l\'invio.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ow-sitemap-submit-inline">
            <input
                type="url"
                className="ow-input ow-input--sm"
                placeholder="https://esempio.com/sitemap.xml"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {error && <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-red)' }}>{error}</span>}
            <div style={{ display: 'flex', gap: 6 }}>
                <button
                    className="ow-btn ow-btn--primary"
                    style={{ padding: '5px 12px', fontSize: 'var(--ws-font-xs)' }}
                    onClick={handleSubmit}
                    disabled={submitting || !url.trim()}
                >
                    {submitting ? <Loader size={11} className="ws-spin" /> : 'Invia'}
                </button>
                <button
                    className="ow-btn ow-btn--ghost"
                    style={{ padding: '5px 10px', fontSize: 'var(--ws-font-xs)' }}
                    onClick={onCancel}
                >
                    Annulla
                </button>
            </div>
        </div>
    );
};

export default SitemapListCard;
