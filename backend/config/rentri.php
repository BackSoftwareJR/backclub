<?php

return [

    'enabled' => env('RENTRI_ENABLED', false),

    'environment' => env('RENTRI_ENVIRONMENT', 'demo'),

    'base_urls' => [
        'demo' => 'https://demoapi.rentri.gov.it',
        'production' => 'https://api.rentri.gov.it',
    ],

    'codice_fiscale' => env('RENTRI_CODICE_FISCALE'),

    'num_iscr_sito' => env('RENTRI_NUM_ISCR_SITO'),

    'cert_path' => env('RENTRI_CERT_PATH'),

    'cert_password' => env('RENTRI_CERT_PASSWORD'),

    'jwt' => [
        'issuer' => env('RENTRI_JWT_ISSUER'),
        'subject' => env('RENTRI_JWT_SUBJECT'),
        'audience' => env('RENTRI_JWT_AUDIENCE', 'rentri.gov.it'),
        'ttl_seconds' => (int) env('RENTRI_JWT_TTL', 300),
    ],

    'http' => [
        'timeout' => (int) env('RENTRI_HTTP_TIMEOUT', 30),
        'retry' => (int) env('RENTRI_HTTP_RETRY', 3),
        'retry_delay_ms' => (int) env('RENTRI_HTTP_RETRY_DELAY_MS', 500),
    ],

    'endpoints' => [
        'vidimazione_formulari' => '/vidimazione-formulari/v1.0',
        'formulari' => '/formulari/v1.0',
        'codifiche' => '/codifiche/v1.0',
    ],

    'cer_default_autoveicolo' => '16 01 04*',

];
