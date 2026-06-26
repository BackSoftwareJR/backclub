import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { SitemapOverview, GscSitemap, PaginatedResponse, GscUrlDetail, CoverageSummary } from '../../../../api/organicWeb';
import organicWebApi from '../../../../api/organicWeb';
import SitemapHealthCard from './SitemapHealthCard';
import SitemapAlertsCard from './SitemapAlertsCard';
import SitemapCoverageCard from './SitemapCoverageCard';
import SitemapListCard from './SitemapListCard';
import SitemapUrlTable from './SitemapUrlTable';
import RobotsTxtCard from './RobotsTxtCard';

interface SitemapTabProps {
    projectId: number;
}

function coverageFromSitemaps(sitemaps: GscSitemap[]): CoverageSummary {
    const total = sitemaps.reduce((sum, sitemap) => sum + sitemap.downloaded_urls, 0);
    const indexed = sitemaps.reduce((sum, sitemap) => sum + (sitemap.indexed_urls ?? 0), 0);

    return {
        total_urls_sitemap: total,
        indexed,
        errors: 0,
        missing_from_sitemap: Math.max(0, total - indexed),
    };
}

const SitemapTab: React.FC<SitemapTabProps> = ({ projectId }) => {
    const [overview, setOverview] = useState<SitemapOverview | null>(null);
    const [sitemaps, setSitemaps] = useState<GscSitemap[]>([]);
    const [urlData, setUrlData] = useState<PaginatedResponse<GscUrlDetail> | null>(null);
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingSitemaps, setLoadingSitemaps] = useState(true);
    const [loadingUrls, setLoadingUrls] = useState(true);
    const [syncingUrls, setSyncingUrls] = useState(false);
    const [overviewLoaded, setOverviewLoaded] = useState(false);

    const fetchOverview = useCallback(async () => {
        setLoadingOverview(true);
        try {
            const res = await organicWebApi.getSitemapOverview(projectId);
            setOverview(res);
            setOverviewLoaded(true);
        } catch {
            setOverview(null);
            setOverviewLoaded(false);
        } finally {
            setLoadingOverview(false);
        }
    }, [projectId]);

    const fetchSitemaps = useCallback(async () => {
        setLoadingSitemaps(true);
        try {
            const res = await organicWebApi.getSitemapList(projectId);
            setSitemaps(res.sitemaps);
        } catch {
            setSitemaps([]);
        } finally {
            setLoadingSitemaps(false);
        }
    }, [projectId]);

    const fetchUrls = useCallback(async () => {
        setLoadingUrls(true);
        try {
            const res = await organicWebApi.getSitemapUrls(projectId, { per_page: 25 });
            setUrlData(res);
        } catch {
            setUrlData(null);
        } finally {
            setLoadingUrls(false);
        }
    }, [projectId]);

    const syncUrlsFromSitemap = useCallback(async () => {
        setSyncingUrls(true);
        try {
            const res = await organicWebApi.syncSitemapUrls(projectId);
            if (res.coverage && overviewLoaded) {
                setOverview(prev => prev ? { ...prev, coverage: res.coverage } : prev);
            }
            await Promise.all([fetchUrls(), fetchOverview(), fetchSitemaps()]);
        } catch {
            // silent
        } finally {
            setSyncingUrls(false);
        }
    }, [projectId, fetchUrls, fetchOverview, fetchSitemaps, overviewLoaded]);

    useEffect(() => {
        fetchOverview();
        fetchSitemaps();
        fetchUrls();
    }, [fetchOverview, fetchSitemaps, fetchUrls]);

    useEffect(() => {
        if (loadingSitemaps || loadingUrls || syncingUrls) return;
        if (sitemaps.length > 0 && (urlData?.total ?? 0) === 0) {
            syncUrlsFromSitemap();
        }
    }, [loadingSitemaps, loadingUrls, syncingUrls, sitemaps.length, urlData?.total, syncUrlsFromSitemap]);

    const handleRefresh = () => {
        fetchOverview();
        fetchSitemaps();
        fetchUrls();
    };

    const coverage = useMemo(() => {
        if (overview?.coverage && overview.coverage.total_urls_sitemap > 0) {
            return overview.coverage;
        }
        if (sitemaps.length > 0) {
            return coverageFromSitemaps(sitemaps);
        }
        return overview?.coverage ?? { total_urls_sitemap: 0, indexed: 0, errors: 0, missing_from_sitemap: 0 };
    }, [overview, sitemaps]);

    return (
        <div className="ow-sitemap-tab">
            <div className="ow-gsc-bento-grid ow-sitemap-grid">
                <SitemapHealthCard
                    score={overview?.health_score ?? 0}
                    breakdown={overview?.health_breakdown ?? {}}
                    trend={overview?.health_trend ?? []}
                    loading={loadingOverview}
                    loaded={overviewLoaded}
                />

                <SitemapAlertsCard
                    alerts={overview?.alerts ?? []}
                    loading={loadingOverview}
                />

                <SitemapCoverageCard
                    coverage={coverage}
                    loading={loadingOverview && loadingSitemaps}
                />

                <SitemapListCard
                    projectId={projectId}
                    sitemaps={sitemaps}
                    loading={loadingSitemaps}
                    onRefresh={handleRefresh}
                />

                <SitemapUrlTable
                    projectId={projectId}
                    initialData={urlData}
                    loading={loadingUrls || syncingUrls}
                    onRefresh={handleRefresh}
                    onSyncUrls={syncUrlsFromSitemap}
                    syncing={syncingUrls}
                />

                <RobotsTxtCard projectId={projectId} />
            </div>
        </div>
    );
};

export default SitemapTab;
