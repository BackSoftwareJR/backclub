<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TaskSeriesAnalysisService
{
    private const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL = 'llama-3.3-70b-versatile';
    private const TIMEOUT_S = 60;
    private const MAX_TASKS = 30;

    /**
     * @return array{
     *   series_title: string,
     *   summary: string,
     *   source_type: string,
     *   source_filename: string,
     *   extracted_text_preview: string,
     *   tasks: array<int, array<string, mixed>>
     * }
     */
    public function analyze(
        string $extractedText,
        string $sourceFilename,
        ?string $projectName = null,
        string $sourceType = 'file',
        ?string $aiInstructions = null,
        ?string $seriesTitleHint = null
    ): array
    {
        $apiKey = config('services.groq.api_key');
        if (empty($apiKey)) {
            throw new \RuntimeException('Servizio AI non configurato (GROQ_API_KEY mancante).');
        }

        if (mb_strlen(trim($extractedText)) < 50) {
            throw new \InvalidArgumentException('Il contenuto contiene troppo poco testo per l\'analisi (minimo 50 caratteri).');
        }

        $systemPrompt = $this->buildSystemPrompt();
        $userMessage = $this->buildUserMessage(
            $extractedText,
            $sourceFilename,
            $projectName,
            $sourceType,
            $aiInstructions,
            $seriesTitleHint
        );

        $response = Http::timeout(self::TIMEOUT_S)
            ->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
            ])
            ->post(self::GROQ_API_URL, [
                'model' => self::MODEL,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userMessage],
                ],
                'temperature' => 0.4,
                'max_tokens' => 4096,
                'response_format' => ['type' => 'json_object'],
            ]);

        if ($response->failed()) {
            Log::error('TaskSeriesAnalysis: Groq API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException('Servizio AI temporaneamente non disponibile.');
        }

        $content = $response->json('choices.0.message.content');
        if (!$content) {
            throw new \RuntimeException('Risposta AI vuota.');
        }

        $parsed = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($parsed)) {
            Log::warning('TaskSeriesAnalysis: invalid JSON', ['content' => mb_substr($content, 0, 500)]);
            throw new \RuntimeException('Impossibile interpretare la risposta AI.');
        }

        return $this->normalizeResponse($parsed, $sourceFilename, $extractedText, $sourceType, $seriesTitleHint);
    }

    private function buildSystemPrompt(): string
    {
        return <<<'PROMPT'
Sei un project manager esperto che analizza documenti di progetto (brief, specifiche, piani di lavoro, checklist) e li trasforma in task operativi per un team di sviluppo e marketing.

Il tuo compito:
1. Leggere il documento e identificare tutte le attività concrete da svolgere
2. Scomporre attività complesse in sub-task specifici (es. "analisi SEO" → audit tecnico, keyword research, competitor analysis)
3. Proporre priorità, modalità di esecuzione e stime temporali realistiche

Regole:
- Rispondi SEMPRE in italiano
- Ogni task deve avere un titolo conciso (max 120 caratteri) che inizia preferibilmente con un verbo
- La descrizione deve essere chiara e actionable (max 500 caratteri)
- priority: "low", "medium", "high" o "urgent"
- execution_mode_suggestion: "human" (lavoro manuale), "agent" (automatizzabile da AI/codice), "agent_human" (AI + revisione umana)
- estimated_hours: stima ore (numero, 0.5-40)
- suggested_due_offset_days: giorni dalla data odierna per la scadenza suggerita (1-90)
- source_section: breve riferimento alla sezione del documento (max 100 caratteri)
- Genera tra 3 e 20 task, ordinati logicamente per dipendenze/esecuzione
- NON inventare informazioni non presenti nel documento; se mancano dettagli, crea task generici ma sensati

Rispondi SOLO con JSON valido:
{
  "series_title": "Titolo della serie di task",
  "summary": "Breve riassunto del documento e del piano proposto (max 300 caratteri)",
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "priority": "medium",
      "execution_mode_suggestion": "human",
      "estimated_hours": 2,
      "suggested_due_offset_days": 7,
      "source_section": "..."
    }
  ]
}
PROMPT;
    }

    private function buildUserMessage(
        string $text,
        string $filename,
        ?string $projectName,
        string $sourceType,
        ?string $aiInstructions,
        ?string $seriesTitleHint
    ): string {
        $projectLine = $projectName ? "Progetto: {$projectName}\n" : '';
        $sourceLine = $sourceType === 'text'
            ? "Fonte: analisi scritta direttamente dal PM\n"
            : "Documento: {$filename}\n";
        $titleHintLine = $seriesTitleHint ? "Titolo serie suggerito dal PM: {$seriesTitleHint}\n" : '';
        $instructionsLine = $aiInstructions
            ? "\n--- ISTRUZIONI AGGIUNTIVE DEL PM ---\n{$aiInstructions}\n--- FINE ISTRUZIONI ---\n"
            : '';
        $contentLabel = $sourceType === 'text' ? 'CONTENUTO ANALISI' : 'CONTENUTO DOCUMENTO';

        return "{$projectLine}{$sourceLine}{$titleHintLine}{$instructionsLine}\n--- {$contentLabel} ---\n{$text}\n--- FINE ---";
    }

    /**
     * @param  array<string, mixed>  $parsed
     * @return array{
     *   series_title: string,
     *   summary: string,
     *   source_type: string,
     *   source_filename: string,
     *   extracted_text_preview: string,
     *   tasks: array<int, array<string, mixed>>
     * }
     */
    private function normalizeResponse(
        array $parsed,
        string $sourceFilename,
        string $extractedText,
        string $sourceType,
        ?string $seriesTitleHint
    ): array
    {
        $validPriorities = ['low', 'medium', 'high', 'urgent'];
        $validModes = ['human', 'agent', 'agent_human'];

        $seriesTitle = mb_substr(trim($parsed['series_title'] ?? ''), 0, 255);
        if ($seriesTitle === '' && $seriesTitleHint) {
            $seriesTitle = mb_substr($seriesTitleHint, 0, 255);
        }
        if ($seriesTitle === '') {
            $seriesTitle = 'Serie di task';
        }
        $summary = mb_substr(trim($parsed['summary'] ?? ''), 0, 500);

        $tasks = [];
        $rawTasks = is_array($parsed['tasks'] ?? null) ? $parsed['tasks'] : [];

        foreach (array_slice($rawTasks, 0, self::MAX_TASKS) as $raw) {
            if (!is_array($raw)) {
                continue;
            }

            $title = mb_substr(trim($raw['title'] ?? ''), 0, 255);
            if ($title === '') {
                continue;
            }

            $priority = in_array($raw['priority'] ?? '', $validPriorities, true) ? $raw['priority'] : 'medium';
            $mode = in_array($raw['execution_mode_suggestion'] ?? '', $validModes, true)
                ? $raw['execution_mode_suggestion']
                : 'human';

            $estimatedHours = is_numeric($raw['estimated_hours'] ?? null)
                ? max(0.5, min(40, (float) $raw['estimated_hours']))
                : 2;

            $dueOffset = is_numeric($raw['suggested_due_offset_days'] ?? null)
                ? max(1, min(90, (int) $raw['suggested_due_offset_days']))
                : 7;

            $tasks[] = [
                'title' => $title,
                'description' => mb_substr(trim($raw['description'] ?? ''), 0, 2000),
                'priority' => $priority,
                'execution_mode_suggestion' => $mode,
                'estimated_hours' => $estimatedHours,
                'suggested_due_offset_days' => $dueOffset,
                'source_section' => mb_substr(trim($raw['source_section'] ?? ''), 0, 100),
            ];
        }

        if (empty($tasks)) {
            throw new \InvalidArgumentException(
                'Nessun task valido estratto dal documento. Prova con un file più dettagliato o aggiungi i task manualmente.'
            );
        }

        $preview = mb_substr($extractedText, 0, 500);
        if (mb_strlen($extractedText) > 500) {
            $preview .= '…';
        }

        return [
            'series_title' => $seriesTitle,
            'summary' => $summary,
            'source_type' => $sourceType,
            'source_filename' => $sourceFilename,
            'extracted_text_preview' => $preview,
            'tasks' => $tasks,
        ];
    }
}
