import React from 'react';
import { PieChart } from 'lucide-react';
import type { CoverageSummary } from '../../../../api/organicWeb';

interface SitemapCoverageCardProps {
    coverage: CoverageSummary;
    loading?: boolean;
}

const SitemapCoverageCard: React.FC<SitemapCoverageCardProps> = ({ coverage, loading }) => {
    const { total_urls_sitemap: total, indexed, errors, missing_from_sitemap: missing } = coverage;
    const indexedPct = total > 0 ? Math.round((indexed / total) * 100) : 0;

    return (
        <div className="ow-gsc-bento-card ow-sitemap-coverage-card">
            <div className="ow-gsc-bento-card-header">
                <PieChart size={15} style={{ color: 'var(--ws-accent)' }} />
                <span className="ow-gsc-bento-card-title">Copertura</span>
                {total > 0 && (
                    <span
                        className={`ow-badge ow-badge--sm ${indexedPct >= 80 ? 'ow-badge--green' : indexedPct >= 50 ? 'ow-badge--yellow' : 'ow-badge--red'}`}
                        style={{ marginLeft: 'auto' }}
                    >
                        {indexedPct}%
                    </span>
                )}
            </div>

            {loading ? (
                <div className="ow-gsc-bento-loading">Caricamento…</div>
            ) : (
                <div className="ow-sitemap-coverage-stats">
                    <div className="ow-sitemap-coverage-stat">
                        <span className="ow-sitemap-coverage-value">{total.toLocaleString('it-IT')}</span>
                        <span className="ow-sitemap-coverage-label">URL in sitemap</span>
                    </div>
                    <div className="ow-sitemap-coverage-stat">
                        <span className="ow-sitemap-coverage-value" style={{ color: 'var(--ws-green)' }}>
                            {indexed.toLocaleString('it-IT')}
                        </span>
                        <span className="ow-sitemap-coverage-label">Indicizzati</span>
                    </div>
                    <div className="ow-sitemap-coverage-stat">
                        <span className="ow-sitemap-coverage-value" style={{ color: errors > 0 ? 'var(--ws-red)' : 'var(--ws-text-secondary)' }}>
                            {errors.toLocaleString('it-IT')}
                        </span>
                        <span className="ow-sitemap-coverage-label">Errori</span>
                    </div>
                    <div className="ow-sitemap-coverage-stat">
                        <span className="ow-sitemap-coverage-value" style={{ color: missing > 0 ? 'var(--ws-orange)' : 'var(--ws-text-secondary)' }}>
                            {missing.toLocaleString('it-IT')}
                        </span>
                        <span className="ow-sitemap-coverage-label">Mancanti</span>
                    </div>

                    {total > 0 && (
                        <div className="ow-sitemap-coverage-bar-wrap">
                            <div className="ow-sitemap-coverage-bar">
                                <div
                                    className="ow-sitemap-coverage-bar-fill"
                                    style={{ width: `${indexedPct}%` }}
                                />
                            </div>
                            <span className="ow-sitemap-coverage-bar-label">{indexedPct}% indicizzato</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SitemapCoverageCard;
