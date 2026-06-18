<?php

namespace App\Services;

use App\Models\UserGoogleIntegration;
use Illuminate\Support\Facades\Http;
use App\Support\CalendarDateTime;

class GoogleCalendarService
{
    private const API_BASE = 'https://www.googleapis.com/calendar/v3';

    public function __construct(
        private GoogleTokenService $tokenService
    ) {}

    public function listCalendars(UserGoogleIntegration $integration): array
    {
        $response = $this->api($integration)
            ->get(self::API_BASE . '/users/me/calendarList', ['maxResults' => 50]);

        if (!$response->successful()) {
            throw new \RuntimeException('Impossibile recuperare i calendari Google.');
        }

        return collect($response->json('items', []))
            ->map(fn (array $item) => [
                'id' => $item['id'] ?? '',
                'summary' => $item['summary'] ?? '',
                'primary' => (bool) ($item['primary'] ?? false),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<int, object>  $participants
     * @return array{google_event_id: string, google_meet_link: ?string}
     */
    public function createCallEvent(UserGoogleIntegration $integration, object $call, array $participants = []): array
    {
        $calendarId = $this->calendarId($integration);
        $response = $this->api($integration)
            ->withQueryParameters(['conferenceDataVersion' => 1, 'sendUpdates' => 'all'])
            ->post(
                self::API_BASE . '/calendars/' . rawurlencode($calendarId) . '/events',
                $this->buildEventPayload($call, $participants)
            );

        if (!$response->successful()) {
            Log::error('Google Calendar create event failed', [
                'user_id' => $integration->user_id,
                'call_id' => $call->id ?? null,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException('Creazione evento Google Calendar fallita.');
        }

        $data = $response->json();

        return [
            'google_event_id' => (string) ($data['id'] ?? ''),
            'google_meet_link' => $this->extractMeetLink($data),
        ];
    }

    /**
     * @param  array<int, object>  $participants
     * @return array{google_event_id: string, google_meet_link: ?string}
     */
    public function updateCallEvent(UserGoogleIntegration $integration, object $call, array $participants = []): array
    {
        if (empty($call->google_event_id)) {
            return $this->createCallEvent($integration, $call, $participants);
        }

        $calendarId = $this->calendarId($integration);
        $response = $this->api($integration)
            ->withQueryParameters(['sendUpdates' => 'all'])
            ->put(
                self::API_BASE . '/calendars/' . rawurlencode($calendarId) . '/events/' . rawurlencode((string) $call->google_event_id),
                $this->buildEventPayload($call, $participants, includeConference: false)
            );

        if (!$response->successful()) {
            Log::error('Google Calendar update event failed', [
                'user_id' => $integration->user_id,
                'call_id' => $call->id ?? null,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException('Aggiornamento evento Google Calendar fallito.');
        }

        $data = $response->json();

        return [
            'google_event_id' => (string) ($data['id'] ?? $call->google_event_id),
            'google_meet_link' => $this->extractMeetLink($data) ?: ($call->google_meet_link ?? $call->call_link ?? null),
        ];
    }

    public function deleteCallEvent(UserGoogleIntegration $integration, string $googleEventId): void
    {
        $calendarId = $this->calendarId($integration);
        $response = $this->api($integration)
            ->withQueryParameters(['sendUpdates' => 'all'])
            ->delete(self::API_BASE . '/calendars/' . rawurlencode($calendarId) . '/events/' . rawurlencode($googleEventId));

        if (!$response->successful() && $response->status() !== 404) {
            throw new \RuntimeException('Eliminazione evento Google Calendar fallita.');
        }
    }

    private function api(UserGoogleIntegration $integration): \Illuminate\Http\Client\PendingRequest
    {
        if (!config('services.google.client_id') || !config('services.google.client_secret')) {
            throw new \RuntimeException('Credenziali Google non configurate.');
        }

        $token = $this->tokenService->getValidAccessToken($integration);

        return Http::withToken($token['access_token'])
            ->acceptJson()
            ->timeout(30);
    }

    private function calendarId(UserGoogleIntegration $integration): string
    {
        return $integration->calendar_id ?: 'primary';
    }

    /**
     * @param  array<int, object>  $participants
     */
    private function buildEventPayload(object $call, array $participants, bool $includeConference = true): array
    {
        $payload = [
            'summary' => $call->title,
            'description' => $call->call_notes ?? $call->description ?? '',
            'start' => CalendarDateTime::forGoogleCalendar($call->start_time),
            'end' => CalendarDateTime::forGoogleCalendar($call->end_time),
        ];

        $attendees = [];
        foreach ($participants as $participant) {
            $email = trim((string) ($participant->email ?? ''));
            if ($email === '') {
                continue;
            }
            $attendee = ['email' => $email];
            if (!empty($participant->name)) {
                $attendee['displayName'] = (string) $participant->name;
            }
            $attendees[] = $attendee;
        }
        if (!empty($attendees)) {
            $payload['attendees'] = $attendees;
        }

        if ($includeConference) {
            $payload['conferenceData'] = [
                'createRequest' => [
                    'requestId' => 'backclub-call-' . ($call->id ?? 'new') . '-' . time(),
                    'conferenceSolutionKey' => ['type' => 'hangoutsMeet'],
                ],
            ];
        }

        return $payload;
    }

    private function extractMeetLink(array $event): ?string
    {
        foreach ($event['conferenceData']['entryPoints'] ?? [] as $entryPoint) {
            if (($entryPoint['entryPointType'] ?? '') === 'video' && !empty($entryPoint['uri'])) {
                return $entryPoint['uri'];
            }
        }

        return $event['hangoutLink'] ?? null;
    }
}
