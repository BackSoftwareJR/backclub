import React, { useState, useCallback } from 'react';
import { Map, Zap, RefreshCw, Info, LinkIcon, Loader } from 'lucide-react';
import organicWebApi from '../../../api/organicWeb';
import SitemapTab from './components/SitemapTab';

interface SitemapIndexTabProps {
    projectId: number;
    websiteUrl?: string;
    onOrphanCountChange?: (count: number) => void;
}

/**
 * SitemapIndexTab — Root-level tab for "Sitemap & Indicizzazione".
 *
 * Wraps the comprehensive SitemapTab and adds a header with the
 * "Pinga Sitemap" action, now wired to the real pingSitemap API.
 */
const SitemapIndexTab: React.FC<SitemapIndexTabProps> = ({ projectId, websiteUrl, onOrphanCountChange }) => {
    const [pinging, setPinging] = useState(false);
    const [pingResult, setPingResult] = useState<'success' | 'error' | null>(null);

    // Orphan state
    const [orphanUrls, setOrphanUrls] = useState<Set<string>>(new Set());
    const [calculatingOrphans, setCalculatingOrphans] = useState(false);

    const sitemapUrl = websiteUrl
        ? `${websiteUrl.replace(/\/$/, '')}/sitemap.xml`
        : null;

    const handlePingSitemap = useCallback(async () => {
        if (!sitemapUrl) return;
        setPinging(true);
        setPingResult(null);
        try {
            await organicWebApi.pingSitemap(projectId, sitemapUrl);
            setPingResult('success');
        } catch {
            setPingResult('error');
        } finally {
            setPinging(false);
            setTimeout(() => setPingResult(null), 4000);
        }
    }, [projectId, sitemapUrl]);

    const handleCalculateOrphans = useCallback(async () => {
        setCalculatingOrphans(true);
        try {
            await organicWebApi.calculateOrphans(projectId);
            const res = await organicWebApi.listOrphans(projectId);
            const urls = new Set(res.orphans.map(o => o.url));
            setOrphanUrls(urls);
            onOrphanCountChange?.(urls.size);
        } catch {
            // silent
        } finally {
            setCalculatingOrphans(false);
        }
    }, [projectId, onOrphanCountChange]);

    return (
        <div>
            {/* ── Header ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Map size={20} style={{ color: '#60a5fa' }} />
                    </div>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: 'var(--ws-font-lg)',
                            fontWeight: 700,
                            color: 'var(--ws-text)',
                            lineHeight: 1.2,
                        }}>
                            Sitemap & Indicizzazione
                        </h2>
                        <p style={{
                            margin: '3px 0 0',
                            fontSize: 'var(--ws-font-sm)',
                            color: 'var(--ws-text-secondary)',
                        }}>
                            Gestisci sitemap, copertura URL e indicizzazione Google
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Ping result feedback */}
                    {pingResult === 'success' && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 12px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: '#34d399',
                            fontWeight: 500,
                        }}>
                            Sitemap inviata a Google per la scansione
                        </span>
                    )}
                    {pingResult === 'error' && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: '#f87171',
                            fontWeight: 500,
                        }}>
                            Errore durante il ping
                        </span>
                    )}

                    {/* Ricalcola Orfane button */}
                    <button
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 18px',
                            background: calculatingOrphans
                                ? 'rgba(239, 68, 68, 0.06)'
                                : 'rgba(239, 68, 68, 0.10)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 10,
                            color: '#f87171',
                            fontSize: 'var(--ws-font-sm)',
                            fontWeight: 600,
                            cursor: calculatingOrphans ? 'not-allowed' : 'pointer',
                            opacity: calculatingOrphans ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                        }}
                        onClick={handleCalculateOrphans}
                        disabled={calculatingOrphans}
                        title="Calcola le pagine senza link interni in entrata"
                    >
                        {calculatingOrphans ? (
                            <>
                                <Loader size={14} style={{ animation: 'ws-spin 1s linear infinite' }} />
                                Calcolo…
                            </>
                        ) : (
                            <>
                                <LinkIcon size={14} />
                                Ricalcola Orfane
                                {orphanUrls.size > 0 && (
                                    <span style={{
                                        marginLeft: 2,
                                        padding: '1px 6px',
                                        borderRadius: 9999,
                                        background: 'rgba(239,68,68,0.2)',
                                        fontSize: 11,
                                        fontWeight: 700,
                                    }}>
                                        {orphanUrls.size}
                                    </span>
                                )}
                            </>
                        )}
                    </button>

                    {/* Ping Sitemap button */}
                    <button
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 18px',
                            background: pinging
                                ? 'rgba(59, 130, 246, 0.08)'
                                : 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: 10,
                            color: '#60a5fa',
                            fontSize: 'var(--ws-font-sm)',
                            fontWeight: 600,
                            cursor: pinging || !sitemapUrl ? 'not-allowed' : 'pointer',
                            opacity: pinging || !sitemapUrl ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                        }}
                        onClick={handlePingSitemap}
                        disabled={pinging || !sitemapUrl}
                        title={sitemapUrl ?? 'URL sitemap non disponibile'}
                    >
                        {pinging ? (
                            <>
                                <RefreshCw
                                    size={14}
                                    style={{ animation: 'ws-spin 1s linear infinite' }}
                                />
                                Ping in corso…
                            </>
                        ) : (
                            <>
                                <Zap size={14} />
                                Pinga Sitemap
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Info banner ── */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: 10,
                marginBottom: 20,
            }}>
                <Info size={14} style={{ color: '#60a5fa', marginTop: 1, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)', lineHeight: 1.5 }}>
                    Usa <strong style={{ color: 'var(--ws-text)' }}>Pinga Sitemap</strong> per notificare i motori di ricerca degli aggiornamenti
                    {sitemapUrl && (
                        <> · <code style={{ fontSize: 10, color: 'var(--ws-text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: 3 }}>{sitemapUrl}</code></>
                    )}.
                    Per richiedere l'indicizzazione di un URL specifico, clicca sull'icona <Zap size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> accanto all'URL nella tabella sottostante.
                </p>
            </div>

            {/* ── Comprehensive SitemapTab ── */}
            <SitemapTab projectId={projectId} orphanUrls={orphanUrls} />
        </div>
    );
};

export default SitemapIndexTab;
