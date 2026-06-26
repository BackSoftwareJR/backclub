import React, { useState, useCallback, useEffect } from 'react';
import { Search, Download, RefreshCw, Loader, ExternalLink } from 'lucide-react';
import type { GscUrlDetail, PaginatedResponse } from '../../../../api/organicWeb';
import organicWebApi from '../../../../api/organicWeb';
import SitemapUrlInspectorModal from './SitemapUrlInspectorModal';

interface SitemapUrlTableProps {
    projectId: number;
    initialData: PaginatedResponse<GscUrlDetail> | null;
    loading?: boolean;
    onRefresh: () => void;
    onSyncUrls: () => void;
    syncing?: boolean;
}

const STATUS_OPTIONS = [
    { value: '', label: 'Tutti gli stati' },
    { value: 'PASS', label: 'Indicizzato' },
    { value: 'NEUTRAL', label: 'Neutro' },
    { value: 'FAIL', label: 'Errore' },
];

function getStatusBadge(status: string | null) {
    if (status === 'PASS') return <span className="ow-badge ow-badge--sm ow-badge--green">Indicizzato</span>;
    if (status === 'NEUTRAL') return <span className="ow-badge ow-badge--sm ow-badge--gray">Neutro</span>;
    if (status === 'FAIL') return <span className="ow-badge ow-badge--sm ow-badge--red">Errore</span>;
    return <span className="ow-badge ow-badge--sm ow-badge--gray">{status ?? '—'}</span>;
}

