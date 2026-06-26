<?php

namespace App\Http\Controllers;

use App\Models\OrganicGscIndexingError;
use App\Models\OrganicGscPerformanceDaily;
use App\Models\OrganicGscSitemap;
use App\Models\OrganicWebProject;
use App\Services\OrganicWeb\SearchConsoleService;
use Illuminate\Http\JsonResponse;

final class OrganicWebGscController extends Controller
{
    public function __construct(
        private readonly SearchConsoleService $searchConsoleService,
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

            return response()->json([
                'success' => true,
                'message' => 'Dati GSC aggiornati',
                'synced' => [
                    'performance' => $performanceResult,
                    'sitemaps' => $sitemapsResult,
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
     * Selects a GSC property for the project.
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

            $project->googleIntegration->update([
                'gsc_property_url' => $validated['property_url'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Proprietà GSC selezionata con successo',
                'property_url' => $validated['property_url'],
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
