<?php

namespace App\Services;

use App\Models\UserGoogleIntegration;
use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleTokenService
{
    public function getValidAccessToken(UserGoogleIntegration $integration): array
    {
        if ($integration->token_expires_at && $integration->token_expires_at->isFuture()) {
            return [
                'access_token' => $integration->access_token,
                'refresh_token' => $integration->refresh_token,
                'expires_in' => max(0, $integration->token_expires_at->diffInSeconds(now())),
            ];
        }

        return $this->refreshAccessToken($integration);
    }

    public function refreshAccessToken(UserGoogleIntegration $integration): array
    {
        $refreshToken = $integration->refresh_token;

        if (!$refreshToken) {
            throw new \RuntimeException('Refresh token Google mancante. Ricollega l\'account.');
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token',
        ]);

        if (!$response->successful()) {
            Log::error('Google token refresh failed', [
                'user_id' => $integration->user_id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException('Impossibile aggiornare il token Google.');
        }

        $data = $response->json();
        $integration->access_token = $data['access_token'];
        $integration->token_expires_at = now()->addSeconds((int) ($data['expires_in'] ?? 3600));
        if (!empty($data['refresh_token'])) {
            $integration->refresh_token = $data['refresh_token'];
        }
        $integration->save();

        return [
            'access_token' => $integration->access_token,
            'refresh_token' => $integration->refresh_token,
            'expires_in' => (int) ($data['expires_in'] ?? 3600),
        ];
    }

    public function buildGoogleClient(UserGoogleIntegration $integration): GoogleClient
    {
        $client = new GoogleClient();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setAccessToken($this->getValidAccessToken($integration));

        return $client;
    }
}
