<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Database\QueryException;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * Get all notifications for the authenticated user
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $query = $user->notifications();

            // Filter by read status if provided
            if ($request->has('read')) {
                if ($request->read === 'true') {
                    $query->whereNotNull('read_at');
                } else {
                    $query->whereNull('read_at');
                }
            }

            $notifications = $query->orderBy('created_at', 'desc')
                ->limit($request->get('limit', 50))
                ->get();

            return response()->json([
                'success' => true,
                'data' => $notifications,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Notifications index failed: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }
    }

    /**
     * GET /api/notifications/unread-count
     * Get count of unread notifications
     */
    public function unreadCount()
    {
        try {
            $user = Auth::user();
            $count = $user->unreadNotifications()->count();

            return response()->json([
                'success' => true,
                'data' => ['count' => $count],
            ]);
        } catch (\Throwable $e) {
            Log::warning('Notifications unread count failed: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => ['count' => 0],
            ]);
        }
    }

    /**
     * PUT /api/notifications/{id}/read
     * Mark a notification as read
     */
    public function markAsRead($id)
    {
        try {
            $user = Auth::user();
            $notification = $user->notifications()->find($id);

            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notifica non trovata',
                ], 404);
            }

            $notification->markAsRead();

            return response()->json([
                'success' => true,
                'message' => 'Notifica segnata come letta',
            ]);
        } catch (QueryException $e) {
            Log::warning('Notifications markAsRead failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Server Error',
            ], 500);
        }
    }

    /**
     * PUT /api/notifications/read-all
     * Mark all notifications as read
     */
    public function markAllAsRead()
    {
        try {
            $user = Auth::user();
            $user->unreadNotifications->markAsRead();

            return response()->json([
                'success' => true,
                'message' => 'Tutte le notifiche sono state segnate come lette',
            ]);
        } catch (QueryException $e) {
            Log::warning('Notifications markAllAsRead failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Server Error',
            ], 500);
        }
    }
}
