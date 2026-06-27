<?php

namespace App\Http\Controllers;

use App\Models\OrganicGscUrlDetail;
use App\Models\OrganicInternalLink;
use App\Models\OrganicPagespeedAudit;
use App\Models\OrganicSemanticGap;
use App\Models\OrganicSgeReadiness;
use App\Services\OrganicWeb\LinkGraphService;
use App\Services\OrganicWeb\PageSpeedService;
use App\Services\OrganicWeb\SemanticAnalyzerService;
use App\Services\OrganicWeb\SgeReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OrganicSeoAnalysisController extends Controller
{
    public function __construct(
        private readonly PageSpeedService       $pageSpeedService,
        private readonly SemanticAnalyzerService $semanticAnalyzerService,
        private readonly SgeReadinessService    $sgeReadinessService,
        private readonly LinkGraphService       $linkGraphService,
    ) {}

    // POST /api/organic-web/projects/{id}/pagespeed/analyze
    public function analyzePageSpeed(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'url'    => 'required|url|max:2048',
            'device' => 'sometimes|in:mobile,desktop',
        ]);

        try {
            $audit = $this->pageSpeedService->analyzeUrl(
                $id,
                $validated['url'],
                $validated['device'] ?? 'mobile'
            );

            return response()->json(['audit' => $audit], 200);
        } catch (\Throwable $e) {
            Log::error('[OrganicSeoAnalysisController] analyzePageSpeed', ['error' => $e->getMessage(), 'project_id' => $id]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // GET /api/organic-web/projects/{id}/pagespeed
    public function getPageSpeedAudits(int $id): JsonResponse
    {
        $audits = OrganicPagespeedAudit::where('organic_web_project_id', $id)
            ->orderBy('performance_score', 'asc')
            ->get();

        return response()->json(['data' => $audits]);
    }

    // POST /api/organic-web/projects/{id}/semantic-gap
    public function findSemanticGap(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'url'     => 'required|url|max:2048',
            'keyword' => 'required|string|max:512',
        ]);

        try {
            $gap = $this->semanticAnalyzerService->findSemanticGap(
                $id,
                $validated['url'],
                $validated['keyword']
            );

            return response()->json(['data' => $gap], 200);
        } catch (\Throwable $e) {
            Log::error('[OrganicSeoAnalysisController] findSemanticGap', ['error' => $e->getMessage(), 'project_id' => $id]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // GET /api/organic-web/projects/{id}/semantic-gap
    public function listSemanticGaps(int $id): JsonResponse
    {
        $gaps = OrganicSemanticGap::where('organic_web_project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $gaps]);
    }

    // POST /api/organic-web/projects/{id}/sge/generate
    public function generateSgeSchema(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'url' => 'required|url|max:2048',
        ]);

        try {
            $result = $this->sgeReadinessService->generateSchemaMarkup($id, $validated['url']);

            return response()->json(['data' => $result], 200);
        } catch (\Throwable $e) {
            Log::error('[OrganicSeoAnalysisController] generateSgeSchema', ['error' => $e->getMessage(), 'project_id' => $id]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // GET /api/organic-web/projects/{id}/sge
    public function listSgeResults(int $id): JsonResponse
    {
        $results = OrganicSgeReadiness::where('organic_web_project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $results]);
    }

    // POST /api/organic-web/projects/{id}/links/extract
    public function extractLinks(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'url' => 'required|url|max:2048',
        ]);

        try {
            $count = $this->linkGraphService->extractLinksFromUrl($id, $validated['url']);

            return response()->json([
                'data' => [
                    'links_found' => $count,
                    'from_url'    => $validated['url'],
                ],
            ], 200);
        } catch (\Throwable $e) {
            Log::error('[OrganicSeoAnalysisController] extractLinks', ['error' => $e->getMessage(), 'project_id' => $id]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // POST /api/organic-web/projects/{id}/links/calculate-orphans
    public function calculateOrphans(int $id): JsonResponse
    {
        try {
            $result = $this->linkGraphService->calculateOrphans($id);

            return response()->json(['data' => $result], 200);
        } catch (\Throwable $e) {
            Log::error('[OrganicSeoAnalysisController] calculateOrphans', ['error' => $e->getMessage(), 'project_id' => $id]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // GET /api/organic-web/projects/{id}/links/orphans
    public function listOrphans(int $id): JsonResponse
    {
        $orphans = OrganicGscUrlDetail::where('organic_web_project_id', $id)
            ->where('is_orphan', true)
            ->orderBy('url')
            ->get(['id', 'url', 'indexing_status', 'coverage_state', 'is_orphan']);

        return response()->json(['data' => $orphans]);
    }
}
