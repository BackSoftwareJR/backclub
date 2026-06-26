<?php

namespace App\Http\Controllers;

use App\Models\OrganicAiChatMessage;
use App\Models\OrganicAiChatSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganicAiChatController extends Controller
{
    /**
     * GET /api/organic-web/projects/{id}/ai/sessions
     * Lista sessioni con ultimo messaggio.
     */
    public function index(int $id): JsonResponse
    {
        $sessions = OrganicAiChatSession::where('organic_web_project_id', $id)
            ->with(['messages' => function ($query) {
                $query->latest()->limit(1);
            }])
            ->latest()
            ->get()
            ->map(function (OrganicAiChatSession $session) {
                return [
                    'id'                     => $session->id,
                    'organic_web_project_id' => $session->organic_web_project_id,
                    'report_id'              => $session->report_id,
                    'title'                  => $session->title,
                    'last_message'           => $session->messages->first()?->only(['id', 'role', 'content', 'created_at']),
                    'created_at'             => $session->created_at?->toIso8601String(),
                    'updated_at'             => $session->updated_at?->toIso8601String(),
                ];
            });

        return response()->json(['sessions' => $sessions]);
    }

    /**
     * POST /api/organic-web/projects/{id}/ai/sessions
     * Crea nuova sessione.
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'title'     => ['sometimes', 'nullable', 'string', 'max:512'],
            'report_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        $session = OrganicAiChatSession::create([
            'organic_web_project_id' => $id,
            'report_id'              => $validated['report_id'] ?? null,
            'title'                  => $validated['title'] ?? 'Nuova Chat',
        ]);

        return response()->json([
            'success' => true,
            'session' => [
                'id'                     => $session->id,
                'organic_web_project_id' => $session->organic_web_project_id,
                'report_id'              => $session->report_id,
                'title'                  => $session->title,
                'created_at'             => $session->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * GET /api/organic-web/projects/{id}/ai/sessions/{sessionId}/messages
     * Messaggi di una sessione.
     */
    public function messages(int $id, int $sessionId): JsonResponse
    {
        $session = OrganicAiChatSession::where('organic_web_project_id', $id)
            ->findOrFail($sessionId);

        $messages = $session->messages()
            ->orderBy('created_at')
            ->get()
            ->map(fn (OrganicAiChatMessage $msg) => [
                'id'         => $msg->id,
                'session_id' => $msg->session_id,
                'role'       => $msg->role,
                'content'    => $msg->content,
                'created_at' => $msg->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'session_id' => $sessionId,
            'messages'   => $messages,
        ]);
    }

    /**
     * POST /api/organic-web/projects/{id}/ai/sessions/{sessionId}/messages
     * Aggiunge messaggio a una sessione.
     */
    public function addMessage(Request $request, int $id, int $sessionId): JsonResponse
    {
        $session = OrganicAiChatSession::where('organic_web_project_id', $id)
            ->findOrFail($sessionId);

        $validated = $request->validate([
            'role'    => ['required', 'string', 'in:user,assistant'],
            'content' => ['required', 'string'],
        ]);

        $message = $session->messages()->create([
            'role'    => $validated['role'],
            'content' => $validated['content'],
        ]);

        return response()->json([
            'success' => true,
            'message' => [
                'id'         => $message->id,
                'session_id' => $message->session_id,
                'role'       => $message->role,
                'content'    => $message->content,
                'created_at' => $message->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * DELETE /api/organic-web/projects/{id}/ai/sessions/{sessionId}
     * Elimina sessione e tutti i messaggi.
     */
    public function destroy(int $id, int $sessionId): JsonResponse
    {
        $session = OrganicAiChatSession::where('organic_web_project_id', $id)
            ->findOrFail($sessionId);

        $session->messages()->delete();
        $session->delete();

        return response()->json(['success' => true]);
    }
}
