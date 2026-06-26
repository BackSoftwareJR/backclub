<?php

namespace App\Services;

use App\Models\OrganicProjectGoogleIntegration;
use App\Models\UserGoogleIntegration;
use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class GoogleTokenService
{
    private const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

    public function __construct(
        private readonly string $clientId,
        private readonly string $clientSecret,
        private readonly string $redirectUri,
    ) {}

    public function createClient(): GoogleClient
    {
        $client = new GoogleClient;
        $client->setClientId($this->clientId);
        $client->setClientSecret($this->clientSecret);
        $client->setRedirectUri($this->redirectUri);
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->addScope(self::SEARCH_CONSOLE_SCOPE);

        return $client;
    }

    public function getAuthUrl(string $state = ''): string
    {
        $client = $this->createClient();

        if ($state !== '') {
            $client->setState($state);
        }

        return $client->createAuthUrl();
    }

    /**
     * @return array<string, mixed>
     *
     * @throws \RuntimeException
     */
    public function exchangeCode(string $code): array
    {
        try {
            $client = $this->createClient();
            $token = $client->fetchAccessTokenWithAuthCode($code);

            if (isset($token['error'])) {
                throw new \RuntimeException(
                    'Google token exchange error: '.($token['error_description'] ?? $token['error'])
                );
            }

            return $token;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Scambio codice Google fallito: '.$e->getMessage(), 0, $e);
        }
    }

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

    /**
     * @return array<string, mixed>
     *
     * @throws \RuntimeException
     */
    public function refreshAccessToken(UserGoogleIntegration $integration): array
    {
        $refreshToken = $integration->refresh_token;

        if (! $refreshToken) {
            throw new \RuntimeException("Refresh token Google mancante. Ricollega l'account.");
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token',
        ]);

        if (! $response->successful()) {
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

        if (! empty($data['refresh_token'])) {
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
        $client = new GoogleClient;
        $client->setClientId($this->clientId);
        $client->setClientSecret($this->clientSecret);
        $client->setAccessToken($this->getValidAccessToken($integration));

        return $client;
    }

    /**
     * Returns an authenticated Google Client for the given Organic Web project,
     * auto-refreshing the access token via the Google SDK if expired.
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \RuntimeException
     */
    public function getAuthenticatedClient(int $projectId): GoogleClient
    {
        $integration = OrganicProjectGoogleIntegration::where('organic_web_project_id', $projectId)->firstOrFail();

        $client = $this->createClient();

        $expiresIn = $integration->token_expires_at
            ? max(0, (int) now()->diffInSeconds($integration->token_expires_at, false))
            : 0;

        $client->setAccessToken([
            'access_token' => $integration->access_token,
            'refresh_token' => $integration->refresh_token,
            'token_type' => 'Bearer',
            'expires_in' => $expiresIn,
            'created' => time(),
        ]);

        if ($client->isAccessTokenExpired()) {
            $newToken = $client->fetchAccessTokenWithRefreshToken($integration->refresh_token);

            if (isset($newToken['error'])) {
                throw new \RuntimeException('Google token refresh failed: '.$newToken['error']);
            }

            $integration->access_token = $newToken['access_token'];
            $integration->token_expires_at = now()->addSeconds((int) ($newToken['expires_in'] ?? 3600));

            if (! empty($newToken['refresh_token'])) {
                $integration->refresh_token = $newToken['refresh_token'];
            }

            $integration->save();
        }

        return $client;
    }
}
