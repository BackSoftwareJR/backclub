<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google_translate' => [
        'api_key' => env('GOOGLE_TRANSLATE_API_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL') . '/api/auth/google/callback'),
        'frontend_redirect' => env('GOOGLE_OAUTH_FRONTEND_REDIRECT', env('APP_URL') . '/freelance/impostazioni'),
        'scopes' => env(
            'GOOGLE_CALENDAR_SCOPES',
            'https://www.googleapis.com/auth/calendar.events openid email profile'
        ),
        'sync_enabled' => env('GOOGLE_CALENDAR_SYNC_ENABLED', true),
    ],

    'github' => [
        'token' => env('GITHUB_TOKEN'),
        'publish_base_branch' => env('GITHUB_PUBLISH_BASE_BRANCH', 'main'),
        'publish_head_branch' => env('GITHUB_PUBLISH_HEAD_BRANCH', 'staging'),
    ],

    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
    ],

    'n8n' => [
        'enabled' => env('N8N_ENABLED', false),
        'webhook_base_url' => env('N8N_WEBHOOK_BASE_URL'),
        'webhook_url' => env('N8N_WEBHOOK_URL'),
        'webhook_auth_header' => env('N8N_WEBHOOK_AUTH_HEADER'),
        'webhook_auth_value' => env('N8N_WEBHOOK_AUTH_VALUE'),
        'callback_auth_header' => env('N8N_CALLBACK_AUTH_HEADER'),
        'callback_auth_value' => env('N8N_CALLBACK_AUTH_VALUE'),
        // URL base usato per costruire i callback URL inviati all'orchestratore N8N.
        // Se APP_URL non punta all'API pubblica, impostare questo nel .env del server.
        // Esempio: N8N_CALLBACK_BASE_URL=https://backclub.it/backend/public
        'callback_base_url' => env('N8N_CALLBACK_BASE_URL'),
        'start_timeout_seconds' => env('N8N_START_TIMEOUT_SECONDS', 30),
        'webhook_publish_production' => env('N8N_WEBHOOK_PUBLISH_PRODUCTION'),
        'calendar_call_webhook' => env('N8N_CALENDAR_CALL_WEBHOOK', 'webhook/backclub-calendar-call'),
        'workspace_agent_webhook' => env('N8N_WORKSPACE_AGENT_WEBHOOK'),
        'webhook_secret' => env('N8N_WEBHOOK_SECRET'),
        'orchestrator_webhook_secret' => env('ORCHESTRATOR_WEBHOOK_SECRET', env('WEBHOOK_SECRET')),
    ],

];
