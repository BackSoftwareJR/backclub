<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyN8nWebhookAuth
{
    /**
     * Verifica che la richiesta provenga da N8N (header custom o Bearer token).
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$this->isAuthorized($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Non autorizzato',
            ], 401);
        }

        return $next($request);
    }

    public static function isAuthorized(Request $request): bool
    {
        $headerName = config('n8n.callback_auth_header', config('n8n.webhook_auth_header'));
        $expected = config('n8n.callback_auth_value', config('n8n.webhook_auth_value'));

        if (!empty($headerName) && !empty($expected)) {
            if (hash_equals((string) $expected, (string) $request->header($headerName, ''))) {
                return true;
            }
        }

        $token = config('n8n.webhook_auth_token');
        if (!empty($token)) {
            $authorization = (string) $request->header('Authorization', '');
            if (preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
                return hash_equals((string) $token, trim($matches[1]));
            }
        }

        return false;
    }
}
