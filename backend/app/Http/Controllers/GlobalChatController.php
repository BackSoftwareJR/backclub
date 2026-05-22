<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\ChatGlobal;
use App\Models\ChatMention;
use App\Models\User;
use App\Models\Project;
use App\Models\Task;

class GlobalChatController extends Controller
{
    /**
     * Lista messaggi chat globale
     */
    public function index(Request $request)
    {
        $query = ChatGlobal::with(['user', 'replyTo.user', 'mentions.mentionedUser'])
            ->where('is_deleted', false)
            ->orderBy('created_at', 'asc');

        // Paginazione
        $limit = $request->get('limit', 50);
        $offset = $request->get('offset', 0);

        $messages = $query->skip($offset)->take($limit)->get();

        // Marca messaggi come letti
        $userId = Auth::id();
        foreach ($messages as $message) {
            if (!$message->isReadBy($userId)) {
                $message->markAsRead($userId);
            }
        }

        return response()->json([
            'messages' => $messages,
            'has_more' => ChatGlobal::where('is_deleted', false)->count() > ($offset + $limit),
        ]);
    }

    /**
     * Invia nuovo messaggio
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string',
            'message_type' => 'in:text,image,file,system',
            'media_path' => 'nullable|string',
            'reply_to_id' => 'nullable|exists:chat_global,id',
            'mentions' => 'nullable|array',
            'mentions.*.type' => 'required|in:user,project,task,client',
            'mentions.*.id' => 'required|integer',
        ]);

        $validated['user_id'] = Auth::id();
        $validated['message_type'] = $validated['message_type'] ?? 'text';

        $chatMessage = ChatGlobal::create($validated);

        // Gestione menzioni
        if (isset($validated['mentions'])) {
            foreach ($validated['mentions'] as $mention) {
                $mentionData = [
                    'chat_message_id' => $chatMessage->id,
                    'mentionable_type' => $mention['type'],
                    'mentionable_id' => $mention['id'],
                ];

                // Se è una menzione utente, aggiungi anche mentioned_user_id
                if ($mention['type'] === 'user') {
                    $mentionData['mentioned_user_id'] = $mention['id'];
                }

                ChatMention::create($mentionData);
            }
        }

        // Marca come letto dall'autore
        $chatMessage->markAsRead(Auth::id());

        return response()->json($chatMessage->load(['user', 'replyTo.user', 'mentions.mentionedUser']), 201);
    }

    /**
     * Aggiorna messaggio (solo se è l'autore)
     */
    public function update(Request $request, ChatGlobal $chatGlobal)
    {
        if ($chatGlobal->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $chatGlobal->update([
            'message' => $validated['message'],
            'is_edited' => true,
        ]);

        return response()->json($chatGlobal->load(['user', 'replyTo.user', 'mentions.mentionedUser']));
    }

    /**
     * Elimina messaggio (soft delete)
     */
    public function destroy(ChatGlobal $chatGlobal)
    {
        if ($chatGlobal->user_id !== Auth::id() && Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $chatGlobal->update(['is_deleted' => true]);

        return response()->json(null, 204);
    }

    /**
     * Cerca menzioni possibili (autocomplete)
     */
    public function searchMentions(Request $request)
    {
        $query = $request->get('q', '');
        $type = $request->get('type', 'all'); // all, user, project, task

        $results = [];

        if ($type === 'all' || $type === 'user') {
            $users = User::where('is_active', true)
                ->where(function($q) use ($query) {
                    $q->where('name', 'like', "%{$query}%")
                      ->orWhere('email', 'like', "%{$query}%");
                })
                ->limit(10)
                ->get()
                ->map(function($user) {
                    return [
                        'type' => 'user',
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'avatar' => $user->avatar,
                    ];
                });
            $results = array_merge($results, $users->toArray());
        }

        if ($type === 'all' || $type === 'project') {
            $projects = Project::where('name', 'like', "%{$query}%")
                ->limit(10)
                ->get()
                ->map(function($project) {
                    return [
                        'type' => 'project',
                        'id' => $project->id,
                        'name' => $project->name,
                        'client' => $project->client?->company_name,
                    ];
                });
            $results = array_merge($results, $projects->toArray());
        }

        if ($type === 'all' || $type === 'task') {
            $tasks = Task::where('title', 'like', "%{$query}%")
                ->limit(10)
                ->get()
                ->map(function($task) {
                    return [
                        'type' => 'task',
                        'id' => $task->id,
                        'name' => $task->title,
                        'project' => $task->project?->name,
                    ];
                });
            $results = array_merge($results, $tasks->toArray());
        }

        return response()->json($results);
    }

    /**
     * Messaggi non letti
     */
    public function unread()
    {
        $userId = Auth::id();
        
        $unreadCount = ChatGlobal::where('is_deleted', false)
            ->where('user_id', '!=', $userId)
            ->whereDoesntHave('readStatus', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->count();

        return response()->json(['unread_count' => $unreadCount]);
    }
}

