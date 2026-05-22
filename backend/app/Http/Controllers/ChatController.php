<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    public function index(Request $request, $projectId)
    {
        // Unified Project Chat: Return all messages for the project
        $query = DB::table('chat_messages')
            ->join('users', 'chat_messages.user_id', '=', 'users.id')
            ->select('chat_messages.*', 'users.name as user_name', 'users.avatar as user_avatar')
            ->where('chat_messages.project_id', $projectId)
            ->orderBy('chat_messages.created_at', 'asc');

        $messages = $query->get()->map(function ($msg) {
            return [
                'id' => $msg->id,
                'user_id' => $msg->user_id,
                'message' => $msg->message,
                'created_at' => $msg->created_at,
                'user' => [
                    'name' => $msg->user_name,
                    'avatar' => $msg->user_avatar,
                ]
            ];
        });

        return response()->json($messages);
    }

    public function store(Request $request, $projectId)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $user = $request->user();
        
        // Unified Project Chat: Store message for the project, no mode/recipient needed
        $messageId = DB::table('chat_messages')->insertGetId([
            'project_id' => $projectId,
            'user_id' => $user->id,
            'message' => $request->message,
            'mode' => 'group', // Default to group for backward compatibility or just as a placeholder
            'recipient_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $messageId, 'success' => true]);
    }
}

