<?php

namespace App\Http\Controllers;

use App\Models\PrivacyConsent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PrivacyConsentController extends Controller
{
    public function store(Request $request)
    {
        $user = Auth::user();

        // Check if already consented
        if ($user->privacyConsent) {
            return response()->json(['message' => 'Consent already given'], 200);
        }

        PrivacyConsent::create([
            'user_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'agreed_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Consent recorded']);
    }

    public function check(Request $request)
    {
        $user = Auth::user();
        return response()->json([
            'has_consented' => $user->privacyConsent()->exists()
        ]);
    }
}
