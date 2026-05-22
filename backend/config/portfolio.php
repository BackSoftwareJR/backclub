<?php

return [
    'token_ttl_minutes' => (int) env('PORTFOLIO_TOKEN_TTL', 60 * 24), // 24 ore
    'code_recipient_email' => trim((string) env('PORTFOLIO_CODE_EMAIL', 'jrovera05@gmail.com')),
    'otp_ttl_minutes' => (int) env('PORTFOLIO_OTP_TTL', 15), // validità codice 6 cifre inviato per email
];