const SitemapUrlTable: React.FC<SitemapUrlTableProps> = ({ projectId, initialData, loading, onRefresh, onSyncUrls, syncing }) => {
    const [data, setData] = useState<PaginatedResponse<GscUrlDetail> | null>(initialData);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [fetching, setFetching] = useState(false);
    const [inspectingUrl, setInspectingUrl] = useState<string | null>(null);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const fetchPage = useCallback(async (newPage: number, newStatus: string) => {
        setFetching(true);
        try {
            const res = await organicWebApi.getSitemapUrls(projectId, {
                page: newPage,
                status: newStatus || undefined,
                per_page: 25,
            });
            setData(res);
            setPage(newPage);
        } catch {
            // silent
        } finally {
            setFetching(false);
        }
    }, [projectId]);

    const handleStatusChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        fetchPage(1, newStatus);
    };

    const handleBulkReindex = async () => {
        if (selectedUrls.size === 0) return;
        setBulkLoading(true);
        try {
            await organicWebApi.requestIndexing(projectId, Array.from(selectedUrls));
            setSelectedUrls(new Set());
            onRefresh();
        } catch {
            // silent
        } finally {
            setBulkLoading(false);
        }
    };

    const handleExportCsv = () => {
        if (!data) return;
        const rows = data.data;
        const header = 'URL,Status,Last Crawled,Coverage State,Blocked by Robots';
        const lines = rows.map(r =>
            `"${r.url}","${r.indexing_status ?? ''}","${r.last_crawled ?? ''}","${r.coverage_state ?? ''}","${r.blocked_by_robots}"`
        );
        const csv = [header, ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sitemap-urls-${projectId}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const rows = data?.data ?? [];
    const totalPages = data?.last_page ?? 1;

    const toggleSelect = (url: string) => {
        setSelectedUrls(prev => {
            const next = new Set(prev);
            if (next.has(url)) next.delete(url);
            else next.add(url);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedUrls.size === rows.length) {
            setSelectedUrls(new Set());
        } else {
            setSelectedUrls(new Set(rows.map(r => r.url)));
        }
    };

    return (
        <div className="ow-gsc-bento-card ow-sitemap-url-table-card" style={{ gridColumn: '1 / -1' }}>
            <div className="ow-gsc-bento-card-header">
                <Search size={15} style={{ color: 'var(--ws-accent)' }} />
                <span className="ow-gsc-bento-card-title">URL in Sitemap</span>
                {data && (
                    <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)', marginLeft: 6 }}>
                        {data.total.toLocaleString('it-IT')} totali
                    </span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                    {selectedUrls.size > 0 && (
                        <button
                            className="ow-btn ow-btn--primary"
                            style={{ padding: '4px 10px', fontSize: 'var(--ws-font-xs)' }}
                            onClick={handleBulkReindex}
                            disabled={bulkLoading}
                        >
                            {bulkLoading ? <Loader size={11} className="ws-spin" /> : <RefreshCw size={11} />}
                            Re-crawl ({selectedUrls.size})
                        </button>
                    )}
                    <select
                        className="ow-select"
                        style={{ padding: '4px 8px', fontSize: 'var(--ws-font-xs)', width: 'auto' }}
                        value={statusFilter}
                        onChange={e => handleStatusChange(e.target.value)}
                    >
                        {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <button
                        className="ow-btn ow-btn--secondary"
                        style={{ padding: '4px 8px', fontSize: 'var(--ws-font-xs)' }}
                        onClick={onSyncUrls}
                        disabled={syncing}
                        title="Importa URL dalla sitemap XML"
                    >
                        {syncing ? <Loader size={11} className="ws-spin" /> : <RefreshCw size={11} />}
                        Sincronizza
                    </button>
                    <button
                        className="ow-btn ow-btn--secondary"
                        style={{ padding: '4px 8px', fontSize: 'var(--ws-font-xs)' }}
                        onClick={handleExportCsv}
                        title="Esporta CSV"
                    >
                        <Download size={11} />
                    </button>
                </div>
            </div>

            {loading || fetching ? (
                <div className="ow-gsc-bento-loading">Caricamento…</div>
            ) : rows.length === 0 ? (
                <div className="ow-gsc-bento-empty">
                    <Search size={20} />
                    <span>Nessun URL in elenco. Clicca "Sincronizza" per importare gli URL dalla sitemap, oppure "Aggiorna Dati" nella dashboard GSC.</span>
                </div>
            ) : (
                <>
                    <div className="ow-table-wrapper" style={{ maxHeight: 320, overflowY: 'auto' }}>
                        <table className="ow-table ow-sitemap-url-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 32 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedUrls.size === rows.length && rows.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>URL</th>
                                    <th>Stato</th>
                                    <th>Ultimo crawl</th>
                                    <th>Coverage</th>
                                    <th>Robot bloccato</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.url}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedUrls.has(row.url)}
                                                onChange={() => toggleSelect(row.url)}
                                            />
                                        </td>
                                        <td style={{ maxWidth: 300 }}>
                                            <span
                                                className="ow-sitemap-url-link"
                                                title={row.url}
                                                style={{ cursor: 'pointer', color: 'var(--ws-accent)', fontSize: 'var(--ws-font-xs)' }}
                                                onClick={() => setInspectingUrl(row.url)}
                                            >
                                                {row.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60) || row.url}
                                            </span>
                                        </td>
                                        <td>{getStatusBadge(row.indexing_status)}</td>
                                        <td style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)', whiteSpace: 'nowrap' }}>
                                            {row.last_crawled ? new Date(row.last_crawled).toLocaleDateString('it-IT') : '—'}
                                        </td>
                                        <td style={{ fontSize: 'var(--ws-font-xs)' }}>
                                            {row.coverage_state ?? '—'}
                                        </td>
                                        <td>
                                            {row.blocked_by_robots
                                                ? <span className="ow-badge ow-badge--sm ow-badge--red">Sì</span>
                                                : <span className="ow-badge ow-badge--sm ow-badge--gray">No</span>}
                                        </td>
                                        <td>
                                            <button
                                                className="ow-btn ow-btn--ghost"
                                                style={{ padding: '2px 6px', fontSize: 'var(--ws-font-xs)' }}
                                                onClick={() => setInspectingUrl(row.url)}
                                                title="Ispeziona URL"
                                            >
                                                <ExternalLink size={10} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="ow-sitemap-pagination">
                            <button
                                className="ow-btn ow-btn--ghost"
                                style={{ padding: '4px 10px', fontSize: 'var(--ws-font-xs)' }}
                                disabled={page <= 1 || fetching}
                                onClick={() => fetchPage(page - 1, statusFilter)}
                            >
                                ‹ Prec.
                            </button>
                            <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)' }}>
                                Pag. {page} / {totalPages}
                            </span>
                            <button
                                className="ow-btn ow-btn--ghost"
                                style={{ padding: '4px 10px', fontSize: 'var(--ws-font-xs)' }}
                                disabled={page >= totalPages || fetching}
                                onClick={() => fetchPage(page + 1, statusFilter)}
                            >
                                Succ. ›
                            </button>
                        </div>
                    )}
                </>
            )}

            {inspectingUrl && (
                <SitemapUrlInspectorModal
                    projectId={projectId}
                    url={inspectingUrl}
                    onClose={() => setInspectingUrl(null)}
                />
            )}
        </div>
    );
};

export default SitemapUrlTable;
