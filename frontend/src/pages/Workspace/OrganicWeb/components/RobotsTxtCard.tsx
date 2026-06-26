import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Loader, AlertCircle, ExternalLink } from 'lucide-react';
import type { RobotsTxtData } from '../../../../api/organicWeb';
import organicWebApi from '../../../../api/organicWeb';

interface RobotsTxtCardProps {
    projectId: number;
}

function highlightRobotsTxt(content: string): React.ReactNode[] {
    return content.split('\n').map((line, i) => {
        const trimmed = line.trim();
        let color = 'var(--ws-text)';
        if (trimmed.startsWith('#')) {
            color = 'var(--ws-text-tertiary)';
        } else if (/^User-agent:/i.test(trimmed)) {
            color = 'var(--ws-accent)';
        } else if (/^Disallow:/i.test(trimmed)) {
            color = 'var(--ws-red)';
        } else if (/^Allow:/i.test(trimmed)) {
            color = 'var(--ws-green)';
        } else if (/^Sitemap:/i.test(trimmed)) {
            color = 'var(--ws-orange)';
        }
        return (
            <div key={i} style={{ color, minHeight: '1.4em' }}>
                {line || '\u00a0'}
            </div>
        );
    });
}

const RobotsTxtCard: React.FC<RobotsTxtCardProps> = ({ projectId }) => {
    const [data, setData] = useState<RobotsTxtData | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    const fetchRobots = async () => {
        setLoading(true);
        try {
            const res = await organicWebApi.getRobotsTxt(projectId);
            setData(res);
            setFetched(true);
        } catch {
            setData({ content: null, url: null, fetched_at: new Date().toISOString(), error: 'Errore nel recupero del file.' });
            setFetched(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRobots();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const disallowCount = data?.content
        ? (data.content.match(/^Disallow:/gim) ?? []).length
        : 0;

    const hasSitemapRef = data?.content
        ? /^Sitemap:/im.test(data.content)
        : false;

    return (
        <div className="ow-gsc-bento-card ow-robots-txt-card" style={{ gridColumn: '1 / -1' }}>
            <div className="ow-gsc-bento-card-header">
                <FileText size={15} style={{ color: 'var(--ws-text-secondary)' }} />
                <span className="ow-gsc-bento-card-title">robots.txt</span>
                {data?.url && (
                    <a
                        href={data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-secondary)', marginLeft: 6, display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                        {data.url} <ExternalLink size={10} />
                    </a>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {data?.fetched_at && (
                        <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-tertiary)' }}>
                            {new Date(data.fetched_at).toLocaleTimeString('it-IT')}
                        </span>
                    )}
                    <button
                        className="ow-btn ow-btn--secondary"
                        style={{ padding: '4px 8px' }}
                        onClick={fetchRobots}
                        disabled={loading}
                        title="Aggiorna"
                    >
                        {loading ? <Loader size={11} className="ws-spin" /> : <RefreshCw size={11} />}
                    </button>
                </div>
            </div>

            {fetched && data && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span className={`ow-badge ow-badge--sm ${disallowCount > 0 ? 'ow-badge--yellow' : 'ow-badge--green'}`}>
                        {disallowCount} regola{disallowCount !== 1 ? 'e' : ''} Disallow
                    </span>
                    <span className={`ow-badge ow-badge--sm ${hasSitemapRef ? 'ow-badge--green' : 'ow-badge--yellow'}`}>
                        {hasSitemapRef ? 'Sitemap dichiarata' : 'Sitemap non dichiarata'}
                    </span>
                </div>
            )}

            {loading && !fetched ? (
                <div className="ow-gsc-bento-loading">Recupero robots.txt…</div>
            ) : data?.error ? (
                <div className="ow-error-row">
                    <AlertCircle size={13} /> {data.error}
                </div>
            ) : data?.content ? (
                <pre className="ow-robots-txt-pre">
                    {highlightRobotsTxt(data.content)}
                </pre>
            ) : (
                <div className="ow-gsc-bento-empty">
                    <FileText size={20} />
                    <span>File robots.txt non disponibile</span>
                </div>
            )}
        </div>
    );
};

export default RobotsTxtCard;
