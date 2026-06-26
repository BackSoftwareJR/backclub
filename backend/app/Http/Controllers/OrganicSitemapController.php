<?php

namespace App\Http\Controllers;

use App\Models\OrganicGscSitemap;
use App\Models\OrganicGscUrlDetail;
use App\Models\OrganicSitemapAlert;
use App\Models\OrganicSitemapHealthHistory;
use App\Models\OrganicWebProject;
use App\Services\OrganicWeb\SearchConsoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class OrganicSitemapController extends Controller
{
    public function __construct(
        private readonly SearchConsoleService $searchConsoleService,
    ) {}

    /**
     * Returns health score, active alerts, and coverage summary.
     */
    public function overview(int $projectId): JsonResponse
    {
        try {
            $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);

            $this->generateAlerts($projectId, $project);

            $healthResult = $this->searchConsoleService->calculateHealthScore($projectId);

            OrganicSitemapHealthHistory::create([
                'organic_web_project_id' => $projectId,
                'score' => $healthResult['score'],
                'breakdown_json' => $healthResult['breakdown'],
                'recorded_at' => now(),
            ]);

            $alerts = OrganicSitemapAlert::where('organic_web_project_id', $projectId)
                ->whereNull('resolved_at')
                ->orderBy('severity')
                ->orderByDesc('created_at')
                ->get()
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'type' => $a->type,
                    'severity' => $a->severity,
                    'message' => $a->message,
                ]);

            $sitemaps = OrganicGscSitemap::where('organic_web_project_id', $projectId)->get();
            $totalUrls = $sitemaps->sum('downloaded_urls');

            $indexed = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->where('indexing_status', 'PASS')
                ->count();

            $errors = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->whereNotNull('errors_json')
                ->count();

            $missing = max(0, $totalUrls - $indexed);

            $trendHistory = OrganicSitemapHealthHistory::where('organic_web_project_id', $projectId)
                ->orderByDesc('recorded_at')
                ->limit(10)
                ->get()
                ->map(fn ($h) => ['score' => $h->score, 'recorded_at' => $h->recorded_at?->toIso8601String()])
                ->reverse()
                ->values();

            return response()->json([
                'health_score' => $healthResult['score'],
                'health_breakdown' => $healthResult['breakdown'],
                'health_trend' => $trendHistory,
                'alerts' => $alerts,
                'coverage' => [
                    'total_urls_sitemap' => $totalUrls,
                    'indexed' => $indexed,
                    'errors' => $errors,
                    'missing_from_sitemap' => $missing,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Sitemap overview error', ['project_id' => $projectId, 'error' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Returns list of sitemaps with details.
     */
    public function list(int $projectId): JsonResponse
    {
        try {
            OrganicWebProject::findOrFail($projectId);

            $sitemaps = OrganicGscSitemap::where('organic_web_project_id', $projectId)
                ->orderByDesc('last_submitted')
                ->get();

            return response()->json(['sitemaps' => $sitemaps]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Submits a new sitemap to GSC and stores it locally.
     */
    public function submit(int $projectId, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'sitemap_url' => 'required|string|url|max:2048',
            ]);

            $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);
            $siteUrl = $project->googleIntegration?->gsc_property_url;

            if (! $siteUrl) {
                return response()->json(['success' => false, 'message' => 'Proprietà GSC non selezionata.'], 422);
            }

            $this->searchConsoleService->submitSitemap($projectId, $siteUrl, $validated['sitemap_url']);

            OrganicGscSitemap::updateOrCreate(
                ['organic_web_project_id' => $projectId, 'path' => $validated['sitemap_url']],
                ['status' => 'pending', 'last_submitted' => now()]
            );

            return response()->json(['success' => true, 'message' => 'Sitemap inviata con successo.']);
        } catch (\Throwable $e) {
            Log::error('Submit sitemap error', ['project_id' => $projectId, 'error' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Removes a sitemap from GSC and deletes it locally.
     */
    public function destroy(int $projectId, int $sitemapId): JsonResponse
    {
        try {
            $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);
            $siteUrl = $project->googleIntegration?->gsc_property_url;

            $sitemap = OrganicGscSitemap::where('organic_web_project_id', $projectId)
                ->findOrFail($sitemapId);

            if ($siteUrl) {
                try {
                    $this->searchConsoleService->deleteSitemap($projectId, $siteUrl, $sitemap->path);
                } catch (\Throwable $e) {
                    Log::warning('Could not delete sitemap from GSC', ['error' => $e->getMessage()]);
                }
            }

            $sitemap->delete();

            return response()->json(['success' => true, 'message' => 'Sitemap rimossa.']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Returns paginated list of indexed URLs with optional filters.
     */
    public function urls(int $projectId, Request $request): JsonResponse
    {
        try {
            OrganicWebProject::findOrFail($projectId);

            $query = OrganicGscUrlDetail::where('organic_web_project_id', $projectId);

            if ($request->filled('status')) {
                $query->where('indexing_status', $request->input('status'));
            }

            $perPage = min((int) $request->input('per_page', 25), 100);
            $results = $query->orderByDesc('updated_at')->paginate($perPage);

            return response()->json([
                'data' => $results->items(),
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'per_page' => $results->perPage(),
                'total' => $results->total(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Inspects a single URL via GSC URL Inspection API.
     */
    public function inspectUrl(int $projectId, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'url' => 'required|string|url|max:2048',
            ]);

            $result = $this->searchConsoleService->inspectUrl($projectId, $validated['url']);

            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('Inspect URL error', ['project_id' => $projectId, 'error' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Queues indexing requests for multiple URLs.
     */
    public function requestIndexing(int $projectId, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'urls' => 'required|array|min:1|max:50',
                'urls.*' => 'required|string|url|max:2048',
            ]);

            $queued = 0;
            $errors = [];

            foreach ($validated['urls'] as $url) {
                try {
                    $this->searchConsoleService->requestIndexing($projectId, $url);
                    $queued++;
                } catch (\Throwable $e) {
                    $errors[] = ['url' => $url, 'error' => $e->getMessage()];
                }
            }

            return response()->json([
                'success' => true,
                'queued' => $queued,
                'errors' => $errors,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Returns coverage summary (indexed vs total vs errors).
     */
    public function coverage(int $projectId): JsonResponse
    {
        try {
            OrganicWebProject::findOrFail($projectId);

            $sitemaps = OrganicGscSitemap::where('organic_web_project_id', $projectId)->get();
            $totalUrls = $sitemaps->sum('downloaded_urls');

            $indexed = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->where('indexing_status', 'PASS')
                ->count();

            $errorsCount = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->whereNotNull('errors_json')
                ->count();

            $missing = max(0, $totalUrls - $indexed);

            return response()->json([
                'total_urls_sitemap' => $totalUrls,
                'indexed' => $indexed,
                'errors' => $errorsCount,
                'missing_from_sitemap' => $missing,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Returns active alerts for the project.
     */
    public function alerts(int $projectId): JsonResponse
    {
        try {
            OrganicWebProject::findOrFail($projectId);

            $alerts = OrganicSitemapAlert::where('organic_web_project_id', $projectId)
                ->whereNull('resolved_at')
                ->orderByRaw("FIELD(severity, 'critical', 'warning', 'info')")
                ->orderByDesc('created_at')
                ->get()
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'type' => $a->type,
                    'severity' => $a->severity,
                    'message' => $a->message,
                ]);

            return response()->json(['alerts' => $alerts]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Fetches and returns the robots.txt of the project website.
     */
    public function robotsTxt(int $projectId): JsonResponse
    {
        try {
            $project = OrganicWebProject::findOrFail($projectId);

            $websiteUrl = rtrim($project->website_url, '/');
            $robotsUrl = $websiteUrl.'/robots.txt';

            $response = Http::timeout(10)->get($robotsUrl);

            if ($response->failed()) {
                return response()->json([
                    'content' => null,
                    'url' => $robotsUrl,
                    'fetched_at' => now()->toIso8601String(),
                    'error' => 'File robots.txt non raggiungibile (HTTP '.$response->status().')',
                ]);
            }

            return response()->json([
                'content' => $response->body(),
                'url' => $robotsUrl,
                'fetched_at' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'content' => null,
                'url' => null,
                'fetched_at' => now()->toIso8601String(),
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Generates dynamic alerts based on current project state.
     */
    private function generateAlerts(int $projectId, OrganicWebProject $project): void
    {
        $siteUrl = $project->googleIntegration?->gsc_property_url;

        OrganicSitemapAlert::where('organic_web_project_id', $projectId)
            ->whereNull('resolved_at')
            ->update(['resolved_at' => now()]);

        $sitemaps = OrganicGscSitemap::where('organic_web_project_id', $projectId)->get();

        if ($siteUrl && $sitemaps->isEmpty()) {
            OrganicSitemapAlert::create([
                'organic_web_project_id' => $projectId,
                'type' => 'no_sitemap',
                'severity' => 'critical',
                'message' => 'Nessuna sitemap trovata per questa proprietà GSC. Aggiungi almeno una sitemap.',
            ]);
        }

        $stale = $sitemaps->filter(function ($s) {
            return $s->last_submitted && $s->last_submitted->lt(now()->subDays(30));
        });

        if ($stale->count() > 0) {
            OrganicSitemapAlert::create([
                'organic_web_project_id' => $projectId,
                'type' => 'sitemap_stale',
                'severity' => 'warning',
                'message' => "La sitemap non viene aggiornata da più di 30 giorni ({$stale->count()} sitemap interessate).",
            ]);
        }

        $totalUrls = $sitemaps->sum('downloaded_urls');
        if ($totalUrls > 0) {
            $indexed = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->where('indexing_status', 'PASS')
                ->count();

            $errorUrls = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->whereNotNull('errors_json')
                ->count();

            if ($errorUrls > 0 && ($errorUrls / $totalUrls) > 0.20) {
                OrganicSitemapAlert::create([
                    'organic_web_project_id' => $projectId,
                    'type' => 'high_error_rate',
                    'severity' => 'critical',
                    'message' => "Alto tasso di errori di indicizzazione: {$errorUrls} URL su {$totalUrls} presentano problemi.",
                ]);
            }

            if ($indexed > 0 && ($indexed / $totalUrls) < 0.60) {
                $pct = round(($indexed / $totalUrls) * 100);
                OrganicSitemapAlert::create([
                    'organic_web_project_id' => $projectId,
                    'type' => 'low_coverage',
                    'severity' => 'warning',
                    'message' => "Copertura di indicizzazione bassa: solo il {$pct}% degli URL risulta indicizzato.",
                ]);
            }
        }
    }
}
