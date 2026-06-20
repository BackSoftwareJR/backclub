<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Services\DocumentTextExtractorService;
use App\Services\TaskSeriesAnalysisService;
use App\Services\TaskSeriesCreationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class TaskSeriesController extends Controller
{
    public function __construct(
        private readonly DocumentTextExtractorService $extractor,
        private readonly TaskSeriesAnalysisService $analysisService,
        private readonly TaskSeriesCreationService $creationService
    ) {}

    /**
     * POST /api/crm-projects/{id}/tasks/series/analyze
     */
    public function analyze(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        if (!$this->canCreateTask($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai il permesso di creare task in questo progetto.',
            ], 403);
        }

        $request->validate([
            'document' => 'nullable|file|max:10240',
            'analysis_text' => 'nullable|string|max:50000',
            'ai_instructions' => 'nullable|string|max:2000',
            'series_title' => 'nullable|string|max:255',
        ]);

        $file = $request->file('document');
        $rawText = trim((string) $request->input('analysis_text', ''));
        $aiInstructions = trim((string) $request->input('ai_instructions', ''));
        $seriesTitleHint = trim((string) $request->input('series_title', ''));

        if (!$file && $rawText === '') {
            return response()->json([
                'success' => false,
                'message' => 'Carica un documento oppure scrivi il contenuto dell\'analisi.',
            ], 422);
        }

        try {
            if ($file) {
                $extracted = $this->extractor->extract($file);
                $text = $extracted['text'];
                $sourceType = 'file';
                $sourceLabel = $file->getClientOriginalName();

                // If both file and text are provided, treat text as supplementary instructions.
                if ($rawText !== '') {
                    $supplement = $this->extractor->sanitizeText($rawText);
                    if ($supplement !== '') {
                        $aiInstructions = $aiInstructions !== ''
                            ? $aiInstructions . "\n\n" . $supplement
                            : $supplement;
                    }
                }
            } else {
                $text = $this->extractor->sanitizeText($rawText);
                if ($text === '') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Il testo dell\'analisi è vuoto o non valido.',
                    ], 422);
                }
                $sourceType = 'text';
                $sourceLabel = 'Analisi da testo';
            }

            $result = $this->analysisService->analyze(
                $text,
                $sourceLabel,
                $project->name,
                $sourceType,
                $aiInstructions !== '' ? $aiInstructions : null,
                $seriesTitleHint !== '' ? $seriesTitleHint : null
            );

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 503);
        } catch (\Exception $e) {
            Log::error('TaskSeries analyze error', [
                'project_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Errore durante l\'analisi del documento.',
            ], 500);
        }
    }

    /**
     * POST /api/crm-projects/{id}/tasks/series
     */
    public function create(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        if (!$this->canCreateTask($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Non hai il permesso di creare task in questo progetto.',
            ], 403);
        }

        try {
            $result = $this->creationService->createSeries($project, $user, $request->all());

            $taskIds = array_map(fn ($t) => $t->id, $result['tasks']);

            return response()->json([
                'success' => true,
                'message' => "{$result['count']} task creati con successo.",
                'data' => [
                    'parent_task_id' => $result['parent_task']?->id,
                    'task_ids' => $taskIds,
                    'count' => $result['count'],
                ],
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('TaskSeries create error', [
                'project_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione della serie: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function canCreateTask($user, CrmProject $project): bool
    {
        if (!$user) {
            return false;
        }

        return $user->role === 'admin' || (int) $project->manager_id === (int) $user->id;
    }
}
