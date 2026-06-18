<?php

namespace App\Http\Controllers;

use App\Jobs\SyncCallToGoogleJob;
use App\Services\N8nWebhookService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class N8nCalendarController extends Controller
{
    public function calendarCallResult(Request $request, N8nWebhookService $n8n)
    {
        $rawBody = $request->getContent();
        $signature = $request->header('X-Backclub-Signature');

        if (!$n8n->verifySignature($rawBody, $signature)) {
            return response()->json(['success' => false, 'message' => 'Firma non valida'], 401);
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return response()->json(['success' => false, 'message' => 'Payload non valido'], 422);
        }

        $validated = validator($payload, [
            'call_id' => 'required|integer',
            'user_id' => 'required|integer',
            'action' => 'sometimes|in:create,update,resync',
            'google_meet_link' => 'nullable|string|max:500',
            'google_event_id' => 'nullable|string|max:255',
        ])->validate();

        $call = DB::table('freelance_calendar_events')
            ->where('id', $validated['call_id'])
            ->where('user_id', $validated['user_id'])
            ->where('type', 'call')
            ->whereNull('deleted_at')
            ->first();

        if (!$call) {
            return response()->json(['success' => false, 'message' => 'Call non trovata'], 404);
        }

        $action = $validated['action'] ?? 'resync';

        if ($action === 'resync') {
            SyncCallToGoogleJob::dispatch($validated['call_id'], $validated['user_id'], 'create');

            return response()->json([
                'success' => true,
                'message' => 'Sincronizzazione Google avviata',
            ]);
        }

        $update = ['updated_at' => now()];

        if (!empty($validated['google_event_id'])) {
            $update['google_event_id'] = $validated['google_event_id'];
        }
        if (!empty($validated['google_meet_link'])) {
            $update['google_meet_link'] = $validated['google_meet_link'];
            $update['call_link'] = $validated['google_meet_link'];
            $update['sync_status'] = 'synced';
            $update['sync_error'] = null;
        }

        DB::table('freelance_calendar_events')
            ->where('id', $validated['call_id'])
            ->update($update);

        Log::info('N8N calendar callback processed', [
            'call_id' => $validated['call_id'],
            'action' => $action,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Call aggiornata da N8N',
        ]);
    }
}
