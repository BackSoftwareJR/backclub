<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmProjectPmChatMessage;
use App\Models\User;
use App\Notifications\NewMessageReceived;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CrmProjectPmChatController extends Controller
{
    /**
     * GET /api/crm-projects/{id}/pm-chat/messages
     * Ottiene i messaggi della chat con il Project Manager
     */
    public function getMessages($id)
    {
        $project = CrmProject::findOrFail($id);
        
        // Verifica che il progetto abbia un manager
        if (!$project->manager_id) {
            return response()->json([
                'success' => false,
                'message' => 'Il progetto non ha un Project Manager assegnato',
            ], 404);
        }

        $messages = CrmProjectPmChatMessage::where('crm_project_id', $project->id)
            ->with('user:id,name,email,avatar')
            ->orderBy('created_at', 'asc')
            ->get();

        // Aggiungi URL completo per le immagini
        $messages = $messages->map(function ($message) {
            if ($message->media_path) {
                // Costruisci URL con /backend/storage/ invece di /storage/
                $baseUrl = rtrim(config('app.url'), '/');
                $message->media_url = $baseUrl . '/backend/storage/' . $message->media_path;
            }
            return $message;
        });

        // Marca i messaggi come letti per l'utente corrente
        $currentUserId = Auth::id();
        $unreadMessages = $messages->filter(function ($msg) use ($currentUserId) {
            return !$msg->is_read && $msg->user_id !== $currentUserId;
        });

        if ($unreadMessages->count() > 0) {
            CrmProjectPmChatMessage::whereIn('id', $unreadMessages->pluck('id'))
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        }

        return response()->json([
            'success' => true,
            'data' => $messages,
            'project_manager' => $project->manager,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/pm-chat/messages
     * Invia un messaggio nella chat con il Project Manager
     */
    public function sendMessage(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        // Verifica che il progetto abbia un manager
        if (!$project->manager_id) {
            return response()->json([
                'success' => false,
                'message' => 'Il progetto non ha un Project Manager assegnato',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'message' => 'nullable|string|max:5000',
            'message_type' => 'required|in:text,image,file',
            'file' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,pdf,doc,docx',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $messageData = [
            'crm_project_id' => $project->id,
            'user_id' => $user->id,
            'message_type' => $request->message_type,
            'message' => $request->message,
            'is_read' => false,
        ];

        // Gestione file/immagini
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            
            // Assicurati che la directory esista
            $directory = 'crm-projects/pm-chat';
            if (!Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->makeDirectory($directory, 0755, true);
            }
            
            // Salva il file
            $path = $file->store($directory, 'public');
            
            // Verifica che il file sia stato salvato
            if (!Storage::disk('public')->exists($path)) {
                Log::error('File non salvato correttamente', [
                    'path' => $path,
                    'directory' => $directory,
                    'storage_path' => Storage::disk('public')->path($path),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Errore nel salvataggio del file',
                ], 500);
            }
            
            // Log per debug
            Log::info('File caricato con successo', [
                'path' => $path,
                'full_path' => Storage::disk('public')->path($path),
                'url' => Storage::disk('public')->url($path),
            ]);
            
            $messageData['media_path'] = $path;
            $messageData['media_name'] = $file->getClientOriginalName();
            $messageData['media_size'] = $file->getSize();
            $messageData['media_type'] = $file->getMimeType();
        }

        $message = CrmProjectPmChatMessage::create($messageData);
        $message->load('user');

        // Aggiungi URL completo per le immagini
        if ($message->media_path) {
            // Verifica che il file esista prima di generare l'URL
            if (Storage::disk('public')->exists($message->media_path)) {
                // Costruisci URL con /backend/storage/ invece di /storage/
                $baseUrl = rtrim(config('app.url'), '/');
                $message->media_url = $baseUrl . '/backend/storage/' . $message->media_path;
                
                Log::info('URL generato per immagine chat', [
                    'media_path' => $message->media_path,
                    'media_url' => $message->media_url,
                    'file_exists' => Storage::disk('public')->exists($message->media_path),
                ]);
            } else {
                Log::warning('File immagine non trovato per messaggio chat', [
                    'message_id' => $message->id,
                    'media_path' => $message->media_path,
                ]);
            }
        }

        // Invia notifica a tutti i membri del team (tranne il mittente)
        $project->load('teamMembers.user');
        foreach ($project->teamMembers as $teamMember) {
            if ($teamMember->is_active && $teamMember->user && $teamMember->user_id !== $user->id) {
                $teamMember->user->notify(new NewMessageReceived($message, $project, $user));
            }
        }
        
        // Notifica anche il Project Manager se diverso dal mittente
        if ($project->manager_id && $project->manager_id !== $user->id) {
            $manager = User::find($project->manager_id);
            if ($manager) {
                $manager->notify(new NewMessageReceived($message, $project, $user));
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Messaggio inviato con successo',
            'data' => $message,
        ], 201);
    }

    /**
     * GET /api/crm-projects/{id}/pm-chat/manager-info
     * Ottiene informazioni sul Project Manager incluso ultimo accesso
     */
    public function getManagerInfo($id)
    {
        $project = CrmProject::with('manager')->findOrFail($id);
        
        if (!$project->manager) {
            return response()->json([
                'success' => false,
                'message' => 'Il progetto non ha un Project Manager assegnato',
            ], 404);
        }

        // Ottieni ultimo accesso (se disponibile nella tabella users)
        $manager = $project->manager;
        $lastAccess = $manager->last_login_at ?? $manager->updated_at ?? null;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $manager->id,
                'name' => $manager->name,
                'email' => $manager->email,
                'avatar' => $manager->avatar,
                'last_access' => $lastAccess,
            ],
        ]);
    }

    /**
     * PUT /api/crm-projects/{id}/assign-manager
     * Assegna o cambia il Project Manager
     */
    public function assignManager(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);
        $user = Auth::user();

        // Solo admin può assegnare il manager
        if ($user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Solo gli admin possono assegnare il Project Manager',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'manager_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $project->update(['manager_id' => $request->manager_id]);
        $project->load('manager');

        return response()->json([
            'success' => true,
            'message' => 'Project Manager assegnato con successo',
            'data' => $project,
        ]);
    }

    /**
     * GET /api/crm-projects/{id}/pm-chat/unread-count
     * Ottiene il numero di messaggi non letti
     */
    public function getUnreadCount($id)
    {
        $project = CrmProject::findOrFail($id);
        $userId = Auth::id();

        $count = CrmProjectPmChatMessage::where('crm_project_id', $project->id)
            ->where('user_id', '!=', $userId)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data' => ['unread_count' => $count],
        ]);
    }
}

