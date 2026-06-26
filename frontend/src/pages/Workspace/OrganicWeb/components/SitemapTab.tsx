import React, { useState, useEffect, useCallback } from 'react';
import type { SitemapOverview, GscSitemap, PaginatedResponse, GscUrlDetail } from '../../../../api/organicWeb';
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

const SitemapTab: React.FC<SitemapTabProps> = ({ projectId }) => {
    const [overview, setOverview] = useState<SitemapOverview | null>(null);
    const [sitemaps, setSitemaps] = useState<GscSitemap[]>([]);
    const [urlData, setUrlData] = useState<PaginatedResponse<GscUrlDetail> | null>(null);
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingSitemaps, setLoadingSitemaps] = useState(true);
    const [loadingUrls, setLoadingUrls] = useState(true);

    const fetchOverview = useCallback(async () => {
        setLoadingOverview(true);
        try {
            const res = await organicWebApi.getSitemapOverview(projectId);
            setOverview(res);
        } catch {
            // silent
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
            // silent
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
            // silent
        } finally {
            setLoadingUrls(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchOverview();
        fetchSitemaps();
        fetchUrls();
    }, [fetchOverview, fetchSitemaps, fetchUrls]);

    const handleRefresh = () => {
        fetchOverview();
        fetchSitemaps();
        fetchUrls();
    };

    const emptyCoverage = { total_urls_sitemap: 0, indexed: 0, errors: 0, missing_from_sitemap: 0 };

    return (
        <div className="ow-sitemap-tab">
            <div className="ow-gsc-bento-grid ow-sitemap-grid">
                <SitemapHealthCard
                    score={overview?.health_score ?? 0}
                    breakdown={overview?.health_breakdown ?? {}}
                    trend={overview?.health_trend ?? []}
                    loading={loadingOverview}
                />

                <SitemapAlertsCard
                    alerts={overview?.alerts ?? []}
                    loading={loadingOverview}
                />

                <SitemapCoverageCard
                    coverage={overview?.coverage ?? emptyCoverage}
                    loading={loadingOverview}
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
                    loading={loadingUrls}
                    onRefresh={handleRefresh}
                />

                <RobotsTxtCard projectId={projectId} />
            </div>
        </div>
    );
};

export default SitemapTab;
