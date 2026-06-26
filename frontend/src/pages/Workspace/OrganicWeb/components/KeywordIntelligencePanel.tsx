import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, RefreshCw, Loader, Search, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import organicWebApi from '../../../../api/organicWeb';
import type { PageQuery, PaginatedResponse } from '../../../../api/organicWeb';
import SeoAdvisorPanel from './SeoAdvisorPanel';

interface KeywordIntelligencePanelProps {
    projectId: number;
}

const PER_PAGE = 30;

function truncateUrl(url: string, maxLen = 50): string {
    const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
    return path.length > maxLen ? `…${path.slice(-(maxLen - 1))}` : path;
}

const KeywordIntelligencePanel: React.FC<KeywordIntelligencePanelProps> = ({ projectId }) => {
    const [data, setData] = useState<PaginatedResponse<PageQuery> | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [page, setPage] = useState(1);
    const [filterText, setFilterText] = useState('');
    const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [advisorUrl, setAdvisorUrl] = useState<string | null>(null);

    const fetchQueries = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await organicWebApi.getPageQueries(projectId, { page: p, per_page: PER_PAGE });
            setData(res);
            setPage(p);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchQueries(1);
    }, [fetchQueries]);

    const handleSync = useCallback(async () => {
        setSyncing(true);
        setSyncMessage(null);
        try {
            const res = await organicWebApi.syncPageQueries(projectId);
            setSyncMessage({ type: 'success', text: `Sincronizzate ${res.synced ?? 0} keyword` });
            await fetchQueries(1);
        } catch {
            setSyncMessage({ type: 'error', text: 'Errore durante la sincronizzazione' });
        } finally {
            setSyncing(false);
            window.setTimeout(() => setSyncMessage(null), 5000);
        }
    }, [projectId, fetchQueries]);

    const rows = data?.data ?? [];

    const filteredRows = useMemo(() => {
        if (!filterText.trim()) return rows;
        const q = filterText.toLowerCase();
        return rows.filter(r =>
            r.page_url.toLowerCase().includes(q) || r.query.toLowerCase().includes(q)
        );
    }, [rows, filterText]);

    const sortedRows = useMemo(
        () => [...filteredRows].sort((a, b) => b.clicks - a.clicks),
        [filteredRows]
    );

    const totalPages = data?.last_page ?? 1;
    const isEmpty = !loading && (data?.total ?? 0) === 0;

    return (
        <div className="ow-ki-panel">
            {/* ── Panel Header ── */}
            <div className="ow-ki-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="ow-ki-title">Keyword Intelligence</span>
                    <span className="ow-ki-ai-badge">
                        <Sparkles size={10} />
                        AI-powered
                    </span>
                    {data && (
                        <span style={{ fontSize: 11, color: 'var(--ws-text-tertiary)' }}>
                            {data.total.toLocaleString('it-IT')} query
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {syncMessage && (
                        <span
                            className={`ow-ki-sync-msg ow-ki-sync-msg--${syncMessage.type}`}
                        >
                            {syncMessage.text}
                        </span>
                    )}
                    <button
                        className="ow-btn ow-btn--secondary ow-btn--sm"
                        onClick={handleSync}
                        disabled={syncing}
                        title="Importa keyword granulari da GSC"
                    >
                        {syncing
                            ? <><Loader size={12} className="ws-spin" /> Sincronizzazione…</>
                            : <><RefreshCw size={12} /> Sincronizza Keyword</>}
                    </button>
                </div>
            </div>

            {/* ── Filter ── */}
            {!isEmpty && (
                <div className="ow-ki-filter-row">
                    <div className="ow-ki-search-wrap">
                        <Search size={13} style={{ color: 'var(--ws-text-tertiary)', flexShrink: 0 }} />
                        <input
                            type="text"
                            className="ow-ki-search-input"
                            placeholder="Filtra per URL o keyword…"
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                        />
                        {filterText && (
                            <button
                                className="ow-ki-search-clear"
                                onClick={() => setFilterText('')}
                                title="Rimuovi filtro"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ws-text-tertiary)', whiteSpace: 'nowrap' }}>
                        {sortedRows.length} risultati
                    </span>
                </div>
            )}

            {/* ── Content ── */}
            {loading ? (
                <div className="ow-ki-skeleton-table">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="ow-ki-skeleton-row">
                            <div className="ow-skeleton" style={{ height: 14, width: `${55 + (i % 3) * 10}%`, borderRadius: 4 }} />
                            <div className="ow-skeleton" style={{ height: 14, width: '15%', borderRadius: 4 }} />
                            <div className="ow-skeleton" style={{ height: 14, width: '10%', borderRadius: 4 }} />
                            <div className="ow-skeleton" style={{ height: 14, width: '10%', borderRadius: 4 }} />
                            <div className="ow-skeleton" style={{ height: 14, width: '8%', borderRadius: 4 }} />
                        </div>
                    ))}
                </div>
            ) : isEmpty ? (
                <div className="ow-ki-empty">
                    <div className="ow-ki-empty-icon">
                        <Database size={28} style={{ color: 'var(--ws-text-tertiary)' }} />
                    </div>
                    <p className="ow-ki-empty-title">Nessuna keyword importata</p>
                    <p className="ow-ki-empty-sub">
                        Clicca <strong>Sincronizza Keyword</strong> per importare i dati granulari da Google Search Console.
                    </p>
                    <button
                        className="ow-btn ow-btn--primary"
                        onClick={handleSync}
                        disabled={syncing}
                        style={{ marginTop: 4 }}
                    >
                        {syncing
                            ? <><Loader size={13} className="ws-spin" /> Sincronizzazione…</>
                            : <><RefreshCw size={13} /> Sincronizza Keyword ora</>}
                    </button>
                </div>
            ) : sortedRows.length === 0 ? (
                <div className="ow-ki-empty" style={{ padding: '24px 20px' }}>
                    <Search size={20} style={{ color: 'var(--ws-text-tertiary)' }} />
                    <p style={{ margin: '8px 0 0', fontSize: 'var(--ws-font-sm)', color: 'var(--ws-text-secondary)' }}>
                        Nessun risultato per "<em>{filterText}</em>"
                    </p>
                </div>
            ) : (
                <>
                    <div className="ow-ki-table-wrapper">
                        <table className="ow-ki-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '35%' }}>Pagina</th>
                                    <th style={{ width: '30%' }}>Query / Keyword</th>
                                    <th style={{ textAlign: 'right' }}>Click</th>
                                    <th style={{ textAlign: 'right' }}>Impressioni</th>
                                    <th style={{ textAlign: 'right' }}>CTR%</th>
                                    <th style={{ textAlign: 'right' }}>Posizione</th>
                                    <th style={{ width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map(row => (
                                    <React.Fragment key={`${row.page_url}-${row.query}`}>
                                        <tr className={advisorUrl === row.page_url ? 'ow-ki-row--active' : ''}>
                                            <td>
                                                <a
                                                    href={row.page_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ow-ki-url-link"
                                                    title={row.page_url}
                                                >
                                                    {truncateUrl(row.page_url)}
                                                </a>
                                            </td>
                                            <td>
                                                <span className="ow-ki-query-chip">{row.query}</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className="ow-ki-metric ow-ki-metric--clicks">
                                                    {row.clicks.toLocaleString('it-IT')}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className="ow-ki-metric">
                                                    {row.impressions.toLocaleString('it-IT')}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className="ow-ki-metric">
                                                    {row.ctr != null ? `${row.ctr.toFixed(1)}%` : '—'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span
                                                    className="ow-ki-metric"
                                                    style={{
                                                        color: row.position != null && row.position <= 3
                                                            ? 'var(--ws-green)'
                                                            : row.position != null && row.position <= 10
                                                                ? 'var(--ws-orange)'
                                                                : undefined,
                                                    }}
                                                >
                                                    {row.position != null ? `#${row.position.toFixed(1)}` : '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className={`ow-ki-ai-btn ${advisorUrl === row.page_url ? 'ow-ki-ai-btn--active' : ''}`}
                                                    onClick={() => setAdvisorUrl(
                                                        advisorUrl === row.page_url ? null : row.page_url
                                                    )}
                                                    title="Analizza con AI SEO Advisor"
                                                >
                                                    <Sparkles size={11} />
                                                    <span>Analizza</span>
                                                </button>
                                            </td>
                                        </tr>

                                        {/* SEO Advisor panel inline */}
                                        {advisorUrl === row.page_url && (
                                            <tr className="ow-ki-advisor-row">
                                                <td colSpan={7} style={{ padding: 0 }}>
                                                    <SeoAdvisorPanel
                                                        projectId={projectId}
                                                        url={row.page_url}
                                                        onClose={() => setAdvisorUrl(null)}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="ow-ki-pagination">
                            <button
                                className="ow-btn ow-btn--ghost ow-btn--sm"
                                disabled={page <= 1 || loading}
                                onClick={() => fetchQueries(page - 1)}
                            >
                                <ChevronLeft size={14} /> Prec.
                            </button>
                            <span className="ow-ki-page-info">
                                Pagina {page} / {totalPages}
                            </span>
                            <button
                                className="ow-btn ow-btn--ghost ow-btn--sm"
                                disabled={page >= totalPages || loading}
                                onClick={() => fetchQueries(page + 1)}
                            >
                                Succ. <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default KeywordIntelligencePanel;
