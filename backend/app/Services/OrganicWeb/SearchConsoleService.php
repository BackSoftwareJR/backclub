<?php

namespace App\Services\OrganicWeb;

use App\Services\GoogleTokenService;
use Google\Service\SearchConsole;
use Google\Service\SearchConsole\SearchAnalyticsQueryRequest;

final class SearchConsoleService
{
    public function __construct(
        private readonly GoogleTokenService $tokenService,
    ) {}

    /**
     * Lists all sites verified in Google Search Console for the given Organic Web project.
     *
     * @return array{sites: \Google\Service\SearchConsole\WmxSite[]}
     *
     * @throws \RuntimeException
     */
    public function listSites(int $projectId): array
    {
        try {
            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $service = new SearchConsole($client);
            $siteList = $service->sites->listSites();

            return ['sites' => $siteList->getSiteEntry() ?? []];
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Errore Google Search Console (listSites): '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Submits a sitemap URL for the given site.
     *
     * @throws \RuntimeException
     */
    public function submitSitemap(int $projectId, string $siteUrl, string $sitemapUrl): void
    {
        try {
            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $service = new SearchConsole($client);
            $service->sitemaps->submit($siteUrl, $sitemapUrl);
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Errore Google Search Console (submitSitemap): '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Retrieves search analytics data for a site within the given date range.
     *
     * @return array{rows: \Google\Service\SearchConsole\ApiDataRow[]}
     *
     * @throws \RuntimeException
     */
    public function getAnalytics(int $projectId, string $siteUrl, string $startDate, string $endDate): array
    {
        try {
            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $service = new SearchConsole($client);

            $postBody = new SearchAnalyticsQueryRequest;
            $postBody->setStartDate($startDate);
            $postBody->setEndDate($endDate);
            $postBody->setDimensions(['query', 'page']);
            $postBody->setRowLimit(100);

            $response = $service->searchanalytics->query($siteUrl, $postBody);

            return ['rows' => $response->getRows() ?? []];
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Errore Google Search Console (getAnalytics): '.$e->getMessage(), 0, $e);
        }
    }
}
