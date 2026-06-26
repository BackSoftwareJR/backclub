<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicGscPerformanceDaily;
use App\Models\OrganicGscSitemap;
use App\Models\OrganicGscUrlDetail;
use App\Models\OrganicSitemapAlert;
use App\Models\OrganicWebProject;
use App\Services\GoogleTokenService;
use Google\Service\SearchConsole;
use Google\Service\SearchConsole\SearchAnalyticsQueryRequest;
use Illuminate\Support\Facades\Http;
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

    /**
     * Inspects a single URL via GSC URL Inspection API.
     *
     * @return array<string, mixed>
     *
     * @throws \RuntimeException
     */
    public function inspectUrl(int $projectId, string $url): array
    {
        try {
            $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);
            $siteUrl = $project->googleIntegration?->gsc_property_url;

            if (! $siteUrl) {
                throw new \RuntimeException('Proprietà GSC non selezionata per questo progetto.');
            }

            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $accessToken = $client->getAccessToken();
            $tokenStr = is_array($accessToken) ? ($accessToken['access_token'] ?? '') : (string) $accessToken;

            $response = Http::withToken($tokenStr)
                ->post('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', [
                    'inspectionUrl' => $url,
                    'siteUrl' => $siteUrl,
                ]);

            if ($response->failed()) {
                throw new \RuntimeException('Errore GSC URL Inspection: '.$response->body());
            }

            $data = $response->json();
            $result = $data['inspectionResult'] ?? [];
            $indexStatus = $result['indexStatusResult'] ?? [];
            $mobileUsability = $result['mobileUsabilityResult'] ?? [];

            $errors = [];
            if (! empty($indexStatus['indexingState']) && $indexStatus['indexingState'] !== 'INDEXING_ALLOWED') {
                $errors[] = $indexStatus['indexingState'];
            }

            $detail = OrganicGscUrlDetail::updateOrCreate(
                ['organic_web_project_id' => $projectId, 'url' => $url],
                [
                    'indexing_status' => $indexStatus['verdict'] ?? null,
                    'last_crawled' => ! empty($indexStatus['lastCrawlTime'])
                        ? \Carbon\Carbon::parse($indexStatus['lastCrawlTime'])
                        : null,
                    'canonical_url' => $indexStatus['googleCanonical'] ?? null,
                    'mobile_usability' => $mobileUsability['verdict'] ?? null,
                    'coverage_state' => $indexStatus['coverageState'] ?? null,
                    'blocked_by_robots' => ($indexStatus['robotsTxtState'] ?? '') === 'BLOCKED_BY_ROBOTS_TXT',
                    'errors_json' => $errors ?: null,
                ]
            );

            return [
                'url' => $detail->url,
                'indexing_status' => $detail->indexing_status,
                'last_crawled' => $detail->last_crawled?->toIso8601String(),
                'canonical_url' => $detail->canonical_url,
                'mobile_usability' => $detail->mobile_usability,
                'coverage_state' => $detail->coverage_state,
                'blocked_by_robots' => $detail->blocked_by_robots,
                'errors' => $detail->errors_json ?? [],
            ];
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Errore GSC inspectUrl: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Requests indexing for a URL via Google Indexing API.
     *
     * @throws \RuntimeException
     */
    public function requestIndexing(int $projectId, string $url): void
    {
        try {
            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $accessToken = $client->getAccessToken();
            $tokenStr = is_array($accessToken) ? ($accessToken['access_token'] ?? '') : (string) $accessToken;

            $response = Http::withToken($tokenStr)
                ->post('https://indexing.googleapis.com/v3/urlNotifications:publish', [
                    'url' => $url,
                    'type' => 'URL_UPDATED',
                ]);

            if ($response->failed()) {
                throw new \RuntimeException('Errore Indexing API: '.$response->body());
            }
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Errore requestIndexing: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Retrieves detailed sitemap information including error breakdown.
     *
     * @return array<string, mixed>
     *
     * @throws \RuntimeException
     */
    public function getSitemapDetail(int $projectId, string $sitemapPath): array
    {
        try {
            $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);
            $siteUrl = $project->googleIntegration?->gsc_property_url;

            if (! $siteUrl) {
                throw new \RuntimeException('Proprietà GSC non selezionata per questo progetto.');
            }

            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $service = new SearchConsole($client);

            $sitemap = $service->sitemaps->get($siteUrl, $sitemapPath);

            $contents = [];
            foreach ($sitemap->getContents() ?? [] as $content) {
                $contents[] = [
                    'type' => $content->getType(),
                    'submitted' => $content->getSubmitted(),
                    'indexed' => $content->getIndexed(),
                ];
            }

            $warnings = [];
            foreach ($sitemap->getWarnings() ?? [] as $w) {
                $warnings[] = $w->getMessage();
            }

            $errors = [];
            foreach ($sitemap->getErrors() ?? [] as $e) {
                $errors[] = $e->getMessage();
            }

            return [
                'path' => $sitemap->getPath(),
                'last_submitted' => $sitemap->getLastSubmitted(),
                'last_downloaded' => $sitemap->getLastDownloaded(),
                'is_pending' => $sitemap->getIsPending(),
                'is_index' => $sitemap->getIsSitemapsIndex(),
                'contents' => $contents,
                'warnings' => $warnings,
                'errors' => $errors,
            ];
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Errore getSitemapDetail: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Deletes a sitemap from Google Search Console.
     *
     * @throws \RuntimeException
     */
    public function deleteSitemap(int $projectId, string $siteUrl, string $sitemapUrl): void
    {
        try {
            $client = $this->tokenService->getAuthenticatedClient($projectId);
            $service = new SearchConsole($client);
            $service->sitemaps->delete($siteUrl, $sitemapUrl);
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Errore deleteSitemap: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Calculates a health score (0-100) for the project's GSC setup.
     *
     * Score breakdown:
     *  - Start at 100
     *  - No sitemap: -50
     *  - Each sitemap with errors: -10
     *  - Last submitted > 30 days ago: -15
     *  - Indexed < 50% of total: -20
     *  - Each active critical alert: -5
     *
     * @return array{score: int, breakdown: array<string, int>}
     */
    public function calculateHealthScore(int $projectId): array
    {
        $score = 100;
        $breakdown = [];

        $sitemaps = OrganicGscSitemap::where('organic_web_project_id', $projectId)->get();

        if ($sitemaps->isEmpty()) {
            $score -= 50;
            $breakdown['no_sitemap'] = -50;
        } else {
            $sitemapsWithErrors = $sitemaps->filter(fn ($s) => ! empty($s->errors))->count();
            if ($sitemapsWithErrors > 0) {
                $penalty = $sitemapsWithErrors * 10;
                $score -= $penalty;
                $breakdown['sitemap_errors'] = -$penalty;
            }

            $stale = $sitemaps->filter(function ($s) {
                return $s->last_submitted && $s->last_submitted->lt(now()->subDays(30));
            })->count();

            if ($stale > 0) {
                $score -= 15;
                $breakdown['stale_sitemaps'] = -15;
            }

            $totalUrls = $sitemaps->sum('downloaded_urls');
            $indexedUrls = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->where('indexing_status', 'PASS')
                ->count();

            if ($totalUrls > 0 && $indexedUrls < ($totalUrls * 0.5)) {
                $score -= 20;
                $breakdown['low_coverage'] = -20;
            }
        }

        $criticalAlerts = OrganicSitemapAlert::where('organic_web_project_id', $projectId)
            ->whereNull('resolved_at')
            ->where('severity', 'critical')
            ->count();

        if ($criticalAlerts > 0) {
            $penalty = $criticalAlerts * 5;
            $score -= $penalty;
            $breakdown['critical_alerts'] = -$penalty;
        }

        return [
            'score' => max(0, $score),
            'breakdown' => $breakdown,
        ];
    }
}
