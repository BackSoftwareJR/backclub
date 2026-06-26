<?php

namespace App\Services\OrganicWeb;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrganicSeoAdvisorService
{
    private string $apiKey;

    private string $model;

    private string $apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    private const TIMEOUT_S = 60;

    private const SYSTEM_PROMPT = 'Sei un SEO Specialist tecnico esperto. Analizza i dati GSC forniti (click, impressions, query di ricerca, posizione media) e i dati di ispezione URL. Rispondi ESCLUSIVAMENTE con un JSON valido senza markdown, nel formato: {"health_score": <numero 1-100>, "main_problem": "<stringa breve max 100 chars>", "actionable_advice": ["consiglio 1", "consiglio 2", "consiglio 3"]}. Se i dati GSC mostrano poche impressioni, suggerisci ottimizzazioni di content e keyword. Se la posizione è >10, suggerisci miglioramenti al title/meta. Se ci sono errori di indicizzazione, prioritizza quelli.';

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key', '');
        $this->model = config('services.groq.model', 'llama-3.3-70b-versatile');
    }

    /**
     * Analyzes page performance using GSC data and URL inspection results.
     *
     * @param  array<string, mixed>  $gscData
     * @param  array<string, mixed>  $inspectionData
     * @return array{health_score: int, main_problem: string, actionable_advice: list<string>}
     *
     * @throws \RuntimeException
     */
    public function analyzePagePerformance(string $url, array $gscData, array $inspectionData): array
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('Groq API key non configurata. Imposta GROQ_API_KEY nel .env.');
        }

        $userPrompt = $this->buildPrompt($url, $gscData, $inspectionData);

        try {
            $response = Http::withToken($this->apiKey)
                ->timeout(self::TIMEOUT_S)
                ->post($this->apiUrl, [
                    'model' => $this->model,
                    'messages' => [
                        ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                    'temperature' => 0.3,
                    'max_tokens' => 512,
                ]);

            if ($response->failed()) {
                throw new \RuntimeException('Errore Groq API: '.$response->body());
            }

            $content = $response->json('choices.0.message.content', '');

            return $this->parseResponse($content);
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('OrganicSeoAdvisorService error', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Errore SEO Advisor: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * @param  array<string, mixed>  $gscData
     * @param  array<string, mixed>  $inspectionData
     */
    private function buildPrompt(string $url, array $gscData, array $inspectionData): string
    {
        $totalClicks = array_sum(array_column($gscData, 'clicks'));
        $totalImpressions = array_sum(array_column($gscData, 'impressions'));
        $avgPosition = count($gscData) > 0
            ? round(array_sum(array_column($gscData, 'position')) / count($gscData), 1)
            : null;

        $topQueries = collect($gscData)
            ->sortByDesc('impressions')
            ->take(10)
            ->map(fn ($row) => sprintf(
                '  - "%s" → %d click, %d impressioni, pos %.1f',
                $row['query'] ?? '',
                $row['clicks'] ?? 0,
                $row['impressions'] ?? 0,
                $row['position'] ?? 0
            ))
            ->implode("\n");

        $indexingStatus = $inspectionData['indexing_status'] ?? 'N/A';
        $coverageState = $inspectionData['coverage_state'] ?? 'N/A';
        $mobileUsability = $inspectionData['mobile_usability'] ?? 'N/A';
        $lastCrawled = $inspectionData['last_crawled'] ?? 'N/A';
        $blockedByRobots = ! empty($inspectionData['blocked_by_robots']) ? 'SÌ' : 'NO';
        $inspectionErrors = ! empty($inspectionData['errors']) ? implode(', ', (array) $inspectionData['errors']) : 'Nessuno';

        return <<<PROMPT
URL analizzato: {$url}

DATI GSC (ultimi 30 giorni aggregati):
- Click totali: {$totalClicks}
- Impressioni totali: {$totalImpressions}
- Posizione media: {$avgPosition}
- Query principali (top 10 per impressioni):
{$topQueries}

DATI ISPEZIONE URL:
- Stato indicizzazione: {$indexingStatus}
- Coverage state: {$coverageState}
- Mobile usability: {$mobileUsability}
- Ultimo crawl: {$lastCrawled}
- Bloccato da robots.txt: {$blockedByRobots}
- Errori rilevati: {$inspectionErrors}

Analizza questi dati e fornisci il tuo assessment SEO in JSON.
PROMPT;
    }

    /**
     * @return array{health_score: int, main_problem: string, actionable_advice: list<string>}
     */
    private function parseResponse(string $content): array
    {
        $content = trim($content);

        // Strip markdown code fences if present
        $content = preg_replace('/^```(?:json)?\s*/i', '', $content) ?? $content;
        $content = preg_replace('/\s*```$/', '', $content) ?? $content;
        $content = trim($content);

        try {
            $decoded = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            Log::warning('SEO Advisor JSON parse failed', ['content' => $content, 'error' => $e->getMessage()]);
            throw new \RuntimeException('Risposta Groq non è JSON valido: '.$e->getMessage());
        }

        return [
            'health_score' => (int) ($decoded['health_score'] ?? 50),
            'main_problem' => (string) ($decoded['main_problem'] ?? 'Analisi non disponibile'),
            'actionable_advice' => array_values(array_filter((array) ($decoded['actionable_advice'] ?? []))),
        ];
    }
}
