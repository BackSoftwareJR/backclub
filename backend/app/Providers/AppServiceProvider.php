<?php

namespace App\Providers;

use App\Services\GoogleTokenService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(GoogleTokenService::class, function (): GoogleTokenService {
            return new GoogleTokenService(
                clientId: (string) config('services.google_seo.client_id', ''),
                clientSecret: (string) config('services.google_seo.client_secret', ''),
                redirectUri: (string) config('services.google_seo.redirect_uri', ''),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
