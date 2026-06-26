<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicSemanticGap;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SemanticAnalyzerService
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

    public function findSemanticGap(int $projectId, string $url, string $keyword): OrganicSemanticGap
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('CANOPY_WAVE_API_KEY non configurata.');
        }

        try {
            $pageResponse = Http::timeout(10)->get($url);

            $html = $pageResponse->successful() ? $pageResponse->body() : '';

            $text = $this->extractText($html);

            $prompt = <<<PROMPT
Agisci da SEO Semantico esperto. Per la keyword principale '{$keyword}',
analizza questo testo e identifica le entità semantiche, LSI keywords e concetti correlati
che MANCANO nel testo. Rispondi ESCLUSIVAMENTE con un JSON valido:
{"missing_entities": ["entità1", "entità2", ...],
"ai_suggested_paragraph": "Un paragrafo di 3-5 frasi che integra naturalmente le entità mancanti"}

Testo da analizzare:
{$text}
PROMPT;

            $response = Http::timeout(30)
                ->withToken($this->apiKey)
                ->post($this->baseUrl . '/chat/completions', [
                    'model'       => $this->model,
                    'messages'    => [
                        ['role' => 'system', 'content' => 'Sei un esperto SEO semantico. Rispondi sempre e solo con JSON valido, senza markdown e senza spiegazioni aggiuntive.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => 0.3,
                    'max_tokens'  => 2048,
                    'thinking'    => ['type' => 'disabled'],
                ]);

            if ($response->failed()) {
                Log::error('[SemanticAnalyzerService] API Canopy Wave error', [
                    'status' => $response->status(),
                    'url'    => $url,
                    'body'   => $response->body(),
                ]);
                throw new \RuntimeException(
                    'Errore API Canopy Wave (' . $response->status() . '): '
                    . ($response->json('message') ?? $response->body())
                );
            }

            $content = trim($response->json('choices.0.message.content') ?? '{}');

            $content = preg_replace('/^```(?:json)?\s*/i', '', $content);
            $content = preg_replace('/\s*```$/i', '', $content);

            $parsed = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('[SemanticAnalyzerService] JSON non valido dalla risposta', ['content' => $content]);
                $parsed = ['missing_entities' => [], 'ai_suggested_paragraph' => $content];
            }

            return OrganicSemanticGap::updateOrCreate(
                [
                    'organic_web_project_id' => $projectId,
                    'url'                    => $url,
                    'target_keyword'         => $keyword,
                ],
                [
                    'missing_entities'       => $parsed['missing_entities'] ?? [],
                    'ai_suggested_paragraph' => $parsed['ai_suggested_paragraph'] ?? null,
                ]
            );
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[SemanticAnalyzerService] Eccezione', ['error' => $e->getMessage(), 'url' => $url]);
            throw new \RuntimeException('Errore durante l\'analisi semantica: ' . $e->getMessage(), 0, $e);
        }
    }

    private function extractText(string $html): string
    {
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/si', '', $html);
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/si', '', $html);

        return trim(strip_tags($html));
    }
}
