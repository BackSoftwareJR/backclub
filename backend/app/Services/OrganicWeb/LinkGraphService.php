<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicGscUrlDetail;
use App\Models\OrganicInternalLink;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LinkGraphService
{
    public function calculateOrphans(int $projectId): array
    {
        try {
            $sitemapUrls = OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                ->pluck('url')
                ->toArray();

            $linkedUrls = OrganicInternalLink::where('organic_web_project_id', $projectId)
                ->distinct()
                ->pluck('to_url')
                ->toArray();

            $linkedSet  = array_flip($linkedUrls);
            $orphanUrls = [];

            foreach ($sitemapUrls as $url) {
                $isOrphan = !isset($linkedSet[$url]);

                OrganicGscUrlDetail::where('organic_web_project_id', $projectId)
                    ->where('url', $url)
                    ->update(['is_orphan' => $isOrphan]);

                if ($isOrphan) {
                    $orphanUrls[] = $url;
                }
            }

            return [
                'total'      => count($sitemapUrls),
                'orphans'    => count($orphanUrls),
                'orphan_urls' => $orphanUrls,
            ];
        } catch (\Throwable $e) {
            Log::error('[LinkGraphService] Errore calculateOrphans', [
                'error'      => $e->getMessage(),
                'project_id' => $projectId,
            ]);
            throw new \RuntimeException('Errore nel calcolo delle pagine orfane: ' . $e->getMessage(), 0, $e);
        }
    }

    public function extractLinksFromUrl(int $projectId, string $pageUrl): int
    {
        try {
            $response = Http::timeout(10)->get($pageUrl);

            if (!$response->successful()) {
                throw new \RuntimeException('Impossibile scaricare la pagina: HTTP ' . $response->status());
            }

            $html = $response->body();

            $parsedBase = parse_url($pageUrl);
            $baseDomain = ($parsedBase['scheme'] ?? 'https') . '://' . ($parsedBase['host'] ?? '');

            $dom = new \DOMDocument();
            libxml_use_internal_errors(true);
            $dom->loadHTML($html);
            libxml_clear_errors();

            $xpath = new \DOMXPath($dom);
            $anchors = $xpath->query('//a[@href]');

            $count = 0;
            $seen  = [];

            foreach ($anchors as $anchor) {
                /** @var \DOMElement $anchor */
                $href       = trim($anchor->getAttribute('href'));
                $anchorText = trim($anchor->textContent);

                if (empty($href) || str_starts_with($href, '#') || str_starts_with($href, 'mailto:') || str_starts_with($href, 'tel:')) {
                    continue;
                }

                $absoluteUrl = $this->resolveUrl($href, $baseDomain, $parsedBase['path'] ?? '/');

                if (!$absoluteUrl || !str_starts_with($absoluteUrl, $baseDomain)) {
                    continue;
                }

                $dedupeKey = $pageUrl . '|' . $absoluteUrl;
                if (isset($seen[$dedupeKey])) {
                    continue;
                }
                $seen[$dedupeKey] = true;

                OrganicInternalLink::updateOrCreate(
                    [
                        'organic_web_project_id' => $projectId,
                        'from_url'               => $pageUrl,
                        'to_url'                 => $absoluteUrl,
                    ],
                    [
                        'anchor_text' => mb_substr($anchorText, 0, 512) ?: null,
                    ]
                );

                $count++;
            }

            return $count;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[LinkGraphService] Errore extractLinksFromUrl', [
                'error' => $e->getMessage(),
                'url'   => $pageUrl,
            ]);
            throw new \RuntimeException('Errore nell\'estrazione dei link interni: ' . $e->getMessage(), 0, $e);
        }
    }

    private function resolveUrl(string $href, string $baseDomain, string $basePath): ?string
    {
        if (str_starts_with($href, 'http://') || str_starts_with($href, 'https://')) {
            return rtrim($href, '/') ?: null;
        }

        if (str_starts_with($href, '//')) {
            return 'https:' . $href;
        }

        if (str_starts_with($href, '/')) {
            return $baseDomain . $href;
        }

        $dir = rtrim(dirname($basePath), '/');
        return $baseDomain . $dir . '/' . $href;
    }
}
