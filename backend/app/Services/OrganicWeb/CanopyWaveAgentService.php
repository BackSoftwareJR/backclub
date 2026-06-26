<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicAiAnalysis;
use App\Models\OrganicGscIndexingError;
use App\Models\OrganicGscPageQuery;
use App\Models\OrganicGscPerformanceDaily;
use App\Models\OrganicGscSitemap;
use App\Models\OrganicWebProject;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CanopyWaveAgentService
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

    public function generateDeepAudit(int $projectId): OrganicAiAnalysis
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
            'project'        => [
                'id'          => $project->id,
                'website_url' => $project->website_url,
                'language'    => $project->language,
            ],
            'performance_30d' => $performance,
            'sitemaps'         => $sitemaps,
            'indexing_errors'  => $indexingErrors,
            'top_page_queries' => $pageQueries,
        ];

        $systemPrompt = <<<'PROMPT'
Sei un Lead SEO Architect con 15 anni di esperienza. Ricevi dati reali di Google Search Console.
NON usare convenevoli, NON fare introduzioni generiche, NON essere vago.
Sii chirurgico, preciso, matematico. Usa dati numerici concreti.
OUTPUT RICHIESTO IN MARKDOWN:
## Diagnosi Critica
(Problemi esatti identificati, con numeri)
## Trend Matematici
(Analisi statistica delle performance: crescita/decrescita %, medie, outlier)
## Action Plan
(Minimo 5 step concreti e prioritizzati, con impatto atteso stimato)
## Quick Wins
(3 azioni immediate che possono essere fatte entro 48 ore)
PROMPT;

        try {
            $response = Http::timeout(120)
                ->withToken($this->apiKey)
                ->post($this->baseUrl . '/chat/completions', [
                    'model'      => $this->model,
                    'messages'   => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => 'Analizza questi dati GSC: ' . json_encode($contextPayload, JSON_UNESCAPED_UNICODE)],
                    ],
                    'temperature' => 0.3,
                    'max_tokens'  => 4096,
                    // Kimi K2.6: disabilita thinking mode per audit SEO più veloce
                    'thinking'    => ['type' => 'disabled'],
                ]);

            if ($response->failed()) {
                Log::error('[CanopyWaveAgentService] API error', [
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

            $actionPlan = $this->extractActionPlan($markdownText);

            return OrganicAiAnalysis::create([
                'organic_web_project_id' => $projectId,
                'analysis_type'          => 'full_audit',
                'model_used'             => $this->model,
                'raw_context_used'       => $contextPayload,
                'generated_markdown'     => $markdownText,
                'action_plan'            => $actionPlan,
            ]);
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[CanopyWaveAgentService] Eccezione', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Errore durante la generazione dell\'audit: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Estrae i bullet point dalla sezione "## Action Plan" del Markdown.
     *
     * @return string[]|null
     */
    private function extractActionPlan(string $markdown): ?array
    {
        if (empty($markdown)) {
            return null;
        }

        // Cerca la sezione Action Plan fino alla prossima sezione ##
        if (!preg_match('/##\s*Action Plan\s*\n(.*?)(?=\n##|\z)/si', $markdown, $matches)) {
            return null;
        }

        $sectionText = trim($matches[1]);
        $lines       = preg_split('/\r?\n/', $sectionText) ?: [];
        $steps       = [];

        foreach ($lines as $line) {
            $line = trim($line);
            // Prendi righe che iniziano con numero, trattino o asterisco
            if (preg_match('/^(?:\d+\.|[-*•])\s+(.+)/', $line, $m)) {
                $steps[] = trim($m[1]);
            }
        }

        return !empty($steps) ? $steps : null;
    }
}
