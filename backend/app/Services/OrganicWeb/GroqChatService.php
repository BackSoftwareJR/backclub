<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicAiAnalysis;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GroqChatService
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
     * Risponde al messaggio utente basandosi sul contesto di un audit salvato.
     *
     * @param  array<array{role: string, content: string}> $chatHistory
     */
    public function chatWithAuditContext(int $auditId, array $chatHistory, string $userMessage): string
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('GROQ_API_KEY non configurata');
        }

        $analysis = OrganicAiAnalysis::findOrFail($auditId);

        $systemContent = "Sei un SEO Advisor. Rispondi alle domande dell'utente basandoti ESCLUSIVAMENTE su questo audit:\n\n"
            . ($analysis->generated_markdown ?? '')
            . "\n\nSii conciso, diretto e pratico. Rispondi in italiano.";

        $messages = [
            ['role' => 'system', 'content' => $systemContent],
        ];

        foreach ($chatHistory as $entry) {
            if (isset($entry['role'], $entry['content']) && in_array($entry['role'], ['user', 'assistant'])) {
                $messages[] = ['role' => $entry['role'], 'content' => $entry['content']];
            }
        }

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
                Log::error('[GroqChatService] API error', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                throw new \RuntimeException('Errore API Groq: ' . $response->status());
            }

            return trim($response->json('choices.0.message.content') ?? '');
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('[GroqChatService] Eccezione', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Errore durante la chat: ' . $e->getMessage(), 0, $e);
        }
    }
}
