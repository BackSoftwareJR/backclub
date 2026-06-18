<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GitHubPublishService
{
    /**
     * @return array{owner: string, repo: string}|null
     */
    public function parseRepoFromUrl(string $githubUrl): ?array
    {
        if (!preg_match('#github\.com[:/]([^/]+)/([^/.]+)#i', trim($githubUrl), $matches)) {
            return null;
        }

        return [
            'owner' => $matches[1],
            'repo' => rtrim($matches[2], '.git'),
        ];
    }

    /**
     * Merge staging → main via GitHub Pull Request API.
     *
     * @return array{status: string, message: string, pull_request_number?: int, merge_sha?: string|null, html_url?: string}
     */
    public function publishStagingToMain(
        string $githubUrl,
        ?string $baseBranch = null,
        ?string $headBranch = null
    ): array {
        $token = config('services.github.token');
        if (empty($token)) {
            throw new RuntimeException('GITHUB_TOKEN non configurato sul server');
        }

        $repo = $this->parseRepoFromUrl($githubUrl);
        if (!$repo) {
            throw new RuntimeException('URL GitHub del progetto non valido');
        }

        $baseBranch = $baseBranch ?: config('services.github.publish_base_branch', 'main');
        $headBranch = $headBranch ?: config('services.github.publish_head_branch', 'staging');

        $owner = $repo['owner'];
        $repoName = $repo['repo'];
        $apiBase = "https://api.github.com/repos/{$owner}/{$repoName}";
        $headers = $this->headers($token);

        $headResponse = Http::withHeaders($headers)->get("{$apiBase}/branches/{$headBranch}");
        if ($headResponse->status() === 404) {
            throw new RuntimeException("Il branch '{$headBranch}' non esiste nel repository");
        }
        if (!$headResponse->successful()) {
            throw new RuntimeException('Errore nel verificare il branch staging: ' . $this->extractError($headResponse));
        }

        $baseResponse = Http::withHeaders($headers)->get("{$apiBase}/branches/{$baseBranch}");
        if ($baseResponse->status() === 404) {
            throw new RuntimeException("Il branch '{$baseBranch}' non esiste nel repository");
        }
        if (!$baseResponse->successful()) {
            throw new RuntimeException('Errore nel verificare il branch main: ' . $this->extractError($baseResponse));
        }

        $compareResponse = Http::withHeaders($headers)->get("{$apiBase}/compare/{$baseBranch}...{$headBranch}");
        if (!$compareResponse->successful()) {
            throw new RuntimeException('Errore nel confronto dei branch: ' . $this->extractError($compareResponse));
        }

        $compare = $compareResponse->json();
        $aheadBy = (int) ($compare['ahead_by'] ?? 0);
        $status = (string) ($compare['status'] ?? '');

        if ($status === 'identical' || $aheadBy === 0) {
            return [
                'status' => 'already_up_to_date',
                'message' => 'Main è già aggiornato con staging',
                'merge_sha' => $compare['merge_base_commit']['sha'] ?? null,
            ];
        }

        $prNumber = $this->findOpenPullRequest($apiBase, $headers, $owner, $headBranch, $baseBranch);

        if (!$prNumber) {
            $prResponse = Http::withHeaders($headers)->post("{$apiBase}/pulls", [
                'title' => "Pubblica: merge {$headBranch} → {$baseBranch}",
                'head' => $headBranch,
                'base' => $baseBranch,
                'body' => 'Pubblicazione automatica da WorkSpace BackClub',
            ]);

            if (!$prResponse->successful()) {
                $error = $this->extractError($prResponse);
                if ($this->isConflictError($error)) {
                    throw new RuntimeException('Conflitti di merge: risolvi i conflitti su GitHub prima di pubblicare');
                }
                throw new RuntimeException('Errore nella creazione della pull request: ' . $error);
            }

            $prNumber = (int) $prResponse->json('number');
        }

        $mergeResponse = Http::withHeaders($headers)->put("{$apiBase}/pulls/{$prNumber}/merge", [
            'merge_method' => 'merge',
            'commit_title' => "Merge {$headBranch} into {$baseBranch}",
        ]);

        if (!$mergeResponse->successful()) {
            $error = $this->extractError($mergeResponse);
            if ($mergeResponse->status() === 405 || $this->isConflictError($error)) {
                throw new RuntimeException('Conflitti di merge: risolvi i conflitti su GitHub prima di pubblicare');
            }
            throw new RuntimeException('Errore nel merge: ' . $error);
        }

        $mergeData = $mergeResponse->json();

        Log::info('GitHub publish completed', [
            'owner' => $owner,
            'repo' => $repoName,
            'pull_request' => $prNumber,
            'merge_sha' => $mergeData['sha'] ?? null,
        ]);

        return [
            'status' => 'merged',
            'message' => 'Pubblicato con successo su main',
            'pull_request_number' => $prNumber,
            'merge_sha' => $mergeData['sha'] ?? null,
            'html_url' => "https://github.com/{$owner}/{$repoName}/pull/{$prNumber}",
        ];
    }

    /**
     * @return array<string, string>
     */
    private function headers(string $token): array
    {
        return [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/vnd.github+json',
            'X-GitHub-Api-Version' => '2022-11-28',
        ];
    }

    /**
     * @param array<string, string> $headers
     */
    private function findOpenPullRequest(
        string $apiBase,
        array $headers,
        string $owner,
        string $headBranch,
        string $baseBranch
    ): ?int {
        $response = Http::withHeaders($headers)->get("{$apiBase}/pulls", [
            'state' => 'open',
            'head' => "{$owner}:{$headBranch}",
            'base' => $baseBranch,
        ]);

        if (!$response->successful()) {
            return null;
        }

        $prs = $response->json();
        if (!is_array($prs) || empty($prs)) {
            return null;
        }

        return isset($prs[0]['number']) ? (int) $prs[0]['number'] : null;
    }

    private function extractError(Response $response): string
    {
        $body = $response->json();
        if (is_array($body)) {
            if (!empty($body['message'])) {
                return (string) $body['message'];
            }
            if (!empty($body['errors']) && is_array($body['errors'])) {
                return collect($body['errors'])
                    ->map(fn ($e) => is_array($e) ? ($e['message'] ?? json_encode($e)) : (string) $e)
                    ->implode('; ');
            }
        }

        return "HTTP {$response->status()}";
    }

    private function isConflictError(string $error): bool
    {
        $lower = strtolower($error);
        return str_contains($lower, 'conflict') || str_contains($lower, 'conflitt');
    }
}
