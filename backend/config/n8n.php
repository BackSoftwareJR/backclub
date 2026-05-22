<?php

return [
    'enabled' => env('N8N_ENABLED', false),

    /**
     * Webhook N8N in ingresso (produzione) — chiamato alla creazione task Agente.
     */
    'webhook_url' => env(
        'N8N_WEBHOOK_URL',
        'https://n8n.srv1691601.hstgr.cloud/webhook/5d30f479-b120-42ca-9460-e86a8fcbbe96'
    ),

    /**
     * Header Auth N8N (es. nome header "authbs" + valore segreto).
     */
    'webhook_auth_header' => env('N8N_WEBHOOK_AUTH_HEADER', 'authbs'),
    'webhook_auth_value' => env('N8N_WEBHOOK_AUTH_VALUE'),

    /**
     * Alternativa: Bearer su Authorization (se header custom non usato).
     */
    'webhook_auth_token' => env('N8N_WEBHOOK_AUTH_TOKEN'),

    /**
     * Timeout solo per AVVIO workflow (risposta immediata N8N).
     */
    'start_timeout_seconds' => (int) env('N8N_START_TIMEOUT_SECONDS', 30),

    /**
     * Auth per callback N8N → CRM (stesso header del webhook se non impostato).
     */
    'callback_auth_header' => env('N8N_CALLBACK_AUTH_HEADER'),
    'callback_auth_value' => env('N8N_CALLBACK_AUTH_VALUE'),
];
