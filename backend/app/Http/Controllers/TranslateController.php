<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Traduzione automatica di testi (es. contenuti da DB) per la lingua UI.
 * Opzionale: configurare GOOGLE_TRANSLATE_API_KEY in .env per usare Google Cloud Translation.
 * Se non configurato, restituisce il testo originale (nessun errore).
 *
 * @see docs/TRANSLATIONS_BACKEND.md
 */
class TranslateController extends Controller
{
    private const SUPPORTED_LANGS = ['it', 'en', 'es', 'fr'];

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string|max:5000',
            'target_lang' => 'required|string|in:' . implode(',', self::SUPPORTED_LANGS),
            'source_lang' => 'nullable|string|in:' . implode(',', self::SUPPORTED_LANGS),
        ]);

        $text = $validated['text'];
        $target = $validated['target_lang'];
        $source = $validated['source_lang'] ?? null;

        $apiKey = config('services.google_translate.api_key') ?? env('GOOGLE_TRANSLATE_API_KEY');

        if (empty($apiKey)) {
            return response()->json([
                'translated_text' => $text,
                'source_lang' => $source,
                'target_lang' => $target,
            ]);
        }

        try {
            $translated = $this->translateWithGoogle($text, $target, $source, $apiKey);
            return response()->json([
                'translated_text' => $translated,
                'source_lang' => $source,
                'target_lang' => $target,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Translate API error: ' . $e->getMessage());
            return response()->json([
                'translated_text' => $text,
                'source_lang' => $source,
                'target_lang' => $target,
            ]);
        }
    }

    private function translateWithGoogle(string $text, string $target, ?string $source, string $apiKey): string
    {
        $url = 'https://translation.googleapis.com/language/translate/v2';
        $params = [
            'key' => $apiKey,
            'q' => $text,
            'target' => $target,
        ];
        if ($source) {
            $params['source'] = $source;
        }

        $response = Http::asForm()->post($url, $params);

        if (!$response->successful()) {
            throw new \RuntimeException('Google Translate API error: ' . $response->body());
        }

        $data = $response->json();
        $translated = $data['data']['translations'][0]['translatedText'] ?? $text;
        return html_entity_decode($translated, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
