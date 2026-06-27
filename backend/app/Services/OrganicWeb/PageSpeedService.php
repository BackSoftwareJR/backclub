<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicPagespeedAudit;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PageSpeedService
{
    private string $apiKey;
    private string $apiUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    private string $groqApiKey;
    private string $groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    private string $groqModel = 'llama-3.3-70b-versatile';

    public function __construct()
    {
        $this->apiKey     = config('services.google_pagespeed.api_key', '');
        $this->groqApiKey = config('services.groq.api_key', '');
    }

    /**
     * Analisi base PSI (retrocompatibile con il vecchio metodo analyzeUrl).
     */
    public function analyzeUrl(int $projectId, string $url, string $device = 'mobile'): OrganicPagespeedAudit
    {
        return $this->analyzeUrlFull($projectId, $url, $device);
    }

    /**
     * Analisi completa PSI — estrae TUTTE le metriche, i punteggi e gli audit.
     */
    public function analyzeUrlFull(int $projectId, string $url, string $device = 'mobile'): OrganicPagespeedAudit
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('GOOGLE_PAGESPEED_API_KEY non configurata. Impostare la variabile d\'ambiente nel .env.');
        }

        try {
            $response = Http::timeout(90)->retry(2, 5000)->get($this->apiUrl, [
                'url'        => $url,
                'strategy'   => $device,
                'key'        => $this->apiKey,
                'categories' => ['performance', 'accessibility', 'best-practices', 'seo'],
            ]);

            if ($response->failed()) {
                Log::error('[PageSpeedService] API error', [
                    'status' => $response->status(),
                    'url'    => $url,
                    'device' => $device,
                    'body'   => $response->body(),
                ]);
                throw new \RuntimeException(
                    'Errore API PageSpeed Insights (' . $response->status() . '): ' . $response->body()
                );
            }

            $data   = $response->json();
            $audits = $data['lighthouseResult']['audits'] ?? [];
            $cats   = $data['lighthouseResult']['categories'] ?? [];

            // Punteggi categoria (0-100)
            $performanceScore  = $this->extractCategoryScore($cats, 'performance');
            $accessibilityScore = $this->extractCategoryScore($cats, 'accessibility');
            $bestPracticesScore = $this->extractCategoryScore($cats, 'best-practices');
            $seoScore          = $this->extractCategoryScore($cats, 'seo');

            // Core Web Vitals e metriche
            $lcp        = $this->extractNumericMs($audits, 'largest-contentful-paint', divisor: 1000);
            $cls        = $this->extractNumericRaw($audits, 'cumulative-layout-shift');
            $fid        = $this->extractNumericRaw($audits, 'max-potential-fid');
            $tbt        = $this->extractNumericRaw($audits, 'total-blocking-time');
            $fcp        = $this->extractNumericMs($audits, 'first-contentful-paint', divisor: 1000);
            $tti        = $this->extractNumericMs($audits, 'interactive', divisor: 1000);
            $speedIndex = $this->extractNumericMs($audits, 'speed-index', divisor: 1000);
            $ttfb       = $this->extractNumericMs($audits, 'server-response-time', divisor: 1000);

            // Suddivisione audit in 3 bucket
            [$opportunities, $diagnostics, $passed] = $this->bucketizeAudits($audits);

            $audit = OrganicPagespeedAudit::updateOrCreate(
                [
                    'organic_web_project_id' => $projectId,
                    'url'                    => $url,
                    'device'                 => $device,
                ],
                [
                    'performance_score'   => $performanceScore,
                    'accessibility_score' => $accessibilityScore,
                    'best_practices_score' => $bestPracticesScore,
                    'seo_score'           => $seoScore,
                    'lcp'                 => $lcp,
                    'cls'                 => $cls,
                    'fid'                 => $fid,
                    'tbt'                 => $tbt,
                    'fcp'                 => $fcp,
                    'tti'                 => $tti,
                    'speed_index'         => $speedIndex,
                    'ttfb'                => $ttfb,
                    'opportunities'       => $opportunities,
                    'audits_json'         => $opportunities,
                    'diagnostics_json'    => $diagnostics,
                    'passed_audits_json'  => $passed,
                    'status'              => 'completed',
                ]
            );

            return $audit;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[PageSpeedService] Eccezione', ['error' => $e->getMessage(), 'url' => $url]);

            if ($this->isTimeoutError($e)) {
                throw new \RuntimeException('PageSpeed API non ha risposto in tempo. Riprova tra qualche minuto.');
            }

            throw new \RuntimeException('Errore durante l\'analisi PageSpeed: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Genera suggerimenti AI raggruppati per area di criticità via Groq.
     */
    public function generateAiSuggestions(OrganicPagespeedAudit $audit): OrganicPagespeedAudit
    {
        if (empty($this->groqApiKey)) {
            throw new \RuntimeException('GROQ_API_KEY non configurata. Impostare la variabile d\'ambiente nel .env.');
        }

        $issuesList = $this->buildIssuesSummary($audit);

        $prompt = <<<PROMPT
Sei un esperto di Web Performance. Analizza questi risultati PageSpeed per {$audit->url} ({$audit->device}):

SCORE: Performance {$audit->performance_score}/100, LCP {$audit->lcp}s, CLS {$audit->cls}, TBT {$audit->tbt}ms

CRITICITÀ TROVATE:
{$issuesList}

Raggruppa le criticità in MAX 5 aree tematiche (es. 'Ottimizzazione Immagini', 'Riduzione JavaScript', ecc.).
Per ogni area fornisci:
1. Nome area
2. Impatto stimato sul punteggio (Alto/Medio/Basso)
3. Lista delle criticità incluse
4. Un prompt pronto per un agente sviluppatore che deve implementare il fix. Il prompt deve essere preciso, tecnico e azionabile, come se stesse dando istruzioni a un altro AI developer.

Rispondi SOLO con JSON valido:
{"suggestions": [{"area": "...", "impact": "Alto", "issues": [...], "developer_prompt": "..."}]}
PROMPT;

        try {
            $response = Http::timeout(60)
                ->withToken($this->groqApiKey)
                ->post($this->groqApiUrl, [
                    'model'       => $this->groqModel,
                    'messages'    => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => 0.4,
                    'max_tokens'  => 3000,
                ]);

            if ($response->failed()) {
                Log::error('[PageSpeedService] Groq AI error', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                throw new \RuntimeException(
                    'Errore API Groq (' . $response->status() . '): ' . $response->body()
                );
            }

            $rawContent = $response->json('choices.0.message.content') ?? '';
            $suggestions = $this->parseJsonFromContent($rawContent);

            $audit->update([
                'ai_suggestions_json'        => $suggestions,
                'ai_suggestions_generated_at' => now(),
            ]);

            return $audit->fresh();
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[PageSpeedService] Groq eccezione', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Errore durante la generazione dei suggerimenti AI: ' . $e->getMessage(), 0, $e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers privati
    // -------------------------------------------------------------------------

    private function extractCategoryScore(array $cats, string $key): ?int
    {
        if (!isset($cats[$key]['score'])) {
            return null;
        }

        return (int) round($cats[$key]['score'] * 100);
    }

    private function extractNumericMs(array $audits, string $key, int $divisor = 1): ?float
    {
        if (!isset($audits[$key]['numericValue'])) {
            return null;
        }

        return round($audits[$key]['numericValue'] / $divisor, 3);
    }

    private function extractNumericRaw(array $audits, string $key): ?float
    {
        if (!isset($audits[$key]['numericValue'])) {
            return null;
        }

        return $audits[$key]['numericValue'];
    }

    /**
     * Suddivide gli audit PSI in 3 bucket: opportunities, diagnostics, passed.
     *
     * @return array{0: array, 1: array, 2: array}
     */
    private function bucketizeAudits(array $audits): array
    {
        $opportunities = [];
        $diagnostics   = [];
        $passed        = [];

        foreach ($audits as $key => $audit) {
            $score       = $audit['score'] ?? null;
            $detailsType = $audit['details']['type'] ?? null;

            if (!isset($audit['title'])) {
                continue;
            }

            $entry = [
                'id'           => $key,
                'title'        => $audit['title'],
                'description'  => $audit['description'] ?? null,
                'score'        => $score,
                'displayValue' => $audit['displayValue'] ?? null,
            ];

            if ($score === null || $score >= 1.0) {
                $passed[] = $entry;
            } elseif ($score < 0.9 && $detailsType === 'opportunity') {
                $opportunities[] = $entry;
            } elseif ($score < 0.9 && in_array($detailsType, ['table', 'list', 'criticalrequestchain', 'filmstrip'], true)) {
                $diagnostics[] = $entry;
            } elseif ($score < 0.9) {
                $diagnostics[] = $entry;
            } else {
                $passed[] = $entry;
            }
        }

        return [$opportunities, $diagnostics, $passed];
    }

    private function buildIssuesSummary(OrganicPagespeedAudit $audit): string
    {
        $lines    = [];
        $audits   = array_merge(
            $audit->audits_json ?? [],
            $audit->diagnostics_json ?? []
        );

        foreach ($audits as $item) {
            $score = $item['score'] ?? null;
            $title = $item['title'] ?? '';
            $value = $item['displayValue'] ?? '';

            if ($score !== null && $score < 0.9 && $title) {
                $lines[] = sprintf('- [%.0f%%] %s%s', $score * 100, $title, $value ? " ($value)" : '');
            }
        }

        $summary = implode("\n", $lines);

        // Limita a 5000 caratteri
        if (strlen($summary) > 5000) {
            $summary = substr($summary, 0, 5000) . "\n[...troncato]";
        }

        return $summary ?: 'Nessuna criticità specifica rilevata.';
    }

    /**
     * Estrae JSON valido da un testo che potrebbe contenere markdown code blocks.
     */
    private function parseJsonFromContent(string $content): array
    {
        // Rimuovi markdown code blocks se presenti
        $cleaned = preg_replace('/```(?:json)?\s*([\s\S]*?)\s*```/', '$1', $content);
        $cleaned = trim($cleaned ?? $content);

        $decoded = json_decode($cleaned, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('[PageSpeedService] JSON parse fallito dalla risposta AI', ['content' => $content]);

            return ['raw' => $content, 'suggestions' => []];
        }

        return $decoded;
    }

    private function isTimeoutError(\Throwable $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, 'cURL error 28')
            || str_contains($message, 'Operation timed out')
            || str_contains($message, 'timed out');
    }
}
