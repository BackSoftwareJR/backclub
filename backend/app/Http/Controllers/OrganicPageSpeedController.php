<?php

namespace App\Http\Controllers;

use App\Models\OrganicPagespeedAudit;
use App\Models\OrganicPagespeedVerification;
use App\Models\OrganicWebProject;
use App\Services\OrganicWeb\CanopyWaveVerifierService;
use App\Services\OrganicWeb\PageSpeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OrganicPageSpeedController extends Controller
{
    public function __construct(
        private readonly PageSpeedService $pageSpeedService,
        private readonly CanopyWaveVerifierService $verifierService,
    ) {}

    /**
     * POST /api/organic-web/projects/{id}/pagespeed/analyze-full
     *
     * Analisi completa PSI per un singolo device + opzionalmente genera suggerimenti AI.
     */
    public function analyzeFull(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'url'                  => 'required|url|max:2048',
            'device'               => 'sometimes|in:mobile,desktop',
            'generate_suggestions' => 'sometimes|boolean',
        ]);

        $project = OrganicWebProject::findOrFail($id);

        try {
            $audit = $this->pageSpeedService->analyzeUrlFull(
                $project->id,
                $validated['url'],
                $validated['device'] ?? 'mobile'
            );

            if (!empty($validated['generate_suggestions'])) {
                $audit = $this->pageSpeedService->generateAiSuggestions($audit);
            }

            return response()->json(['audit' => $audit]);
        } catch (\RuntimeException $e) {
            Log::error('[OrganicPageSpeedController@analyzeFull]', ['error' => $e->getMessage(), 'project' => $id]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * POST /api/organic-web/projects/{id}/pagespeed/analyze-complete
     *
     * Analisi completa su entrambi i device (mobile + desktop) + genera sempre i suggerimenti AI.
     */
    public function analyzeComplete(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'url' => 'required|url|max:2048',
        ]);

        $project = OrganicWebProject::findOrFail($id);

        try {
            $mobileAudit = $this->pageSpeedService->analyzeUrlFull($project->id, $validated['url'], 'mobile');
            $mobileAudit = $this->pageSpeedService->generateAiSuggestions($mobileAudit);

            $desktopAudit = $this->pageSpeedService->analyzeUrlFull($project->id, $validated['url'], 'desktop');
            $desktopAudit = $this->pageSpeedService->generateAiSuggestions($desktopAudit);

            return response()->json([
                'mobile'  => $mobileAudit,
                'desktop' => $desktopAudit,
            ]);
        } catch (\RuntimeException $e) {
            Log::error('[OrganicPageSpeedController@analyzeComplete]', ['error' => $e->getMessage(), 'project' => $id]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * POST /api/organic-web/projects/{id}/pagespeed/{auditId}/generate-suggestions
     *
     * Genera / rigenera i suggerimenti AI per un audit esistente.
     */
    public function generateSuggestions(int $id, int $auditId): JsonResponse
    {
        $audit = OrganicPagespeedAudit::where('organic_web_project_id', $id)->findOrFail($auditId);

        try {
            $audit = $this->pageSpeedService->generateAiSuggestions($audit);

            return response()->json([
                'suggestions' => $audit->ai_suggestions_json ?? [],
            ]);
        } catch (\RuntimeException $e) {
            Log::error('[OrganicPageSpeedController@generateSuggestions]', ['error' => $e->getMessage(), 'audit' => $auditId]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /api/organic-web/projects/{id}/pagespeed
     *
     * Lista audit con paginazione, raggruppati per URL.
     */
    public function listAudits(int $id): JsonResponse
    {
        OrganicWebProject::findOrFail($id);

        $audits = OrganicPagespeedAudit::where('organic_web_project_id', $id)
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json(['audits' => $audits]);
    }

    /**
     * GET /api/organic-web/projects/{id}/pagespeed/{auditId}
     *
     * Dettaglio singolo audit con tutti i JSON.
     */
    public function getAudit(int $id, int $auditId): JsonResponse
    {
        $audit = OrganicPagespeedAudit::where('organic_web_project_id', $id)->findOrFail($auditId);

        return response()->json(['audit' => $audit]);
    }

    /**
     * POST /api/organic-web/projects/{id}/pagespeed/verify-implementation
     *
     * Verifica l'implementazione di un'ottimizzazione tramite Canopy Wave + GitHub API.
     */
    public function verifyImplementation(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'implementation_context' => 'required|string|max:5000',
            'audit_id'               => 'sometimes|integer|exists:mysql_marketing.organic_pagespeed_audits,id',
            'specific_files'         => 'sometimes|string|max:1000',
        ]);

        $project = OrganicWebProject::findOrFail($id);

        if (empty($project->github_repo_url)) {
            return response()->json([
                'success' => false,
                'message' => 'Nessun repository GitHub configurato per questo progetto. Aggiorna le impostazioni del progetto e salva il campo "github_repo_url" (es. https://github.com/user/repo).',
            ], 422);
        }

        try {
            $verification = $this->verifierService->verifyImplementation(
                projectId:             $project->id,
                githubRepoUrl:         $project->github_repo_url,
                implementationContext: $validated['implementation_context'],
                auditId:               $validated['audit_id'] ?? null,
                specificFiles:         $validated['specific_files'] ?? null,
            );

            return response()->json(['verification' => $verification]);
        } catch (\RuntimeException $e) {
            Log::error('[OrganicPageSpeedController@verifyImplementation]', ['error' => $e->getMessage(), 'project' => $id]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /api/organic-web/projects/{id}/pagespeed/verifications
     *
     * Lista le verifiche passate per il progetto.
     */
    public function listVerifications(int $id): JsonResponse
    {
        OrganicWebProject::findOrFail($id);

        $verifications = OrganicPagespeedVerification::where('organic_web_project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['verifications' => $verifications]);
    }
}
