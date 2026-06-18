<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\CalendarReminder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendCallRemindersCommand extends Command
{
    protected $signature = 'calendar:send-call-reminders';

    protected $description = 'Invia reminder email/in-app per le call freelance imminenti';

    public function handle(): int
    {
        $now = now();

        $pending = DB::table('freelance_calendar_call_notifications as n')
            ->join('freelance_calendar_events as c', 'c.id', '=', 'n.call_id')
            ->whereNull('n.sent_at')
            ->whereNull('c.deleted_at')
            ->where('c.type', 'call')
            ->where('c.start_time', '>', $now)
            ->select('n.*', 'c.title', 'c.start_time', 'c.end_time', 'c.call_link', 'c.google_meet_link', 'c.user_id')
            ->get();

        $sent = 0;

        foreach ($pending as $notification) {
            $callStart = \Carbon\Carbon::parse($notification->start_time);
            $minutesUntil = $now->diffInMinutes($callStart, false);

            if ($minutesUntil > $notification->minutes_before || $minutesUntil < 0) {
                continue;
            }

            try {
                if ($notification->notification_type === 'email' || $notification->notification_type === 'in_app') {
                    $user = User::find($notification->user_id);
                    if ($user) {
                        $event = (object) [
                            'id' => $notification->call_id,
                            'title' => $notification->title,
                            'start_time' => $notification->start_time,
                            'end_time' => $notification->end_time,
                            'call_link' => $notification->google_meet_link ?: $notification->call_link,
                            'type' => 'call',
                        ];
                        $user->notify(new CalendarReminder($event));
                    }
                }

                DB::table('freelance_calendar_call_notifications')
                    ->where('id', $notification->id)
                    ->update(['sent_at' => now(), 'updated_at' => now()]);

                $sent++;
            } catch (\Throwable $e) {
                Log::error('Call reminder send failed', [
                    'notification_id' => $notification->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($sent > 0) {
            $this->info("Inviati {$sent} reminder call.");
        }

        return self::SUCCESS;
    }
}
