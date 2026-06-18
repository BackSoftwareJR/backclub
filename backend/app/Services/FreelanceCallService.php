<?php

namespace App\Services;

use App\Jobs\SyncCallToGoogleJob;
use App\Mail\CallInvitationMail;
use App\Models\User;
use App\Models\UserGoogleIntegration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class FreelanceCallService
{
    public function __construct(
        private GoogleCalendarService $googleCalendar,
        private N8nWebhookService $n8n
    ) {}

    public function saveParticipants(int $callId, array $participants): void
    {
        DB::table('freelance_calendar_call_participants')
            ->where('call_id', $callId)
            ->delete();

        foreach ($participants as $participant) {
            $email = trim((string) ($participant['email'] ?? ''));
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            DB::table('freelance_calendar_call_participants')->insert([
                'call_id' => $callId,
                'email' => strtolower($email),
                'name' => isset($participant['name']) ? trim((string) $participant['name']) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function getParticipants(int $callId): array
    {
        return DB::table('freelance_calendar_call_participants')
            ->where('call_id', $callId)
            ->orderBy('id')
            ->get()
            ->map(fn ($row) => [
                'email' => $row->email,
                'name' => $row->name,
            ])
            ->values()
            ->all();
    }

    public function afterCallCreated(int $callId, int $userId): void
    {
        $this->syncToGoogle($callId, $userId, 'create');

        $call = DB::table('freelance_calendar_events')->where('id', $callId)->first();
        if (!$call) {
            return;
        }

        $participants = $this->getParticipants($callId);

        if ($this->n8n->isEnabled()) {
            $this->n8n->dispatchCalendarCallCreated([
                'event' => 'calendar.call.created',
                'user_id' => $userId,
                'call_id' => $callId,
                'title' => $call->title,
                'description' => $call->description,
                'start_time' => $call->start_time,
                'end_time' => $call->end_time,
                'call_notes' => $call->call_notes,
                'google_meet_link' => $call->google_meet_link,
                'participants' => $participants,
                'callback_url' => url('/api/internal/n8n/calendar-call-result'),
            ]);
        }

        if ($call->sync_status === 'failed') {
            return;
        }

        $this->sendInvitationEmails($callId, $userId);
    }

    public function afterCallUpdated(int $callId, int $userId): void
    {
        SyncCallToGoogleJob::dispatch($callId, $userId, 'update');
    }

    public function afterCallDeleted(int $userId, ?string $googleEventId): void
    {
        if (!$googleEventId) {
            return;
        }

        $integration = UserGoogleIntegration::where('user_id', $userId)->first();
        if (!$integration) {
            return;
        }

        try {
            $this->googleCalendar->deleteCallEvent($integration, $googleEventId);
        } catch (\Throwable) {
            // Best effort delete on Google side
        }
    }

    public function syncToGoogle(int $callId, int $userId, string $action = 'create'): void
    {
        if (!config('services.google.sync_enabled')) {
            DB::table('freelance_calendar_events')
                ->where('id', $callId)
                ->update(['sync_status' => 'skipped', 'updated_at' => now()]);
            return;
        }

        $call = DB::table('freelance_calendar_events')
            ->where('id', $callId)
            ->where('user_id', $userId)
            ->where('type', 'call')
            ->whereNull('deleted_at')
            ->first();

        if (!$call) {
            return;
        }

        $integration = UserGoogleIntegration::where('user_id', $userId)->first();
        if (!$integration || !$integration->auto_sync_calls) {
            DB::table('freelance_calendar_events')
                ->where('id', $callId)
                ->update(['sync_status' => 'skipped', 'updated_at' => now()]);
            return;
        }

        $participants = DB::table('freelance_calendar_call_participants')
            ->where('call_id', $callId)
            ->get()
            ->all();

        try {
            $result = match ($action) {
                'update' => $this->googleCalendar->updateCallEvent($integration, $call, $participants),
                default => $this->googleCalendar->createCallEvent($integration, $call, $participants),
            };

            $callLink = $result['google_meet_link'] ?? $call->call_link;

            DB::table('freelance_calendar_events')
                ->where('id', $callId)
                ->update([
                    'google_event_id' => $result['google_event_id'],
                    'google_meet_link' => $result['google_meet_link'],
                    'call_link' => $callLink ?: $call->call_link,
                    'sync_status' => 'synced',
                    'sync_error' => null,
                    'updated_at' => now(),
                ]);

            if ($this->n8n->isEnabled()) {
                $this->n8n->dispatchCalendarCallCreated([
                    'event' => 'calendar.call.synced',
                    'user_id' => $userId,
                    'call_id' => $callId,
                    'google_event_id' => $result['google_event_id'],
                    'google_meet_link' => $result['google_meet_link'],
                    'title' => $call->title,
                    'start_time' => $call->start_time,
                    'end_time' => $call->end_time,
                    'participants' => collect($participants)->map(fn ($p) => [
                        'email' => $p->email,
                        'name' => $p->name,
                    ])->values()->all(),
                    'callback_url' => url('/api/internal/n8n/calendar-call-result'),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Google call sync failed', [
                'call_id' => $callId,
                'user_id' => $userId,
                'action' => $action,
                'error' => $e->getMessage(),
            ]);

            DB::table('freelance_calendar_events')
                ->where('id', $callId)
                ->update([
                    'sync_status' => 'failed',
                    'sync_error' => $e->getMessage(),
                    'updated_at' => now(),
                ]);
        }
    }

    public function sendInvitationEmails(int $callId, int $userId): void
    {
        $call = DB::table('freelance_calendar_events')->where('id', $callId)->first();
        if (!$call) {
            return;
        }

        $creator = User::find($userId);
        $participants = $this->getParticipants($callId);
        $meetLink = $call->google_meet_link ?: $call->call_link;
        $organizerName = $creator?->name ?? 'Backclub';

        $emails = collect($participants)->pluck('email')->filter();
        if ($creator?->email) {
            $emails->prepend($creator->email);
        }

        $integration = UserGoogleIntegration::where('user_id', $userId)->first();
        if ($integration?->google_email) {
            $emails->prepend($integration->google_email);
        }

        foreach ($emails->map(fn ($e) => strtolower(trim($e)))->unique()->filter() as $email) {
            try {
                Mail::to($email)->send(new CallInvitationMail($call, $organizerName, $meetLink, $participants));
            } catch (\Throwable $e) {
                Log::warning('Call invitation email failed', [
                    'call_id' => $callId,
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
