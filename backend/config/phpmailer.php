<?php

/**
 * PHPMailer Configuration for Hostinger SMTP
 * 
 * Official Hostinger SMTP Settings:
 * - Server: smtp.hostinger.com
 * - Port: 465
 * - Encryption: SSL
 * 
 * IMPORTANT: Add these variables to your .env file:
 * 
 * PHPMAILER_HOST=smtp.hostinger.com
 * PHPMAILER_PORT=465
 * PHPMAILER_ENCRYPTION=ssl
 * PHPMAILER_USERNAME=your-email@yourdomain.com
 * PHPMAILER_PASSWORD=your-email-password
 * PHPMAILER_FROM_ADDRESS=noreply@yourdomain.com
 * PHPMAILER_FROM_NAME=Your Company Name
 * PHPMAILER_REPLY_TO_ADDRESS=support@yourdomain.com
 * PHPMAILER_REPLY_TO_NAME=Support Team
 * PHPMAILER_DEBUG=false
 * 
 * Note: These are the official Hostinger SMTP settings.
 * Do not change host, port, or encryption unless Hostinger updates them.
 */

return [
    /*
    |--------------------------------------------------------------------------
    | SMTP Host
    |--------------------------------------------------------------------------
    |
    | Hostinger SMTP server address (Official: smtp.hostinger.com)
    |
    */
    'host' => env('PHPMAILER_HOST', 'smtp.hostinger.com'),

    /*
    |--------------------------------------------------------------------------
    | SMTP Port
    |--------------------------------------------------------------------------
    |
    | Port for SMTP connection (Official Hostinger: 465 with SSL)
    | 465 for SSL, 587 for TLS
    |
    */
    'port' => env('PHPMAILER_PORT', 465),

    /*
    |--------------------------------------------------------------------------
    | Encryption
    |--------------------------------------------------------------------------
    |
    | Encryption method: 'ssl' or 'tls'
    | Official Hostinger: 'ssl' with port 465
    | Use 'ssl' for port 465, 'tls' for port 587
    |
    */
    'encryption' => env('PHPMAILER_ENCRYPTION', 'ssl'),

    /*
    |--------------------------------------------------------------------------
    | SMTP Username
    |--------------------------------------------------------------------------
    |
    | Your email address for SMTP authentication
    |
    */
    'username' => env('PHPMAILER_USERNAME', 'noreply@backclub.it'),

    /*
    |--------------------------------------------------------------------------
    | SMTP Password
    |--------------------------------------------------------------------------
    |
    | Your email password for SMTP authentication
    |
    */
    'password' => env('PHPMAILER_PASSWORD', '^PCmFea2@K'),

    /*
    |--------------------------------------------------------------------------
    | From Address
    |--------------------------------------------------------------------------
    |
    | Default sender email address
    | 
    | IMPORTANT: For Hostinger SMTP, this MUST match PHPMAILER_USERNAME
    | If different, the system will automatically use PHPMAILER_USERNAME as From
    | and set this address as Reply-To instead.
    |
    */
    'from' => [
        'address' => env('PHPMAILER_FROM_ADDRESS', env('PHPMAILER_USERNAME', 'noreply@backclub.it')),
        'name' => env('PHPMAILER_FROM_NAME', env('MAIL_FROM_NAME', 'BackClub CRM')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Reply To Address
    |--------------------------------------------------------------------------
    |
    | Default reply-to email address (optional)
    |
    */
    'reply_to' => [
        'address' => env('PHPMAILER_REPLY_TO_ADDRESS', ''),
        'name' => env('PHPMAILER_REPLY_TO_NAME', 'Support Team'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Debug Mode
    |--------------------------------------------------------------------------
    |
    | Enable SMTP debug output (disable in production)
    |
    */
    'debug' => env('PHPMAILER_DEBUG', false),
];

