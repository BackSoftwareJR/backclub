<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'seller' => \App\Http\Middleware\SellerOnly::class,
        ]);
        $middleware->api(append: [\App\Http\Middleware\ApiResponseHeaders::class]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('calendar:send-call-reminders')->everyMinute();

        // Organic Web Workspace
        $schedule->command('organic-web:run-scheduler')->dailyAt('03:00');
        $schedule->command('organic-web:advance-runs')->everyFiveMinutes();
        $schedule->command('organic-web:send-reminders')->hourly();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
