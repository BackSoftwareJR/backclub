<?php

namespace App\Http\Controllers;

use App\Models\OrganicAiAnalysis;
use App\Models\OrganicAiReport;
use App\Services\OrganicWeb\CanopyWaveAgentService;
use App\Services\OrganicWeb\CanopyWaveStrategyService;
use App\Services\OrganicWeb\GroqAssistantService;
use App\Services\OrganicWeb\GroqChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganicAiController extends Controller
{
    public function __construct(
        private readonly CanopyWaveStrategyService $strategyService,
        private readonly GroqAssistantService $assistantService,
    ) {}

    // -------------------------------------------------------------------------
    // Step 10.4 — Audit legacy (CanopyWaveAgentService / GroqChatService)
    // -------------------------------------------------------------------------

    public function generateAudit(int $id): JsonResponse
    {
        try {
            $service  = new CanopyWaveAgentService();
            $analysis = $service->generateDeepAudit($id);

            return response()->json([
                'success' => true,
                'audit'   => [
                    'id'                 => $analysis->id,
                    'analysis_type'      => $analysis->analysis_type,
                    'model_used'         => $analysis->model_used,
                    'generated_markdown' => $analysis->generated_markdown,
                    'action_plan'        => $analysis->action_plan,
                    'created_at'         => $analysis->created_at?->toIso8601String(),
                ],
            ]);
        } catch (\RuntimeException $e) {
            $isApiKeyMissing = str_contains($e->getMessage(), 'non configurata');

            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], $isApiKeyMissing ? 422 : 500);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Errore interno durante la generazione dell\'audit.',
            ], 500);
        }
    }

    public function chat(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'audit_id'          => ['required', 'integer'],
            'message'           => ['required', 'string', 'max:2000'],
            'history'           => ['sometimes', 'array'],
            'history.*.role'    => ['required', 'string', 'in:user,assistant'],
            'history.*.content' => ['required', 'string'],
        ]);

        try {
            $service = new GroqChatService();
            $reply   = $service->chatWithAuditContext(
                (int) $validated['audit_id'],
                $validated['history'] ?? [],
                $validated['message']
            );

            return response()->json([
                'success' => true,
                'reply'   => $reply,
            ]);
        } catch (\RuntimeException $e) {
            $isApiKeyMissing = str_contains($e->getMessage(), 'non configurata');

            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], $isApiKeyMissing ? 422 : 500);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Errore interno durante la chat.',
            ], 500);
        }
    }

    public function latestAudit(int $id): JsonResponse
    {
        $analysis = OrganicAiAnalysis::where('organic_web_project_id', $id)
            ->latest()
            ->first();

        if (!$analysis) {
            return response()->json(['audit' => null]);
        }

        return response()->json([
            'audit' => [
                'id'                     => $analysis->id,
                'organic_web_project_id' => $analysis->organic_web_project_id,
                'analysis_type'          => $analysis->analysis_type,
                'model_used'             => $analysis->model_used,
                'generated_markdown'     => $analysis->generated_markdown,
                'action_plan'            => $analysis->action_plan,
                'created_at'             => $analysis->created_at?->toIso8601String(),
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Fase 2 — Reports (CanopyWaveStrategyService) + Chat sessioni (GroqAssistantService)
    // -------------------------------------------------------------------------

    /**
     * POST /api/organic-web/projects/{id}/ai/reports
     * Body: { title?: string, attached_texts?: string[] }
     */
    public function generateReport(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'title'            => ['sometimes', 'nullable', 'string', 'max:255'],
            'attached_texts'   => ['sometimes', 'array'],
            'attached_texts.*' => ['string'],
        ]);

        try {
            $report = $this->strategyService->generateReport(
                projectId:     $id,
                title:         $validated['title'] ?? null,
                attachedTexts: $validated['attached_texts'] ?? [],
            );

            return response()->json([
                'success' => true,
                'report'  => [
                    'id'                     => $report->id,
                    'organic_web_project_id' => $report->organic_web_project_id,
                    'title'                  => $report->title,
                    'model_used'             => $report->model_used,
                    'deep_analysis_markdown' => $report->deep_analysis_markdown,
                    'created_at'             => $report->created_at?->toIso8601String(),
                ],
            ]);
        } catch (\RuntimeException $e) {
            $isApiKeyMissing = str_contains($e->getMessage(), 'non configurata');

            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], $isApiKeyMissing ? 422 : 500);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Errore interno durante la generazione del report.',
            ], 500);
        }
    }

    /**
     * GET /api/organic-web/projects/{id}/ai/reports
     */
    public function listReports(int $id): JsonResponse
    {
        $reports = OrganicAiReport::where('organic_web_project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id'                     => $r->id,
                'organic_web_project_id' => $r->organic_web_project_id,
                'title'                  => $r->title,
                'model_used'             => $r->model_used,
                'created_at'             => $r->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'reports' => $reports,
        ]);
    }

    /**
     * POST /api/organic-web/projects/{id}/ai/sessions/{sessionId}/chat
     * Body: { message: string }
     */
    public function sessionChat(Request $request, int $id, int $sessionId): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
        ]);

        try {
            $reply = $this->assistantService->sendMessage($sessionId, $validated['message']);

            // Recupera l'id dell'ultimo messaggio assistente salvato nella sessione
            $lastMessage = \App\Models\OrganicAiChatMessage::where('session_id', $sessionId)
                ->where('role', 'assistant')
                ->latest()
                ->first();

            return response()->json([
                'success'    => true,
                'reply'      => $reply,
                'message_id' => $lastMessage?->id,
            ]);
        } catch (\RuntimeException $e) {
            $isApiKeyMissing = str_contains($e->getMessage(), 'non configurata');

            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], $isApiKeyMissing ? 422 : 500);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Errore interno durante la chat.',
            ], 500);
        }
    }
}
