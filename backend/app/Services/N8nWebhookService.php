<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class N8nWebhookService
{
    public function isEnabled(): bool
    {
        if (!$this->isTruthy(config('services.n8n.enabled'))) {
            return false;
        }

        return $this->isValidWebhookBaseUrl(config('services.n8n.webhook_base_url'))
            && (string) config('services.n8n.calendar_call_webhook') !== '';
    }

    private function isTruthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
    }

    private function isValidWebhookBaseUrl(?string $url): bool
    {
        if (!$url || trim($url) === '') {
            return false;
        }

        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $placeholders = ['tua-istanza-n8n.com', 'example.com', 'example.org', 'localhost'];

        foreach ($placeholders as $placeholder) {
            if ($host === $placeholder || str_ends_with($host, '.' . $placeholder)) {
                return false;
            }
        }

        return true;
    }

    public function dispatchCalendarCallCreated(array $payload): void
    {
        if (!$this->isEnabled()) {
            return;
        }

        $url = rtrim((string) config('services.n8n.webhook_base_url'), '/')
            . '/' . ltrim((string) config('services.n8n.calendar_call_webhook'), '/');

        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $signature = hash_hmac('sha256', $body, (string) config('services.n8n.webhook_secret'));

        try {
            Http::timeout(15)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-Backclub-Signature' => $signature,
                ])
                ->withBody($body, 'application/json')
                ->post($url);
        } catch (\Throwable $e) {
            Log::warning('N8N calendar webhook failed', [
                'message' => $e->getMessage(),
                'call_id' => $payload['call_id'] ?? null,
            ]);
        }
    }

    public function verifySignature(string $payload, ?string $signature): bool
    {
        $secret = (string) config('services.n8n.webhook_secret');
        if ($secret === '' || !$signature) {
            return false;
        }

        $expected = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expected, $signature);
    }
}
