<?php

namespace App\Services\OrganicWeb;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrganicCodeService
{
    private const CRAWL_TIMEOUT_S = 10;
    private const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

    /**
     * Crawla il sito e ritorna dati strutturati per SEO audit.
     *
     * @return array<array{url: string, status_code: int, title: string|null, meta_description: string|null, h1: string|null, h2s: array, canonical: string|null, is_indexable: bool, internal_links_count: int, images_without_alt: int, error: string|null}>
     */
    public function crawlSiteForAudit(string $websiteUrl, int $maxPages = 100): array
    {
        $websiteUrl = rtrim($websiteUrl, '/');
        $visited    = [];
        $queue      = [$websiteUrl];
        $results    = [];

        Log::info('[OrganicCodeService] Avvio crawl', ['url' => $websiteUrl, 'max_pages' => $maxPages]);

        while (!empty($queue) && count($results) < $maxPages) {
            $currentUrl = array_shift($queue);

            if (in_array($currentUrl, $visited, true)) {
                continue;
            }

            $visited[] = $currentUrl;

            $pageData = $this->fetchPage($currentUrl, $websiteUrl);
            $results[] = $pageData;

            if (!empty($pageData['internal_links'])) {
                foreach ($pageData['internal_links'] as $link) {
                    if (!in_array($link, $visited, true) && !in_array($link, $queue, true)) {
                        $queue[] = $link;
                    }
                }
            }
        }

        Log::info('[OrganicCodeService] Crawl completato', [
            'url'    => $websiteUrl,
            'pages'  => count($results),
        ]);

        return array_map(function (array $page): array {
            unset($page['internal_links']);
            return $page;
        }, $results);
    }

