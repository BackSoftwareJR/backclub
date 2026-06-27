<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicPagespeedVerification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CanopyWaveVerifierService
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
     * Analizza il repository GitHub del progetto e verifica l'implementazione
     * di un'ottimizzazione specifica tramite Canopy Wave (Kimi K2.6).
     *
     * @param int         $projectId             ID del progetto OrganicWebProject
     * @param string      $githubRepoUrl          URL pubblico del repository GitHub
     * @param string      $implementationContext  Descrizione della modifica implementata
     * @param int|null    $auditId                ID dell'audit PSI di riferimento (opzionale)
     * @param string|null $specificFiles          File specifici da analizzare (opzionale)
     */
    public function verifyImplementation(
        int $projectId,
        string $githubRepoUrl,
        string $implementationContext,
        ?int $auditId = null,
        ?string $specificFiles = null
    ): OrganicPagespeedVerification {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('CANOPY_WAVE_API_KEY non configurata.');
        }

        try {
            $repoInfo = $this->extractRepoInfo($githubRepoUrl);
        } catch (\InvalidArgumentException $e) {
            throw new \RuntimeException('URL GitHub non valido: ' . $e->getMessage());
        }

        $commits = $this->fetchRecentCommits($repoInfo['owner'], $repoInfo['repo']);

        $systemPrompt = <<<'PROMPT'
Sei un Senior Code Reviewer specializzato in Web Performance.
Analizza ESCLUSIVAMENTE l'implementazione specificata. Non divagare.
Rispondi sempre e solo con JSON valido, senza markdown code blocks.
PROMPT;

        $filesContext = $specificFiles ? "\nFile da analizzare prioritariamente: {$specificFiles}" : '';

        $userPrompt = <<<PROMPT
Implementazione da verificare: {$implementationContext}{$filesContext}

Commit recenti nel repository {$githubRepoUrl}:
{json_commits}

Verifica:
1. L'implementazione è stata completata correttamente?
2. Ci sono aspetti mancanti o migliorabili?
3. Il codice segue le best practice di performance?
4. Voto qualità implementazione: 1-10

