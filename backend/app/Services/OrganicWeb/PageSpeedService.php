<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicPagespeedAudit;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PageSpeedService
{
    private string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.google_pagespeed.api_key', '');
    }

    public function analyzeUrl(int $projectId, string $url, string $device = 'mobile'): OrganicPagespeedAudit
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('GOOGLE_PAGESPEED_API_KEY non configurata. Impostare la variabile d\'ambiente nel .env.');
        }

        try {
            $response = Http::timeout(90)->retry(2, 5000)->get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', [
                'url'      => $url,
                'strategy' => $device,
                'key'      => $this->apiKey,
            ]);

            if ($response->failed()) {
                Log::error('[PageSpeedService] API error', [
                    'status'     => $response->status(),
                    'url'        => $url,
                    'device'     => $device,
                    'body'       => $response->body(),
                ]);
                throw new \RuntimeException(
                    'Errore API PageSpeed Insights (' . $response->status() . '): ' . $response->body()
                );
            }

            $data    = $response->json();
            $audits  = $data['lighthouseResult']['audits'] ?? [];
            $cats    = $data['lighthouseResult']['categories'] ?? [];

            $performanceScore = isset($cats['performance']['score'])
                ? (int) round($cats['performance']['score'] * 100)
                : null;

            $lcp = isset($audits['largest-contentful-paint']['numericValue'])
                ? round($audits['largest-contentful-paint']['numericValue'] / 1000, 3)
                : null;

            $cls = isset($audits['cumulative-layout-shift']['numericValue'])
                ? $audits['cumulative-layout-shift']['numericValue']
                : null;

            $fid = isset($audits['max-potential-fid']['numericValue'])
                ? $audits['max-potential-fid']['numericValue']
                : null;

            $opportunities = [];
            foreach ($audits as $key => $audit) {
                $score = $audit['score'] ?? null;
                if ($score !== null && $score < 0.9 && isset($audit['title'])) {
                    $opportunities[] = [
                        'id'          => $key,
                        'title'       => $audit['title'],
                        'description' => $audit['description'] ?? null,
                        'score'       => $score,
                        'displayValue' => $audit['displayValue'] ?? null,
                    ];
                }
            }

            return OrganicPagespeedAudit::updateOrCreate(
                [
                    'organic_web_project_id' => $projectId,
                    'url'                    => $url,
                    'device'                 => $device,
                ],
                [
                    'performance_score' => $performanceScore,
                    'lcp'               => $lcp,
                    'cls'               => $cls,
                    'fid'               => $fid,
                    'opportunities'     => $opportunities,
                ]
            );
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

    private function isTimeoutError(\Throwable $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, 'cURL error 28')
            || str_contains($message, 'Operation timed out')
            || str_contains($message, 'timed out');
    }
}
