<?php

namespace App\Http\Controllers;

use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SecurityController extends Controller
{
    public function index(Request $request)
    {
        $logs = LoginLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json($logs);
    }

    public function stats(Request $request)
    {
        // Active users (unique users logged in last 24h)
        $activeUsers = LoginLog::where('created_at', '>=', now()->subDay())
            ->where('status', 'success')
            ->distinct('user_id')
            ->count('user_id');

        // Failed logins in last 24h
        $failedLogins = LoginLog::where('created_at', '>=', now()->subDay())
            ->where('status', 'failed')
            ->count();

        return response()->json([
            'active_users' => $activeUsers,
            'failed_logins' => $failedLogins,
        ]);
    }
}
