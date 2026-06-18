<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Date/time del calendario freelance.
 * DB: UTC (naive). API: ISO8601 UTC. Display/email: Europe/Rome.
 */
class CalendarDateTime
{
    public const DISPLAY_TIMEZONE = 'Europe/Rome';

    /** Salva in DB da input ISO (frontend invia UTC). */
    public static function toStorage(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value)->utc()->format('Y-m-d H:i:s');
    }

    /** Risposta API — sempre ISO8601 UTC con Z. */
    public static function toApi(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value, 'UTC')->utc()->toIso8601String();
    }

    /** Visualizzazione email / testo in ora italiana. */
    public static function forDisplay(?string $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value, 'UTC')
            ->timezone(self::DISPLAY_TIMEZONE)
            ->locale('it');
    }

    /** Payload Google Calendar API (dateTime locale + timeZone). */
    public static function forGoogleCalendar(?string $value): array
    {
        $local = self::forDisplay($value) ?? Carbon::now(self::DISPLAY_TIMEZONE);

        return [
            'dateTime' => $local->format('Y-m-d\TH:i:s'),
            'timeZone' => self::DISPLAY_TIMEZONE,
        ];
    }
}
