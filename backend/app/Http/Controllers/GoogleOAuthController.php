<?php

namespace App\Http\Controllers;

use App\Models\UserGoogleIntegration;
use App\Services\GoogleCalendarService;
use App\Services\GoogleTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GoogleOAuthController extends Controller
{
    public function __construct(
        private readonly GoogleTokenService $tokenService,
    ) {}

    // =========================================================
    // CALENDAR OAUTH (flusso server-side esistente)
    // =========================================================

    public function connect(Request $request): JsonResponse
    {
        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            return response()->json([
                'success' => false,
                'message' => "Integrazione Google non configurata. Contatta l'amministratore.",
            ], 503);
        }

        $state = Str::random(40);
        Cache::put("google_oauth_state:{$state}", Auth::id(), now()->addMinutes(10));

        $scopes = array_filter(explode(' ', (string) config('services.google.scopes')));

        $params = http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            'scope' => implode(' ', $scopes),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ]);

        return response()->json([
            'success' => true,
            'url' => 'https://accounts.google.com/o/oauth2/v2/auth?'.$params,
        ]);
    }

    /**
     * Callback reale di Google (browser redirect) — usato dal flusso Calendar.
     * Questo endpoint è pubblico: Google vi reindirizza dopo il consenso utente.
     */
    public function callback(Request $request)
    {
        $frontendRedirect = config('services.google.frontend_redirect', config('app.url').'/freelance/impostazioni');

        if ($request->has('error')) {
            return redirect($frontendRedirect.'?google=error&message='.urlencode((string) $request->get('error')));
        }

        $state = (string) $request->get('state');
        $userId = Cache::pull("google_oauth_state:{$state}");

        if (! $userId) {
            return redirect($frontendRedirect.'?google=error&message='.urlencode('Sessione OAuth scaduta'));
        }

        $code = (string) $request->get('code');
        if ($code === '') {
            return redirect($frontendRedirect.'?google=error&message='.urlencode('Codice OAuth mancante'));
        }

        try {
            $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => config('services.google.redirect'),
            ]);

            if (! $tokenResponse->successful()) {
                Log::error('Google token exchange failed', [
                    'user_id' => $userId,
                    'status' => $tokenResponse->status(),
                    'body' => $tokenResponse->body(),
                ]);
                throw new \RuntimeException('Scambio token fallito');
            }

            $tokenData = $tokenResponse->json();
            $accessToken = $tokenData['access_token'] ?? null;
            $refreshToken = $tokenData['refresh_token'] ?? null;
            $expiresIn = (int) ($tokenData['expires_in'] ?? 3600);

            if (! $accessToken) {
                throw new \RuntimeException('Access token mancante');
            }

            $userInfoResponse = Http::withToken($accessToken)
                ->get('https://www.googleapis.com/oauth2/v2/userinfo');

            if (! $userInfoResponse->successful()) {
                throw new \RuntimeException('Impossibile recuperare profilo Google');
            }

            $googleEmail = $userInfoResponse->json('email');
            if (! $googleEmail) {
                throw new \RuntimeException('Email Google non disponibile');
            }

            $existing = UserGoogleIntegration::where('user_id', $userId)->first();
            if (! $refreshToken && $existing?->refresh_token) {
                $refreshToken = $existing->refresh_token;
            }

            UserGoogleIntegration::updateOrCreate(
                ['user_id' => $userId],
                [
                    'google_email' => $googleEmail,
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_expires_at' => now()->addSeconds($expiresIn),
                    'scopes' => array_filter(explode(' ', (string) config('services.google.scopes'))),
                    'connected_at' => now(),
                ]
            );

            return redirect($frontendRedirect.'?google=connected');
        } catch (\Throwable $e) {
            Log::error('Google OAuth callback failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            return redirect($frontendRedirect.'?google=error&message='.urlencode('Collegamento Google fallito'));
        }
    }

    public function status(GoogleCalendarService $googleCalendar): JsonResponse
    {
        $integration = UserGoogleIntegration::where('user_id', Auth::id())->first();

        if (! $integration) {
            return response()->json([
                'success' => true,
                'data' => ['connected' => false],
            ]);
        }

        $calendars = [];
        try {
            $calendars = $googleCalendar->listCalendars($integration);
        } catch (\Throwable $e) {
            Log::warning('Unable to list Google calendars', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'connected' => true,
                'google_email' => $integration->google_email,
                'auto_sync_calls' => $integration->auto_sync_calls,
                'calendar_id' => $integration->calendar_id,
                'connected_at' => $integration->connected_at,
                'calendars' => $calendars,
            ],
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $integration = UserGoogleIntegration::where('user_id', Auth::id())->first();

        if (! $integration) {
            return response()->json([
                'success' => false,
                'message' => 'Account Google non collegato',
            ], 404);
        }

        $validated = $request->validate([
            'auto_sync_calls' => 'sometimes|boolean',
            'calendar_id' => 'sometimes|string|max:255',
        ]);

        $integration->update($validated);

        return response()->json([
            'success' => true,
            'data' => [
                'auto_sync_calls' => $integration->auto_sync_calls,
                'calendar_id' => $integration->calendar_id,
            ],
            'message' => 'Preferenze aggiornate',
        ]);
    }

    public function disconnect(): JsonResponse
    {
        UserGoogleIntegration::where('user_id', Auth::id())->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account Google scollegato',
        ]);
    }

    // =========================================================
    // SEARCH CONSOLE OAUTH (flusso SPA — credenziali GOOGLE_SEO_*)
    // =========================================================

    /**
     * Genera l'URL di autorizzazione Google Search Console.
     * Il frontend reindirizza l'utente a questo URL e cattura il `code` di ritorno.
     */
    public function redirect(Request $request): JsonResponse
    {
        if (! config('services.google_seo.client_id') || ! config('services.google_seo.client_secret')) {
            return response()->json([
                'success' => false,
                'message' => "Integrazione Google SEO non configurata. Contatta l'amministratore.",
            ], 503);
        }

        $state = Str::random(40);
        Cache::put("google_seo_oauth_state:{$state}", Auth::id(), now()->addMinutes(10));

        $url = $this->tokenService->getAuthUrl($state);

        return response()->json([
            'success' => true,
            'url' => $url,
        ]);
    }

    /**
     * Scambia il `code` ricevuto dal frontend con i token Google Search Console.
     * Endpoint SPA protetto da auth:sanctum — il frontend invia il codice via GET param.
     */
    public function searchConsoleCallback(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string']);

        $state = (string) $request->get('state', '');
        if ($state !== '') {
            $userId = Cache::pull("google_seo_oauth_state:{$state}");
            if (! $userId || $userId !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sessione OAuth non valida o scaduta.',
                ], 422);
            }
        }

        try {
            $tokenPayload = $this->tokenService->exchangeCode($request->string('code')->toString());
        } catch (\RuntimeException $e) {
            Log::error('Google SEO OAuth exchange failed', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Scambio codice Google fallito: '.$e->getMessage(),
            ], 422);
        }

        if (isset($tokenPayload['error'])) {
            return response()->json([
                'success' => false,
                'message' => $tokenPayload['error_description'] ?? $tokenPayload['error'],
            ], 422);
        }

        $existing = UserGoogleIntegration::where('user_id', Auth::id())->first();

        UserGoogleIntegration::updateOrCreate(
            ['user_id' => Auth::id()],
            [
                'access_token' => $tokenPayload['access_token'],
                'refresh_token' => $tokenPayload['refresh_token'] ?? $existing?->refresh_token,
                'token_expires_at' => isset($tokenPayload['expires_in'])
                    ? now()->addSeconds((int) $tokenPayload['expires_in'])
                    : null,
                'connected_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Account Google Search Console collegato con successo.',
        ]);
    }
}
