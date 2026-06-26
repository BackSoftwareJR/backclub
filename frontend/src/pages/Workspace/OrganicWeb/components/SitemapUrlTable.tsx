import React, { useState, useCallback, useEffect } from 'react';
import { Search, Download, RefreshCw, Loader, ExternalLink, Zap, Brain, Code, X, Copy, Check } from 'lucide-react';
import type { GscUrlDetail, PaginatedResponse, SemanticGap, SgeReadiness } from '../../../../api/organicWeb';
import organicWebApi from '../../../../api/organicWeb';
import SitemapUrlInspectorModal from './SitemapUrlInspectorModal';

interface SitemapUrlTableProps {
    projectId: number;
    initialData: PaginatedResponse<GscUrlDetail> | null;
    loading?: boolean;
    onRefresh: () => void;
    onSyncUrls: () => void;
    syncing?: boolean;
    orphanUrls?: Set<string>;
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

type ActivePanel = { url: string; type: 'sg' | 'sge' } | null;

const SitemapUrlTable: React.FC<SitemapUrlTableProps> = ({
    projectId, initialData, loading, onRefresh, onSyncUrls, syncing, orphanUrls,
}) => {
    const [data, setData] = useState<PaginatedResponse<GscUrlDetail> | null>(initialData);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [fetching, setFetching] = useState(false);
    const [inspectingUrl, setInspectingUrl] = useState<string | null>(null);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [indexingUrls, setIndexingUrls] = useState<Set<string>>(new Set());

    // Inline panels
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);

    // Semantic Gap state
    const [sgKeyword, setSgKeyword] = useState('');
    const [sgResult, setSgResult] = useState<SemanticGap | null>(null);
    const [sgLoading, setSgLoading] = useState(false);

    // SGE state
    const [sgeResult, setSgeResult] = useState<SgeReadiness | null>(null);
    const [sgeLoading, setSgeLoading] = useState(false);
    const [sgeCopied, setSgeCopied] = useState(false);

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

    const handleRequestIndexing = async (url: string) => {
        if (indexingUrls.has(url)) return;
        setIndexingUrls(prev => new Set(prev).add(url));
        try {
            await organicWebApi.requestIndexing(projectId, [url]);
        } catch {
            // silent — user sees spinner stop as feedback
        } finally {
            setIndexingUrls(prev => {
                const next = new Set(prev);
                next.delete(url);
                return next;
            });
        }
    };

