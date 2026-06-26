<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicSgeReadiness;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SgeReadinessService
{
    private string $groqApiKey;
    private string $groqModel;
    private string $groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    public function __construct()
    {
        $this->groqApiKey = config('services.groq.api_key', '');
        $this->groqModel  = config('services.groq.model', 'llama-3.3-70b-versatile');
    }

    public function generateSchemaMarkup(int $projectId, string $url): OrganicSgeReadiness
    {
        try {
            $pageResponse = Http::timeout(10)->get($url);
            $html = $pageResponse->successful() ? $pageResponse->body() : '';

            preg_match_all(
                '/<script[^>]+type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/si',
                $html,
                $matches
            );

            $existingJsonLds = $matches[1] ?? [];
            $hasSchema       = count($existingJsonLds) > 0;

            $schemaTypes = [];
            foreach ($existingJsonLds as $jsonLdRaw) {
                $decoded = json_decode(trim($jsonLdRaw), true);
                if ($decoded && isset($decoded['@type'])) {
                    $types = is_array($decoded['@type']) ? $decoded['@type'] : [$decoded['@type']];
                    foreach ($types as $type) {
                        if (!in_array($type, $schemaTypes, true)) {
                            $schemaTypes[] = $type;
                        }
                    }
                }
            }

            $aiGeneratedJsonld = null;

            if (!$hasSchema || empty($schemaTypes)) {
                $aiGeneratedJsonld = $this->callGroqForSchema($url, $html);
            }

            return OrganicSgeReadiness::updateOrCreate(
                [
                    'organic_web_project_id' => $projectId,
                    'url'                    => $url,
                ],
                [
                    'has_schema'        => $hasSchema,
                    'schema_types'      => $schemaTypes,
                    'ai_generated_jsonld' => $aiGeneratedJsonld,
                ]
            );
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[SgeReadinessService] Eccezione', ['error' => $e->getMessage(), 'url' => $url]);
            throw new \RuntimeException('Errore durante la generazione dello schema SGE: ' . $e->getMessage(), 0, $e);
        }
    }

    private function callGroqForSchema(string $url, string $html): ?string
    {
        if (empty($this->groqApiKey)) {
            Log::warning('[SgeReadinessService] GROQ_API_KEY non configurata, skip generazione schema AI.');
            return null;
        }

        $bodyExcerpt = substr(strip_tags($html), 0, 2000);

        $prompt = <<<PROMPT
Sei un esperto di Schema Markup e SEO tecnico. Analizza questo URL: {$url}
e questo estratto HTML: {$bodyExcerpt}.
Genera il JSON-LD Schema Markup più appropriato (es. LocalBusiness, Article, FAQPage, BreadcrumbList).
Rispondi SOLO con il tag <script type='application/ld+json'>...</script> completo, senza spiegazioni.
PROMPT;

        try {
            $response = Http::timeout(30)
                ->withToken($this->groqApiKey)
                ->post($this->groqApiUrl, [
                    'model'       => $this->groqModel,
                    'messages'    => [
                        ['role' => 'system', 'content' => 'Sei un esperto di Schema Markup. Rispondi solo con il tag script JSON-LD richiesto.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => 0.2,
                    'max_tokens'  => 1024,
                ]);

            if ($response->failed()) {
                Log::error('[SgeReadinessService] Groq API error', [
                    'status' => $response->status(),
                    'url'    => $url,
                    'body'   => $response->body(),
                ]);
                return null;
            }

            return trim($response->json('choices.0.message.content') ?? '');
        } catch (\Throwable $e) {
            Log::error('[SgeReadinessService] Errore chiamata Groq', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