Rispondi con JSON: {"completed": bool, "quality_score": int, "findings": [...], "missing": [...], "recommendations": [...]}
PROMPT;

        $userPrompt = str_replace(
            '{json_commits}',
            json_encode($commits, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            $userPrompt
        );

        try {
            $response = Http::timeout(120)
                ->withToken($this->apiKey)
                ->post($this->baseUrl . '/chat/completions', [
                    'model'       => $this->model,
                    'messages'    => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                    'temperature' => 0.2,
                    'max_tokens'  => 4096,
                    'thinking'    => ['type' => 'disabled'],
                ]);

            if ($response->failed()) {
                Log::error('[CanopyWaveVerifierService] API error', [
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

            $rawContent = $response->json('choices.0.message.content') ?? '';
            $result     = $this->parseJsonFromContent($rawContent);

            $qualityScore = isset($result['quality_score']) ? (int) $result['quality_score'] : null;
            $completed    = (bool) ($result['completed'] ?? false);

            $verification = OrganicPagespeedVerification::create([
                'organic_web_project_id' => $projectId,
                'audit_id'               => $auditId,
                'implementation_context' => $implementationContext,
                'github_repo_url'        => $githubRepoUrl,
                'verification_result'    => $result,
                'quality_score'          => $qualityScore,
                'completed'              => $completed,
            ]);

            return $verification;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[CanopyWaveVerifierService] Eccezione', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Errore durante la verifica implementazione: ' . $e->getMessage(), 0, $e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers privati
    // -------------------------------------------------------------------------

    /**
     * Estrae owner e repo dall'URL GitHub.
     *
     * @return array{owner: string, repo: string}
     */
    private function extractRepoInfo(string $githubUrl): array
    {
        $parsed = parse_url(trim($githubUrl));

        if (!$parsed || ($parsed['host'] ?? '') !== 'github.com') {
            throw new \InvalidArgumentException("L'URL deve essere un repository GitHub pubblico (es. https://github.com/user/repo).");
        }

        $path  = trim($parsed['path'] ?? '', '/');
        $parts = explode('/', $path);

        if (count($parts) < 2 || empty($parts[0]) || empty($parts[1])) {
            throw new \InvalidArgumentException("Impossibile estrarre owner/repo dall'URL: {$githubUrl}");
        }

        return [
            'owner' => $parts[0],
            'repo'  => rtrim($parts[1], '.git'),
        ];
    }

    /**
     * Recupera gli ultimi 5 commit con i file modificati da GitHub API (no auth, public repos).
     */
    private function fetchRecentCommits(string $owner, string $repo): array
    {
        try {
            $commitsResponse = Http::timeout(15)
                ->withHeaders(['Accept' => 'application/vnd.github.v3+json', 'User-Agent' => 'backclub-pagespeed-verifier'])
                ->get("https://api.github.com/repos/{$owner}/{$repo}/commits", [
                    'per_page' => 5,
                ]);

            if ($commitsResponse->failed()) {
                if ($commitsResponse->status() === 404) {
                    throw new \RuntimeException("Repository {$owner}/{$repo} non trovato o privato. Verifica che l'URL sia corretto e che il repository sia pubblico.");
                }

                if ($commitsResponse->status() === 403) {
                    throw new \RuntimeException("Rate limit GitHub raggiunto o repository privato. Riprova tra qualche minuto.");
                }

                throw new \RuntimeException("GitHub API error ({$commitsResponse->status()}): " . $commitsResponse->body());
            }

            $commits     = $commitsResponse->json() ?? [];
            $enriched    = [];

            foreach (array_slice($commits, 0, 5) as $commit) {
                $sha     = $commit['sha'] ?? null;
                $message = $commit['commit']['message'] ?? '';
                $author  = $commit['commit']['author']['name'] ?? '';
                $date    = $commit['commit']['author']['date'] ?? '';

                $files = [];
                if ($sha) {
                    $detailResponse = Http::timeout(10)
                        ->withHeaders(['Accept' => 'application/vnd.github.v3+json', 'User-Agent' => 'backclub-pagespeed-verifier'])
                        ->get("https://api.github.com/repos/{$owner}/{$repo}/commits/{$sha}");

                    if ($detailResponse->ok()) {
                        $commitDetail = $detailResponse->json();
                        foreach (($commitDetail['files'] ?? []) as $file) {
                            $files[] = [
                                'filename' => $file['filename'] ?? '',
                                'status'   => $file['status'] ?? '',
                                'additions' => $file['additions'] ?? 0,
                                'deletions' => $file['deletions'] ?? 0,
                                'patch'    => isset($file['patch']) ? substr($file['patch'], 0, 2000) : null,
                            ];
                        }
                    }
                }

                $enriched[] = [
                    'sha'     => $sha,
                    'message' => $message,
                    'author'  => $author,
                    'date'    => $date,
                    'files'   => $files,
                ];
            }

            return $enriched;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::warning('[CanopyWaveVerifierService] Impossibile recuperare commit GitHub', [
                'owner' => $owner,
                'repo'  => $repo,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Estrae JSON valido da un testo che potrebbe contenere markdown code blocks.
     */
    private function parseJsonFromContent(string $content): array
    {
        $cleaned = preg_replace('/```(?:json)?\s*([\s\S]*?)\s*```/', '$1', $content);
        $cleaned = trim($cleaned ?? $content);

        $decoded = json_decode($cleaned, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('[CanopyWaveVerifierService] JSON parse fallito dalla risposta AI', ['content' => $content]);

            return [
                'completed'       => false,
                'quality_score'   => null,
                'findings'        => [],
                'missing'         => [],
                'recommendations' => [],
                'raw_response'    => $content,
            ];
        }

        return $decoded;
    }
}