    const handleExportCsv = () => {
        if (!data) return;
        const rows = data.data;
        const header = 'URL,Status,Last Crawled,Coverage State,Blocked by Robots,Orphan';
        const lines = rows.map(r =>
            `"${r.url}","${r.indexing_status ?? ''}","${r.last_crawled ?? ''}","${r.coverage_state ?? ''}","${r.blocked_by_robots}","${orphanUrls?.has(r.url) || r.is_orphan ? 'Yes' : 'No'}"`
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

    const openPanel = (url: string, type: 'sg' | 'sge') => {
        if (activePanel?.url === url && activePanel.type === type) {
            // Toggle off
            setActivePanel(null);
            return;
        }
        // Reset panel-specific state
        setSgKeyword('');
        setSgResult(null);
        setSgeResult(null);
        setSgeCopied(false);
        setActivePanel({ url, type });

        if (type === 'sge') {
            // Immediately trigger SGE generation
            setSgeLoading(true);
            organicWebApi.generateSgeSchema(projectId, url)
                .then(res => setSgeResult(res.result))
                .catch(() => {/* silent */})
                .finally(() => setSgeLoading(false));
        }
    };

    const handleSgAnalyze = async () => {
        if (!activePanel || activePanel.type !== 'sg' || !sgKeyword.trim()) return;
        setSgLoading(true);
        setSgResult(null);
        try {
            const res = await organicWebApi.findSemanticGap(projectId, activePanel.url, sgKeyword.trim());
            setSgResult(res.gap);
        } catch {
            // silent
        } finally {
            setSgLoading(false);
        }
    };

    const handleCopySge = async () => {
        if (!sgeResult?.ai_generated_jsonld) return;
        try {
            await navigator.clipboard.writeText(sgeResult.ai_generated_jsonld);
            setSgeCopied(true);
            setTimeout(() => setSgeCopied(false), 2000);
        } catch {
            // silent
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
                    <div className="ow-table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
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
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => {
                                    const isOrphan = row.is_orphan === true || orphanUrls?.has(row.url) === true;
                                    const isPanelActive = activePanel?.url === row.url;

                                    return (
                                        <React.Fragment key={row.url}>
                                            <tr style={isOrphan ? { background: 'rgba(239,68,68,0.04)' } : undefined}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUrls.has(row.url)}
                                                        onChange={() => toggleSelect(row.url)}
                                                    />
                                                </td>
                                                <td style={{ maxWidth: 280 }}>
                                                    {isOrphan && (
                                                        <span className="ow-badge-orphan">Orfana</span>
                                                    )}
                                                    <span
                                                        className="ow-sitemap-url-link"
                                                        title={row.url}
                                                        style={{ cursor: 'pointer', color: 'var(--ws-accent)', fontSize: 'var(--ws-font-xs)' }}
                                                        onClick={() => setInspectingUrl(row.url)}
                                                    >
                                                        {row.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 55) || row.url}
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
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {/* Request indexing */}
                                                    <button
                                                        className="ow-btn ow-btn--ghost"
                                                        style={{ padding: '2px 6px', fontSize: 'var(--ws-font-xs)' }}
                                                        onClick={() => handleRequestIndexing(row.url)}
                                                        disabled={indexingUrls.has(row.url)}
                                                        title="Richiedi indicizzazione"
                                                    >
                                                        {indexingUrls.has(row.url)
                                                            ? <Loader size={10} className="ws-spin" />
                                                            : <Zap size={10} style={{ color: '#facc15' }} />}
                                                    </button>
                                                    {/* Inspect URL */}
                                                    <button
                                                        className="ow-btn ow-btn--ghost"
                                                        style={{ padding: '2px 6px', fontSize: 'var(--ws-font-xs)' }}
                                                        onClick={() => setInspectingUrl(row.url)}
                                                        title="Ispeziona URL"
                                                    >
                                                        <ExternalLink size={10} />
                                                    </button>
                                                    {/* Semantic Gap */}
                                                    <button
                                                        className="ow-btn ow-btn--ghost"
                                                        style={{
                                                            padding: '2px 6px',
                                                            fontSize: 'var(--ws-font-xs)',
                                                            color: isPanelActive && activePanel?.type === 'sg' ? '#c4b5fd' : undefined,
                                                        }}
                                                        onClick={() => openPanel(row.url, 'sg')}
                                                        title="Analisi Semantic Gap"
                                                    >
                                                        <Brain size={10} />
                                                    </button>
                                                    {/* JSON-LD / SGE */}
                                                    <button
                                                        className="ow-btn ow-btn--ghost"
                                                        style={{
                                                            padding: '2px 6px',
                                                            fontSize: 'var(--ws-font-xs)',
                                                            color: isPanelActive && activePanel?.type === 'sge' ? '#86efac' : undefined,
                                                        }}
                                                        onClick={() => openPanel(row.url, 'sge')}
                                                        title="Genera JSON-LD (SGE)"
                                                    >
                                                        <Code size={10} />
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* ── Inline Panel Row ── */}
                                            {isPanelActive && (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: '0 8px 12px', background: 'rgba(255,255,255,0.015)' }}>
                                                        <div className="ow-sg-panel">
                                                            {/* Panel header */}
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                                <span style={{ fontSize: 'var(--ws-font-xs)', fontWeight: 600, color: 'var(--ws-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    {activePanel.type === 'sg'
                                                                        ? <><Brain size={12} style={{ color: '#a78bfa' }} /> Semantic Gap — {row.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 50) || row.url}</>
                                                                        : <><Code size={12} style={{ color: '#86efac' }} /> JSON-LD / SGE — {row.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 50) || row.url}</>}
                                                                </span>
                                                                <button
                                                                    className="ow-btn ow-btn--ghost"
                                                                    style={{ padding: '2px 6px' }}
                                                                    onClick={() => setActivePanel(null)}
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>

                                                            {activePanel.type === 'sg' && (
                                                                <SemanticGapPanel
                                                                    keyword={sgKeyword}
                                                                    onKeywordChange={setSgKeyword}
                                                                    onAnalyze={handleSgAnalyze}
                                                                    loading={sgLoading}
                                                                    result={sgResult}
                                                                />
                                                            )}

                                                            {activePanel.type === 'sge' && (
                                                                <SgePanel
                                                                    loading={sgeLoading}
                                                                    result={sgeResult}
                                                                    copied={sgeCopied}
                                                                    onCopy={handleCopySge}
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
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

// ── Semantic Gap Panel ──────────────────────────────────────────────────────

interface SemanticGapPanelProps {
    keyword: string;
    onKeywordChange: (v: string) => void;
    onAnalyze: () => void;
    loading: boolean;
    result: SemanticGap | null;
}

const SemanticGapPanel: React.FC<SemanticGapPanelProps> = ({
    keyword, onKeywordChange, onAnalyze, loading, result,
}) => (
    <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input
                type="text"
                className="ow-input ow-input--sm"
                style={{ flex: 1 }}
                placeholder="Keyword target (es. SEO on-page, link building…)"
                value={keyword}
                onChange={e => onKeywordChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onAnalyze(); }}
            />
            <button
                className="ow-btn ow-btn--primary"
                style={{ padding: '5px 14px', fontSize: 'var(--ws-font-xs)', whiteSpace: 'nowrap' }}
                onClick={onAnalyze}
                disabled={loading || !keyword.trim()}
            >
                {loading ? <><Loader size={11} className="ws-spin" /> Analisi…</> : <><Brain size={11} /> Analizza</>}
            </button>
        </div>

        {result && (
            <div>
                {(result.missing_entities ?? []).length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--ws-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Entità mancanti
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {result.missing_entities!.map(entity => (
                                <span key={entity} className="ow-sg-entity">{entity}</span>
                            ))}
                        </div>
                    </div>
                )}
                {result.ai_suggested_paragraph && (
                    <div>
                        <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--ws-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Paragrafo suggerito dall'AI
                        </p>
                        <p style={{ margin: 0, fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                            {result.ai_suggested_paragraph}
                        </p>
                    </div>
                )}
            </div>
        )}
    </div>
);

// ── SGE Panel ───────────────────────────────────────────────────────────────

interface SgePanelProps {
    loading: boolean;
    result: SgeReadiness | null;
    copied: boolean;
    onCopy: () => void;
}

const SgePanel: React.FC<SgePanelProps> = ({ loading, result, copied, onCopy }) => {
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--ws-text-secondary)', fontSize: 'var(--ws-font-xs)' }}>
                <Loader size={14} className="ws-spin" style={{ color: 'var(--ws-accent)' }} />
                Generazione schema JSON-LD in corso…
            </div>
        );
    }

    if (!result) {
        return (
            <p style={{ margin: 0, fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-tertiary)' }}>
                Nessun risultato disponibile.
            </p>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {result.has_schema ? (
                    <span className="ow-badge ow-badge--sm ow-badge--green">Schema Presente</span>
                ) : (
                    <span className="ow-badge ow-badge--sm ow-badge--yellow">Schema Generato da AI</span>
                )}
                {result.schema_types && result.schema_types.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--ws-text-secondary)' }}>
                        {result.schema_types.join(', ')}
                    </span>
                )}
                {result.ai_generated_jsonld && (
                    <button
                        className="ow-btn ow-btn--secondary"
                        style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 'var(--ws-font-xs)' }}
                        onClick={onCopy}
                    >
                        {copied ? <><Check size={11} /> Copiato!</> : <><Copy size={11} /> Copia negli Appunti</>}
                    </button>
                )}
            </div>
            {result.ai_generated_jsonld && (
                <pre className="ow-sge-code">
                    <code>{result.ai_generated_jsonld}</code>
                </pre>
            )}
        </div>
    );
};

export default SitemapUrlTable;
