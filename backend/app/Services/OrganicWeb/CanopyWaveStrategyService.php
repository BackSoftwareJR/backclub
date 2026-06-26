<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicAiReport;
use App\Models\OrganicGscIndexingError;
use App\Models\OrganicGscPageQuery;
use App\Models\OrganicGscPerformanceDaily;
use App\Models\OrganicGscSitemap;
use App\Models\OrganicWebProject;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CanopyWaveStrategyService
{
    private string $apiKey;
    private string $baseUrl;
    private string $model;

    public function __construct()
    {
        $this->apiKey  = config('services.canopy_wave.api_key', '');
        $this->baseUrl = rtrim(config('services.canopy_wave.base_url', 'https://inference.canopywave.io/v1'), '/');
        $this->model   = config('services.canopy_wave.model', 'moonshotai/kimi-k2.6');
    }

    /**
     * Genera un report SEO strategico approfondito e lo persiste in organic_ai_reports.
     *
     * @param  string[]  $attachedTexts  Contenuto estratto da file caricati dall'utente (es. audit Markdown esterni)
     */
    public function generateReport(int $projectId, ?string $title = null, array $attachedTexts = []): OrganicAiReport
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('CANOPY_WAVE_API_KEY non configurata');
        }

        $project = OrganicWebProject::with('googleIntegration')->findOrFail($projectId);

        $performance = OrganicGscPerformanceDaily::where('organic_web_project_id', $projectId)
            ->where('date', '>=', now()->subDays(30)->toDateString())
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date'        => $r->date,
                'clicks'      => $r->clicks,
                'impressions' => $r->impressions,
                'ctr'         => $r->ctr,
                'position'    => $r->position,
            ])
            ->toArray();

        $sitemaps = OrganicGscSitemap::where('organic_web_project_id', $projectId)
            ->get()
            ->map(fn ($r) => [
                'path'            => $r->path,
                'status'          => $r->status,
                'downloaded_urls' => $r->downloaded_urls,
                'indexed_urls'    => $r->indexed_urls,
                'last_submitted'  => $r->last_submitted,
                'errors'          => $r->errors,
            ])
            ->toArray();

        $indexingErrors = OrganicGscIndexingError::where('organic_web_project_id', $projectId)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($r) => [
                'url'            => $r->url,
                'verdict'        => $r->verdict,
                'coverage_state' => $r->coverage_state,
                'last_scanned'   => $r->last_scanned_at,
            ])
            ->toArray();

        $pageQueries = OrganicGscPageQuery::where('organic_web_project_id', $projectId)
            ->orderBy('clicks', 'desc')
            ->limit(100)
            ->get()
            ->map(fn ($r) => [
                'page_url'    => $r->page_url,
                'query'       => $r->query,
                'clicks'      => $r->clicks,
                'impressions' => $r->impressions,
                'ctr'         => $r->ctr,
                'position'    => $r->position,
                'date'        => $r->date,
            ])
            ->toArray();

        $contextPayload = [
            'project' => [
                'id'          => $project->id,
                'website_url' => $project->website_url,
                'language'    => $project->language,
            ],
            'performance_30d'  => $performance,
            'sitemaps'         => $sitemaps,
            'indexing_errors'  => $indexingErrors,
            'top_page_queries' => $pageQueries,
        ];

        if (!empty($attachedTexts)) {
            $contextPayload['external_documents'] = $attachedTexts;
        }

        $systemPrompt = <<<'PROMPT'
Sei il Lead SEO Architect. Dati reali GSC forniti. Zero convenevoli.
Struttura obbligatoria:
## Executive Summary (3 righe max, numeri concreti)
## Problemi Critici (ranked per impatto)
## Trend (variazioni % settimanali/mensili)
## Action Plan (5+ step con priorità Alta/Media/Bassa)
## Quick Wins 48h
PROMPT;

        try {
            $response = Http::timeout(120)
                ->withToken($this->apiKey)
                ->post($this->baseUrl . '/chat/completions', [
                    'model'    => $this->model,
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => 'Analizza questi dati GSC: ' . json_encode($contextPayload, JSON_UNESCAPED_UNICODE)],
                    ],
                    'temperature' => 0.3,
                    'max_tokens'  => 4096,
                    'thinking'    => ['type' => 'disabled'],
                ]);

            if ($response->failed()) {
                Log::error('[CanopyWaveStrategyService] API error', [
                    'status'   => $response->status(),
                    'model'    => $this->model,
                    'base_url' => $this->baseUrl,
                    'body'     => $response->body(),
                ]);
                throw new \RuntimeException(
                    'Errore API Canopy Wave (' . $response->status() . '): '
                    . ($response->json('message') ?? $response->body())
                );
            }

            $markdownText = $response->json('choices.0.message.content') ?? '';

            return OrganicAiReport::create([
                'organic_web_project_id' => $projectId,
                'title'                  => $title ?? ('Report SEO — ' . now()->format('d/m/Y H:i')),
                'deep_analysis_markdown' => $markdownText,
                'model_used'             => $this->model,
            ]);
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[CanopyWaveStrategyService] Eccezione', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Errore durante la generazione del report: ' . $e->getMessage(), 0, $e);
        }
    }
}
