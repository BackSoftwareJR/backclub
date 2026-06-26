<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicGscPerformanceDaily;
use App\Models\OrganicGscSitemap;
use App\Models\OrganicWebProject;
use App\Services\GoogleTokenService;
use Google\Service\SearchConsole;
use Google\Service\SearchConsole\SearchAnalyticsQueryRequest;
use Illuminate\Support\Facades\Log;

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

    /**
     * Syncs daily performance data from Google Search Console for the last 30 days.
     *
     * @return array{synced_days: int, start_date: string, end_date: string}
     *
     * @throws \RuntimeException
     */
    public function syncPerformance(int $projectId): array
    {
        try {
            $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);
            $siteUrl = $project->googleIntegration?->gsc_property_url;

            if (! $siteUrl) {
                throw new \RuntimeException('Proprietà GSC non selezionata per questo progetto. Seleziona una proprietà prima di sincronizzare i dati.');
            }

            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $service = new SearchConsole($client);

            $startDate = now()->subDays(30)->toDateString();
            $endDate = now()->toDateString();

            $request = new SearchAnalyticsQueryRequest;
            $request->setStartDate($startDate);
            $request->setEndDate($endDate);
            $request->setDimensions(['date']);
            $request->setRowLimit(5000);

            $response = $service->searchanalytics->query($siteUrl, $request);
            $rows = $response->getRows() ?? [];

            foreach ($rows as $row) {
                $keys = $row->getKeys();
                $date = $keys[0] ?? null;

                if (! $date) {
                    continue;
                }

                OrganicGscPerformanceDaily::updateOrCreate(
                    [
                        'organic_web_project_id' => $projectId,
                        'date' => $date,
                    ],
                    [
                        'clicks' => (int) $row->getClicks(),
                        'impressions' => (int) $row->getImpressions(),
                        'ctr' => $row->getCtr() ? round($row->getCtr() * 100, 2) : null,
                        'position' => $row->getPosition() ? round($row->getPosition(), 2) : null,
                    ]
                );
            }

            return [
                'synced_days' => count($rows),
                'start_date' => $startDate,
                'end_date' => $endDate,
            ];
        } catch (\RuntimeException $e) {
            Log::error('Errore sync performance GSC', [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Errore sync performance GSC', [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Errore sincronizzazione performance GSC: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Syncs sitemap data from Google Search Console.
     *
     * @return array{synced_sitemaps: int}
     *
     * @throws \RuntimeException
     */
    public function syncSitemaps(int $projectId, string $siteUrl): array
    {
        try {
            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $service = new SearchConsole($client);

            $response = $service->sitemaps->listSitemaps($siteUrl);
            $sitemaps = $response->getSitemap() ?? [];

            foreach ($sitemaps as $sitemap) {
                $path = $sitemap->getPath();
                $lastSubmitted = $sitemap->getLastSubmitted();
                $lastDownloaded = $sitemap->getLastDownloaded();
                $isPending = $sitemap->getIsPending();
                $isSitemapsIndex = $sitemap->getIsSitemapsIndex();
                $warnings = $sitemap->getWarnings();
                $contents = $sitemap->getContents();

                $errors = null;
                if ($warnings && count($warnings) > 0) {
                    $errorMessages = [];
                    foreach ($warnings as $warning) {
                        $errorMessages[] = $warning->getMessage() ?? 'Unknown warning';
                    }
                    $errors = implode('; ', $errorMessages);
                }

                $status = 'success';
                if ($isPending) {
                    $status = 'pending';
                } elseif ($errors) {
                    $status = 'warning';
                }

                $downloadedUrls = 0;
                if ($contents && count($contents) > 0) {
                    foreach ($contents as $content) {
                        $downloadedUrls += (int) $content->getSubmitted();
                    }
                }

                OrganicGscSitemap::updateOrCreate(
                    [
                        'organic_web_project_id' => $projectId,
                        'path' => $path,
                    ],
                    [
                        'last_submitted' => $lastSubmitted ? \Carbon\Carbon::parse($lastSubmitted) : null,
                        'last_downloaded' => $lastDownloaded ? \Carbon\Carbon::parse($lastDownloaded) : null,
                        'status' => $status,
                        'downloaded_urls' => $downloadedUrls,
                        'errors' => $errors,
                    ]
                );
            }

            return [
                'synced_sitemaps' => count($sitemaps),
            ];
        } catch (\RuntimeException $e) {
            Log::error('Errore sync sitemaps GSC', [
                'project_id' => $projectId,
                'site_url' => $siteUrl,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Errore sync sitemaps GSC', [
                'project_id' => $projectId,
                'site_url' => $siteUrl,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Errore sincronizzazione sitemaps GSC: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Syncs indexing issues from Google Search Console.
     *
     * @return array{message: string}
     */
    public function syncIndexingIssues(int $projectId): array
    {
        return ['message' => 'Not implemented'];
    }
}