    /**
     * Genera sitemap.xml per il sito.
     */
    public function generateSitemap(string $websiteUrl, string $outputPath): bool
    {
        $websiteUrl = rtrim($websiteUrl, '/');

        try {
            $pages   = $this->crawlSiteForAudit($websiteUrl, 500);
            $indexable = array_filter($pages, fn(array $p) => $p['is_indexable'] && ($p['status_code'] ?? 0) === 200);

            $xml = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
            $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . PHP_EOL;

            foreach ($indexable as $page) {
                $url = htmlspecialchars($page['url'], ENT_XML1 | ENT_COMPAT, 'UTF-8');
                $xml .= "  <url>" . PHP_EOL;
                $xml .= "    <loc>{$url}</loc>" . PHP_EOL;
                $xml .= "    <changefreq>weekly</changefreq>" . PHP_EOL;
                $xml .= "    <priority>0.8</priority>" . PHP_EOL;
                $xml .= "  </url>" . PHP_EOL;
            }

            $xml .= '</urlset>';

            file_put_contents($outputPath, $xml);

            Log::info('[OrganicCodeService] Sitemap generata', [
                'url'    => $websiteUrl,
                'pages'  => count($indexable),
                'output' => $outputPath,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('[OrganicCodeService] Errore generazione sitemap', [
                'url'   => $websiteUrl,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Verifica e suggerisce robots.txt.
     *
     * @return array{current_content: string, issues: array, suggested_content: string}
     */
    public function checkRobotsTxt(string $websiteUrl): array
    {
        $websiteUrl  = rtrim($websiteUrl, '/');
        $robotsUrl   = $websiteUrl . '/robots.txt';
        $issues      = [];
        $current     = '';

        try {
            $response = Http::timeout(self::CRAWL_TIMEOUT_S)->get($robotsUrl);

            if ($response->failed() || $response->status() === 404) {
                $issues[] = [
                    'type'     => 'missing_robots',
                    'severity' => 'warning',
                    'message'  => 'Il file robots.txt non è presente o non è raggiungibile.',
                ];
            } else {
                $current = $response->body();

                if (preg_match('/Disallow:\s*\//i', $current)) {
                    $issues[] = [
                        'type'     => 'site_blocked',
                        'severity' => 'critical',
                        'message'  => 'Il sito intero è bloccato da "Disallow: /". Questo impedisce l\'indicizzazione.',
                    ];
                }

                if (!preg_match('/sitemap:/i', $current)) {
                    $issues[] = [
                        'type'     => 'missing_sitemap_directive',
                        'severity' => 'warning',
                        'message'  => 'Manca la direttiva Sitemap nel robots.txt.',
                    ];
                }

                if (!preg_match('/User-agent:\s*\*/i', $current)) {
                    $issues[] = [
                        'type'     => 'missing_user_agent_all',
                        'severity' => 'info',
                        'message'  => 'Manca la direttiva "User-agent: *". Consigliato aggiungerla.',
                    ];
                }
            }
        } catch (\Throwable $e) {
            $issues[] = [
                'type'     => 'fetch_error',
                'severity' => 'warning',
                'message'  => 'Impossibile recuperare robots.txt: ' . $e->getMessage(),
            ];
        }

        $suggested = <<<ROBOTS
User-agent: *
Disallow: /wp-admin/
Disallow: /wp-includes/
Disallow: /admin/
Disallow: /login/
Allow: /

Sitemap: {$websiteUrl}/sitemap.xml
ROBOTS;

        return [
            'current_content'   => $current,
            'issues'            => $issues,
            'suggested_content' => $suggested,
        ];
    }

    /**
     * Ping IndexNow per indicizzazione rapida.
     */
    public function pingIndexNow(string $url, string $host): bool
    {
        try {
            $key = config('services.indexnow.key', '');

            $payload = [
                'host'    => $host,
                'key'     => $key ?: 'organicweb-' . md5($host),
                'urlList' => [$url],
            ];

            $response = Http::timeout(10)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post(self::INDEXNOW_ENDPOINT, $payload);

            $success = in_array($response->status(), [200, 202], true);

            Log::info('[OrganicCodeService] IndexNow ping', [
                'url'     => $url,
                'status'  => $response->status(),
                'success' => $success,
            ]);

            return $success;
        } catch (\Throwable $e) {
            Log::error('[OrganicCodeService] Errore IndexNow ping', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Ping GSC per ri-crawl URL.
     * Usa GSC API se service account configurato, altrimenti skippa.
     */
    public function pingGoogleSearchConsole(string $url): bool
    {
        $serviceAccount = config('services.google.gsc_service_account_json', '');

        if (empty($serviceAccount)) {
            Log::info('[OrganicCodeService] GSC service account non configurato, skip.', ['url' => $url]);
            return false;
        }

        try {
            $token = $this->getGscAccessToken($serviceAccount);

            if (!$token) {
                return false;
            }

            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Content-Type'  => 'application/json',
                ])
                ->post('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', [
                    'inspectionUrl' => $url,
                    'siteUrl'       => parse_url($url, PHP_URL_SCHEME) . '://' . parse_url($url, PHP_URL_HOST) . '/',
                ]);

            $success = $response->successful();

            Log::info('[OrganicCodeService] GSC ping', [
                'url'     => $url,
                'status'  => $response->status(),
                'success' => $success,
            ]);

            return $success;
        } catch (\Throwable $e) {
            Log::error('[OrganicCodeService] Errore GSC ping', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Parse CSV di dati GSC.
     *
     * @return array<array{query: string, clicks: int, impressions: int, ctr: float, position: float}>
     */
    public function parseGscCsv(string $csvContent): array
    {
        $rows    = [];
        $lines   = preg_split('/\r?\n/', trim($csvContent));

        if (empty($lines)) {
            return [];
        }

        $header = str_getcsv(array_shift($lines));
        $header = array_map('strtolower', array_map('trim', $header));

        $colMap = [
            'query'       => $this->findColumnIndex($header, ['query', 'queries', 'keyword', 'top queries']),
            'clicks'      => $this->findColumnIndex($header, ['clicks', 'click']),
            'impressions' => $this->findColumnIndex($header, ['impressions', 'impression']),
            'ctr'         => $this->findColumnIndex($header, ['ctr', 'click through rate']),
            'position'    => $this->findColumnIndex($header, ['position', 'avg. position', 'average position']),
        ];

        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }

            $cols = str_getcsv($line);

            $row = [
                'query'       => $colMap['query'] !== null ? trim($cols[$colMap['query']] ?? '') : '',
                'clicks'      => $colMap['clicks'] !== null ? (int) ($cols[$colMap['clicks']] ?? 0) : 0,
                'impressions' => $colMap['impressions'] !== null ? (int) ($cols[$colMap['impressions']] ?? 0) : 0,
                'ctr'         => $colMap['ctr'] !== null ? (float) str_replace(['%', ','], ['', '.'], $cols[$colMap['ctr']] ?? '0') : 0.0,
                'position'    => $colMap['position'] !== null ? (float) str_replace(',', '.', $cols[$colMap['position']] ?? '0') : 0.0,
            ];

            if ($row['query'] !== '') {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    /**
     * Parse CSV di keyword tool (formato generico).
     * Supporta formati Ubersuggest, Ahrefs, SEMrush, GKP.
     *
     * @return array<array{keyword: string, volume: int, difficulty: int|null}>
     */
    public function parseKeywordCsv(string $csvContent): array
    {
        $rows  = [];
        $lines = preg_split('/\r?\n/', trim($csvContent));

        if (empty($lines)) {
            return [];
        }

        $header = str_getcsv(array_shift($lines));
        $header = array_map('strtolower', array_map('trim', $header));

        $kwIdx   = $this->findColumnIndex($header, ['keyword', 'query', 'keywords', 'search term', 'term']);
        $volIdx  = $this->findColumnIndex($header, ['volume', 'search volume', 'avg. monthly searches', 'monthly searches', 'vol']);
        $diffIdx = $this->findColumnIndex($header, ['difficulty', 'kd', 'keyword difficulty', 'seo difficulty', 'competition']);

        if ($kwIdx === null) {
            Log::warning('[OrganicCodeService] CSV keyword: colonna keyword non trovata.', ['header' => $header]);
            return [];
        }

        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }

            $cols    = str_getcsv($line);
            $keyword = trim($cols[$kwIdx] ?? '');

            if ($keyword === '') {
                continue;
            }

            $volumeRaw = $volIdx !== null ? $cols[$volIdx] ?? '' : '';
            $volume    = (int) preg_replace('/[^\d]/', '', $volumeRaw);

            $difficultyRaw = $diffIdx !== null ? $cols[$diffIdx] ?? null : null;
            $difficulty    = null;

            if ($difficultyRaw !== null && $difficultyRaw !== '') {
                $difficulty = (int) preg_replace('/[^\d]/', '', $difficultyRaw);
            }

            $rows[] = [
                'keyword'    => $keyword,
                'volume'     => $volume,
                'difficulty' => $difficulty,
            ];
        }

        return $rows;
    }

    // ─────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────

    private function fetchPage(string $url, string $baseUrl): array
    {
        $result = [
            'url'                  => $url,
            'status_code'          => 0,
            'title'                => null,
            'meta_description'     => null,
            'h1'                   => null,
            'h2s'                  => [],
            'canonical'            => null,
            'is_indexable'         => false,
            'internal_links_count' => 0,
            'images_without_alt'   => 0,
            'internal_links'       => [],
            'error'                => null,
        ];

        try {
            $response = Http::timeout(self::CRAWL_TIMEOUT_S)
                ->withHeaders(['User-Agent' => 'OrganicWebBot/1.0 (SEO Audit)'])
                ->get($url);

            $result['status_code'] = $response->status();

            if ($response->failed()) {
                return $result;
            }

            $html = $response->body();

            $result['title']            = $this->extractTag($html, 'title');
            $result['meta_description'] = $this->extractMeta($html, 'description');
            $result['h1']               = $this->extractFirstTag($html, 'h1');
            $result['h2s']              = $this->extractAllTags($html, 'h2');
            $result['canonical']        = $this->extractCanonical($html);
            $result['is_indexable']     = $this->isIndexable($html, $response->headers());
            $result['internal_links']   = $this->extractInternalLinks($html, $baseUrl, $url);
            $result['internal_links_count'] = count($result['internal_links']);
            $result['images_without_alt']   = $this->countImagesWithoutAlt($html);
        } catch (\Throwable $e) {
            $result['error'] = $e->getMessage();
        }

        return $result;
    }

    private function extractTag(string $html, string $tag): ?string
    {
        if (preg_match('/<' . $tag . '[^>]*>(.*?)<\/' . $tag . '>/si', $html, $m)) {
            return trim(strip_tags($m[1]));
        }
        return null;
    }

    private function extractFirstTag(string $html, string $tag): ?string
    {
        if (preg_match('/<' . $tag . '[^>]*>(.*?)<\/' . $tag . '>/si', $html, $m)) {
            return trim(strip_tags($m[1]));
        }
        return null;
    }

    private function extractAllTags(string $html, string $tag): array
    {
        $matches = [];
        preg_match_all('/<' . $tag . '[^>]*>(.*?)<\/' . $tag . '>/si', $html, $m);
        foreach ($m[1] ?? [] as $content) {
            $matches[] = trim(strip_tags($content));
        }
        return $matches;
    }

    private function extractMeta(string $html, string $name): ?string
    {
        if (preg_match('/<meta[^>]+name=["\']' . $name . '["\'][^>]+content=["\'](.*?)["\']/si', $html, $m)) {
            return trim($m[1]);
        }
        if (preg_match('/<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']' . $name . '["\'][^>]*>/si', $html, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    private function extractCanonical(string $html): ?string
    {
        if (preg_match('/<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']/si', $html, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    private function isIndexable(string $html, array $headers): bool
    {
        $xRobotsTag = $headers['x-robots-tag'][0] ?? $headers['X-Robots-Tag'][0] ?? '';
        if (preg_match('/noindex/i', $xRobotsTag)) {
            return false;
        }

        if (preg_match('/<meta[^>]+name=["\']robots["\'][^>]+content=["\'](.*?)["\']/si', $html, $m)) {
            if (preg_match('/noindex/i', $m[1])) {
                return false;
            }
        }

        return true;
    }

    private function extractInternalLinks(string $html, string $baseUrl, string $currentUrl): array
    {
        $links = [];
        preg_match_all('/<a[^>]+href=["\'](.*?)["\']/si', $html, $m);

        $parsedBase = parse_url($baseUrl);
        $baseHost   = $parsedBase['host'] ?? '';

        foreach ($m[1] ?? [] as $href) {
            $href = trim($href);

            if (empty($href) || str_starts_with($href, '#') || str_starts_with($href, 'mailto:') || str_starts_with($href, 'tel:') || str_starts_with($href, 'javascript:')) {
                continue;
            }

            if (str_starts_with($href, '/')) {
                $href = $baseUrl . $href;
            } elseif (!str_starts_with($href, 'http')) {
                $href = rtrim(dirname($currentUrl), '/') . '/' . $href;
            }

            $parsed = parse_url($href);
            if (($parsed['host'] ?? '') !== $baseHost) {
                continue;
            }

            $normalized = ($parsed['scheme'] ?? 'https') . '://' . $baseHost . ($parsed['path'] ?? '/');
            $normalized = rtrim($normalized, '/') ?: $baseUrl;

            if (!in_array($normalized, $links, true)) {
                $links[] = $normalized;
            }
        }

        return array_slice($links, 0, 50);
    }

    private function countImagesWithoutAlt(string $html): int
    {
        preg_match_all('/<img[^>]*>/si', $html, $imgs);
        $count = 0;

        foreach ($imgs[0] ?? [] as $img) {
            if (!preg_match('/\balt=["\'][^"\']*["\']/i', $img) && !preg_match('/\balt=["\']["\']/i', $img)) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * @param  string[] $header
     * @param  string[] $aliases
     */
    private function findColumnIndex(array $header, array $aliases): ?int
    {
        foreach ($aliases as $alias) {
            $idx = array_search($alias, $header, true);
            if ($idx !== false) {
                return (int) $idx;
            }
        }

        foreach ($aliases as $alias) {
            foreach ($header as $i => $col) {
                if (str_contains($col, $alias)) {
                    return $i;
                }
            }
        }

        return null;
    }

    private function getGscAccessToken(string $serviceAccountJson): ?string
    {
        try {
            $sa = json_decode($serviceAccountJson, true);

            if (!$sa || empty($sa['private_key']) || empty($sa['client_email'])) {
                return null;
            }

            $now = time();
            $header  = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
            $payload = base64_encode(json_encode([
                'iss'   => $sa['client_email'],
                'scope' => 'https://www.googleapis.com/auth/webmasters',
                'aud'   => 'https://oauth2.googleapis.com/token',
                'exp'   => $now + 3600,
                'iat'   => $now,
            ]));

            $sigInput = "{$header}.{$payload}";
            openssl_sign($sigInput, $signature, $sa['private_key'], 'SHA256');
            $jwt = $sigInput . '.' . base64_encode($signature);

            $response = Http::timeout(10)->asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]);

            return $response->json('access_token');
        } catch (\Throwable $e) {
            Log::error('[OrganicCodeService] Errore ottenimento token GSC', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
