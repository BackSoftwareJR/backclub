<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiTaskImproveController extends Controller
{
    private const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL = 'llama-3.3-70b-versatile';

    public function improve(Request $request)
    {
        $request->validate([
            'title'       => 'nullable|string|max:500',
            'description' => 'nullable|string|max:5000',
        ]);

        $apiKey = config('services.groq.api_key');
        if (empty($apiKey)) {
            return response()->json(['error' => 'AI service not configured.'], 503);
        }

        $title       = trim($request->input('title', ''));
        $description = trim($request->input('description', ''));

        // Detect mode: title-only suggestion vs full improve
        $isTitleMode = mb_strlen($title) < 3 && mb_strlen($description) >= 10;

        if (!$isTitleMode && mb_strlen($title) < 3) {
            return response()->json(['error' => 'Fornisci almeno un titolo (min 3 caratteri) o una descrizione.'], 422);
        }

        $systemPrompt = $isTitleMode
            ? $this->buildTitleSuggestPrompt()
            : $this->buildImprovePrompt();

        $userMessage = $isTitleMode
            ? "Descrizione: {$description}"
            : "Titolo: {$title}" . ($description !== '' ? "\nDescrizione: {$description}" : '');

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type'  => 'application/json',
                ])
                ->post(self::GROQ_API_URL, [
                    'model'           => self::MODEL,
                    'messages'        => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user',   'content' => $userMessage],
                    ],
                    'temperature'     => 0.7,
                    'max_tokens'      => 1024,
                    'response_format' => ['type' => 'json_object'],
                ]);

            if ($response->failed()) {
                Log::error('Groq API error', ['status' => $response->status(), 'body' => $response->body()]);
                return response()->json(['error' => 'AI service unavailable.'], 502);
            }

            $content = $response->json('choices.0.message.content');
            if (!$content) {
                return response()->json(['error' => 'Empty AI response.'], 502);
            }

            $parsed = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE || empty($parsed['suggestions'])) {
                Log::warning('AiTaskImprove: unexpected format', ['content' => $content]);
                return response()->json(['error' => 'Could not parse AI response.'], 502);
            }

            if ($isTitleMode) {
                // Title-suggest mode: each suggestion has only a title
                $suggestions = array_slice(array_map(fn($s) => [
                    'title'       => mb_substr(trim($s['title'] ?? ''), 0, 120),
                    'description' => '',
                ], $parsed['suggestions']), 0, 3);
            } else {
                // Full improve mode: title + description
                $suggestions = array_slice(array_map(fn($s) => [
                    'title'       => mb_substr(trim($s['title'] ?? $title), 0, 120),
                    'description' => mb_substr(trim($s['description'] ?? ''), 0, 2000),
                ], $parsed['suggestions']), 0, 3);
            }

            return response()->json([
                'mode'        => $isTitleMode ? 'suggest_title' : 'improve',
                'suggestions' => $suggestions,
            ]);

        } catch (\Exception $e) {
            Log::error('AiTaskImprove exception', ['message' => $e->getMessage()]);
            return response()->json(['error' => 'AI service error.'], 500);
        }
    }

    private function buildTitleSuggestPrompt(): string
    {
        return <<<'PROMPT'
Sei un assistente specializzato nella gestione di task di progetto.
L'utente ha scritto una descrizione ma non ha ancora un titolo.
Il tuo compito è generare 3 titoli concisi e professionali per questa task.

Regole:
1. Ogni titolo deve essere massimo 80 caratteri
2. Titoli diretti, concreti, in italiano
3. Iniziano con un verbo all'infinito quando possibile (es. "Implementare...", "Creare...", "Revisionare...")
4. Ogni titolo deve catturare l'essenza principale della descrizione
5. Le 3 varianti devono differire nello stile: breve, descrittivo, orientato al risultato

Rispondi SOLO con JSON valido:
{
  "suggestions": [
    { "title": "..." },
    { "title": "..." },
    { "title": "..." }
  ]
}
PROMPT;
    }

    private function buildImprovePrompt(): string
    {
        return <<<'PROMPT'
Sei un assistente specializzato nel miglioramento di task di progetto per team professionali.
Il tuo compito è migliorare titolo e descrizione mantenendo ESATTAMENTE il contesto originale.

Regole ferree:
1. NON cambiare il significato o il contesto della task
2. Correggi errori ortografici e grammaticali
3. Migliora chiarezza e leggibilità
4. Tono professionale ma diretto
5. Titolo: max 80 caratteri, conciso e descrittivo
6. Descrizione: chiara, strutturata con bullet se utile
7. Rispondi SEMPRE in italiano
8. 3 varianti con approccio diverso:
   - Variante 1: minima correzione (solo errori e fluidità)
   - Variante 2: riformulazione professionale
   - Variante 3: versione strutturata e dettagliata

Rispondi SOLO con JSON valido:
{
  "suggestions": [
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}
PROMPT;
    }
}
