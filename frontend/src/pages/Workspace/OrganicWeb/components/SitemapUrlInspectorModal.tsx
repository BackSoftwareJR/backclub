import React, { useState, useEffect } from 'react';
import { X, Loader, ExternalLink, CheckCircle, AlertCircle, Bot } from 'lucide-react';
import type { GscUrlDetail } from '../../../../api/organicWeb';
import organicWebApi from '../../../../api/organicWeb';

interface SitemapUrlInspectorModalProps {
    projectId: number;
    url: string;
    onClose: () => void;
}

const SitemapUrlInspectorModal: React.FC<SitemapUrlInspectorModalProps> = ({ projectId, url, onClose }) => {
    const [detail, setDetail] = useState<GscUrlDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reindexing, setReindexing] = useState(false);
    const [reindexSuccess, setReindexSuccess] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        organicWebApi.inspectUrl(projectId, url)
            .then(res => {
                if (!cancelled) setDetail(res);
            })
            .catch(e => {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Errore ispezione URL');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [projectId, url]);

    const handleReindex = async () => {
        setReindexing(true);
        try {
            await organicWebApi.requestIndexing(projectId, [url]);
            setReindexSuccess(true);
            setTimeout(() => setReindexSuccess(false), 4000);
        } catch {
            // silent
        } finally {
            setReindexing(false);
        }
    };

    return (
        <div className="ow-modal-overlay" onClick={onClose}>
            <div className="ow-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                <div className="ow-modal-header">
                    <h2 className="ow-modal-title" style={{ fontSize: 'var(--ws-font-sm)' }}>
                        Ispeziona URL
                    </h2>
                    <button className="ow-modal-close" onClick={onClose}><X size={14} /></button>
                </div>

                <div className="ow-modal-body" style={{ padding: '12px 16px' }}>
                    <div className="ow-sitemap-inspector-url">
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ws-accent)', wordBreak: 'break-all', fontSize: 'var(--ws-font-xs)' }}>
                            {url} <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        </a>
                    </div>

                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                            <Loader size={20} className="ws-spin" style={{ color: 'var(--ws-accent)' }} />
                        </div>
                    )}

                    {error && (
                        <div className="ow-error-row">
                            <AlertCircle size={13} /> {error}
                        </div>
                    )}

                    {detail && !loading && (
                        <div className="ow-sitemap-inspector-grid">
                            <div className="ow-sitemap-inspector-row">
                                <span className="ow-sitemap-inspector-label">Stato indicizzazione</span>
                                <span className="ow-sitemap-inspector-value">
                                    {detail.indexing_status === 'PASS'
                                        ? <span className="ow-badge ow-badge--sm ow-badge--green"><CheckCircle size={10} /> Indicizzato</span>
                                        : <span className="ow-badge ow-badge--sm ow-badge--red"><AlertCircle size={10} /> {detail.indexing_status ?? '—'}</span>
                                    }
                                </span>
                            </div>

                            <div className="ow-sitemap-inspector-row">
                                <span className="ow-sitemap-inspector-label">Ultimo crawl</span>
                                <span className="ow-sitemap-inspector-value">
                                    {detail.last_crawled ? new Date(detail.last_crawled).toLocaleString('it-IT') : '—'}
                                </span>
                            </div>

                            <div className="ow-sitemap-inspector-row">
                                <span className="ow-sitemap-inspector-label">Coverage state</span>
                                <span className="ow-sitemap-inspector-value">{detail.coverage_state ?? '—'}</span>
                            </div>

                            <div className="ow-sitemap-inspector-row">
                                <span className="ow-sitemap-inspector-label">Mobile usability</span>
                                <span className="ow-sitemap-inspector-value">
                                    {detail.mobile_usability === 'PASS'
                                        ? <span className="ow-badge ow-badge--sm ow-badge--green">OK</span>
                                        : <span className="ow-badge ow-badge--sm ow-badge--gray">{detail.mobile_usability ?? '—'}</span>
                                    }
                                </span>
                            </div>

                            <div className="ow-sitemap-inspector-row">
                                <span className="ow-sitemap-inspector-label">Bloccato da robots.txt</span>
                                <span className="ow-sitemap-inspector-value">
                                    {detail.blocked_by_robots
                                        ? <span className="ow-badge ow-badge--sm ow-badge--red">Sì</span>
                                        : <span className="ow-badge ow-badge--sm ow-badge--green">No</span>
                                    }
                                </span>
                            </div>

                            {detail.canonical_url && detail.canonical_url !== url && (
                                <div className="ow-sitemap-inspector-row" style={{ gridColumn: '1 / -1' }}>
                                    <span className="ow-sitemap-inspector-label">URL canonico</span>
                                    <span className="ow-sitemap-inspector-value" style={{ wordBreak: 'break-all', fontSize: 'var(--ws-font-xs)' }}>
                                        {detail.canonical_url}
                                    </span>
                                </div>
                            )}

                            {detail.errors.length > 0 && (
                                <div className="ow-sitemap-inspector-row" style={{ gridColumn: '1 / -1' }}>
                                    <span className="ow-sitemap-inspector-label">Errori</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {detail.errors.map((err, i) => (
                                            <span key={i} className="ow-badge ow-badge--sm ow-badge--red">{err}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {reindexSuccess && (
                        <div className="ow-success-row" style={{ marginTop: 12 }}>
                            <CheckCircle size={12} /> Richiesta di indicizzazione inviata.
                        </div>
                    )}
                </div>

                <div className="ow-modal-footer">
                    <button className="ow-btn ow-btn--ghost" onClick={onClose}>Chiudi</button>
                    <button
                        className="ow-btn ow-btn--primary"
                        onClick={handleReindex}
                        disabled={reindexing || loading}
                    >
                        {reindexing ? <Loader size={12} className="ws-spin" /> : <Bot size={12} />}
                        Richiedi indicizzazione
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SitemapUrlInspectorModal;
