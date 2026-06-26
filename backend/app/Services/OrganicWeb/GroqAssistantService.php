<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicAiChatMessage;
use App\Models\OrganicAiChatSession;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GroqAssistantService
{
    private string $apiKey;
    private string $model;
    private string $apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key', '');
        $this->model  = config('services.groq.model', 'llama-3.3-70b-versatile');
    }

    /**
     * Invia un messaggio alla sessione di chat e persiste sia il messaggio utente
     * che la risposta dell'assistente in organic_ai_chat_messages.
     */
    public function sendMessage(int $sessionId, string $userMessage): string
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('GROQ_API_KEY non configurata');
        }

        /** @var OrganicAiChatSession $session */
        $session = OrganicAiChatSession::with(['messages', 'report'])->findOrFail($sessionId);

        $systemContent = 'Sei un SEO Advisor esperto. Rispondi in italiano, sii conciso e pratico.';

        if ($session->report && !empty($session->report->deep_analysis_markdown)) {
            $systemContent = "Basati ESCLUSIVAMENTE su questo audit:\n\n"
                . $session->report->deep_analysis_markdown
                . "\n\n"
                . $systemContent;
        }

        $messages = [
            ['role' => 'system', 'content' => $systemContent],
        ];

        foreach ($session->messages as $msg) {
            $messages[] = [
                'role'    => $msg->role,
                'content' => $msg->content,
            ];
        }

        // Persisti il messaggio utente prima della chiamata API
        $userMsg = OrganicAiChatMessage::create([
            'session_id' => $sessionId,
            'role'       => 'user',
            'content'    => $userMessage,
        ]);

        $messages[] = ['role' => 'user', 'content' => $userMessage];

        try {
            $response = Http::timeout(30)
                ->withToken($this->apiKey)
                ->post($this->apiUrl, [
                    'model'       => $this->model,
                    'messages'    => $messages,
                    'temperature' => 0.5,
                    'max_tokens'  => 1024,
                ]);

            if ($response->failed()) {
                Log::error('[GroqAssistantService] API error', [
                    'status'     => $response->status(),
                    'session_id' => $sessionId,
                    'body'       => $response->body(),
                ]);
                throw new \RuntimeException('Errore API Groq (' . $response->status() . '): ' . $response->body());
            }

            $replyText = trim($response->json('choices.0.message.content') ?? '');

            OrganicAiChatMessage::create([
                'session_id' => $sessionId,
                'role'       => 'assistant',
                'content'    => $replyText,
            ]);

            return $replyText;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[GroqAssistantService] Eccezione', ['error' => $e->getMessage(), 'session_id' => $sessionId]);
            throw new \RuntimeException('Errore durante la chat: ' . $e->getMessage(), 0, $e);
        }
    }
}
