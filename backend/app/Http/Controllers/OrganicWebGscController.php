<?php

namespace App\Http\Controllers;

use App\Models\OrganicGscIndexingError;
use App\Models\OrganicGscPageQuery;
use App\Models\OrganicGscPerformanceDaily;
use App\Models\OrganicGscSitemap;
use App\Models\OrganicGscUrlDetail;
use App\Models\OrganicWebProject;
use App\Services\OrganicWeb\OrganicSeoAdvisorService;
use App\Services\OrganicWeb\SearchConsoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

final class OrganicWebGscController extends Controller
{
    public function __construct(
        private readonly SearchConsoleService $searchConsoleService,
        private readonly OrganicSeoAdvisorService $seoAdvisorService,
    ) {}

    /**
     * Retrieves stored GSC data for the given project.
     */
    public function getGscData(int $projectId): JsonResponse
    {
        $project = OrganicWebProject::findOrFail($projectId);

        $performance = OrganicGscPerformanceDaily::where('organic_web_project_id', $projectId)
            ->whereBetween('date', [now()->subDays(30), now()])
            ->orderBy('date')
            ->get();

        $sitemaps = OrganicGscSitemap::where('organic_web_project_id', $projectId)->get();

        $indexingErrors = OrganicGscIndexingError::where('organic_web_project_id', $projectId)
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'performance' => $performance,
            'sitemaps' => $sitemaps,
            'indexing_errors' => $indexingErrors,
        ]);
    }

    /**
     * Triggers a fresh sync of GSC data from Google APIs.
     */
    public function refreshGscData(int $projectId): JsonResponse
    {
        try {
            $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);
            $siteUrl = $project->googleIntegration?->gsc_property_url;

            if (! $siteUrl) {
                return response()->json([
                    'success' => false,
                    'message' => 'Proprietà GSC non selezionata. Seleziona una proprietà prima di sincronizzare i dati.',
                ], 422);
            }

            $performanceResult = $this->searchConsoleService->syncPerformance($projectId);
            $sitemapsResult = $this->searchConsoleService->syncSitemaps($projectId, $siteUrl);
            $urlsResult = $this->searchConsoleService->syncUrlListFromSitemaps($projectId);

            return response()->json([
                'success' => true,
                'message' => 'Dati GSC aggiornati',
                'synced' => [
                    'performance' => $performanceResult,
                    'sitemaps' => $sitemapsResult,
                    'urls' => $urlsResult,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore durante il refresh dei dati GSC',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Lists all GSC properties available for the connected account.
     */
    public function getGscProperties(int $projectId): JsonResponse
    {
        try {
            $result = $this->searchConsoleService->listSites($projectId);
            $sites = $result['sites'];

            $properties = array_map(function ($site) {
                return [
                    'url' => $site->getSiteUrl(),
                    'permission_level' => $site->getPermissionLevel(),
                ];
            }, $sites);

            return response()->json([
                'success' => true,
                'properties' => $properties,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nel recupero delle proprietà GSC',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Returns stored page+query GSC data for the given project.
     * Optionally filtered by ?page_url= query parameter.
     */
    public function getPageQueries(int $projectId, Request $request): JsonResponse
    {
        try {
            OrganicWebProject::findOrFail($projectId);

            $query = OrganicGscPageQuery::where('organic_web_project_id', $projectId);

            if ($request->filled('page_url')) {
                $query->where('page_url', $request->input('page_url'));
            }

            $perPage = min((int) $request->input('per_page', 50), 200);
            $results = $query->orderByDesc('impressions')->paginate($perPage);

            return response()->json([
                'data' => $results->items(),
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'per_page' => $results->perPage(),
                'total' => $results->total(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nel recupero dei page-queries',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Triggers a sync of page+query GSC data from Google APIs.
     */
    public function syncPageQueries(int $projectId): JsonResponse
    {
        try {
            $result = $this->searchConsoleService->syncPageQueries($projectId);

            return response()->json([
                'success' => true,
                'message' => 'Page-queries sincronizzate',
                'synced_rows' => $result['synced_rows'],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la sincronizzazione dei page-queries',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Analyzes a URL using GSC data and Groq AI to produce an SEO health report.
     * Body: { "url": "...", "date_range": 30 }
     */
    public function analyzeUrl(int $projectId, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'url' => 'required|string|url|max:2048',
                'date_range' => 'sometimes|integer|min:1|max:90',
            ]);

            OrganicWebProject::findOrFail($projectId);

            $url = $validated['url'];
            $dateRange = $validated['date_range'] ?? 30;

            $gscRows = OrganicGscPageQuery::where('organic_web_project_id', $projectId)
                ->where('page_url', $url)
                ->orderByDesc('date')
                ->limit(500)
                ->get()
                ->map(fn ($row) => [
                    'date' => $row->date?->toDateString(),
                    'query' => $row->query,
                    'clicks' => $row->clicks,
                    'impressions' => $row->impressions,
                    'ctr' => $row->ctr,
                    'position' => $row->position,
                ])
                ->toArray();

            $urlDetail = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->where('url', $url)
                ->first();

            $inspectionData = $urlDetail ? [
                'indexing_status' => $urlDetail->indexing_status,
                'last_crawled' => $urlDetail->last_crawled?->toIso8601String(),
                'canonical_url' => $urlDetail->canonical_url,
                'mobile_usability' => $urlDetail->mobile_usability,
                'coverage_state' => $urlDetail->coverage_state,
                'blocked_by_robots' => $urlDetail->blocked_by_robots,
                'errors' => $urlDetail->errors_json ?? [],
                'inspection_result' => $urlDetail->inspection_result,
            ] : [];

            $analysis = $this->seoAdvisorService->analyzePagePerformance($url, $gscRows, $inspectionData);

            return response()->json([
                'success' => true,
                'url' => $url,
                'gsc_rows_analyzed' => count($gscRows),
                'has_inspection_data' => ! empty($inspectionData),
                'health_score' => $analysis['health_score'],
                'main_problem' => $analysis['main_problem'],
                'actionable_advice' => $analysis['actionable_advice'],
            ]);
        } catch (\Throwable $e) {
            Log::error('SEO Advisor analyzeUrl error', [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Errore durante l\'analisi SEO',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Selects a GSC property for the project, purges stale cached data,
     * and immediately syncs fresh data for the new property.
     * This prevents data from different properties being mixed in the cache.
     */
    public function selectGscProperty(int $projectId): JsonResponse
    {
        try {
            $validated = request()->validate([
                'property_url' => 'required|string|max:512',
            ]);

            $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);

            if (! $project->googleIntegration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Account Google non connesso',
                ], 422);
            }

            $oldPropertyUrl = $project->googleIntegration->gsc_property_url;
            $newPropertyUrl = $validated['property_url'];

            $project->googleIntegration->update([
                'gsc_property_url' => $newPropertyUrl,
            ]);

            // If the property actually changed, purge all cached data for this project
            // to ensure no data from the previous property is mixed with the new one.
            // The frontend will auto-trigger a fresh sync after receiving this response.
            if ($oldPropertyUrl !== $newPropertyUrl) {
                OrganicGscPerformanceDaily::where('organic_web_project_id', $projectId)->delete();
                OrganicGscSitemap::where('organic_web_project_id', $projectId)->delete();
                OrganicGscIndexingError::where('organic_web_project_id', $projectId)->delete();
            }

            return response()->json([
                'success' => true,
                'message' => 'Proprietà GSC selezionata con successo',
                'property_url' => $newPropertyUrl,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore nella selezione della proprietà GSC',
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
