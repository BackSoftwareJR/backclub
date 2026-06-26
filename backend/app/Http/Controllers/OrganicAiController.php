<?php

namespace App\Http\Controllers;

use App\Models\OrganicAiAnalysis;
use App\Services\OrganicWeb\CanopyWaveAgentService;
use App\Services\OrganicWeb\GroqChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganicAiController extends Controller
{
    public function generateAudit(int $id): JsonResponse
    {
        try {
            $service  = new CanopyWaveAgentService();
            $analysis = $service->generateDeepAudit($id);

            return response()->json([
                'success' => true,
                'audit'   => [
                    'id'                     => $analysis->id,
                    'analysis_type'          => $analysis->analysis_type,
                    'model_used'             => $analysis->model_used,
                    'generated_markdown'     => $analysis->generated_markdown,
                    'action_plan'            => $analysis->action_plan,
                    'created_at'             => $analysis->created_at?->toIso8601String(),
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
            'audit_id' => ['required', 'integer'],
            'message'  => ['required', 'string', 'max:2000'],
            'history'  => ['sometimes', 'array'],
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
}
