<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SellerOnly
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'error' => 'Non autenticato'
            ], 401);
        }

        // Verifica che l'utente sia un venditore
        if (!$user->seller_id) {
            return response()->json([
                'error' => 'Accesso riservato ai venditori'
            ], 403);
        }

        return $next($request);
    }
}

