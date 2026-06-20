<?php

namespace App\Services;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Models\TaskAiBrief;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TaskDetailAiService
{
    private const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL = 'llama-3.3-70b-versatile';
    private const BRIEF_TTL_H = 2;
    private const LLM_TIMEOUT_S = 20;

    private const VALID_INTENTS = ['communication', 'procedure', 'creative', 'analysis', 'meeting', 'generic'];

    /**
     * @return array{intent: string, hint: ?string, confidence: ?string, cached: bool, ready_to_use: ?array, missing_info_requests: array, steps: array, checklist: array, blockers: array, next_step: ?string, roadmap: array}
     */
    public function getBrief(CrmProjectTask $task, CrmProject $project, User $user): array
    {
        $contextHash = $this->buildContextHash($task);

        $cached = TaskAiBrief::where('crm_project_task_id', $task->id)
            ->where('context_hash', $contextHash)
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();

        if ($cached && is_array($cached->brief_json)) {
            return array_merge($this->normalizeBrief($cached->brief_json), ['cached' => true]);
        }

        $generated = $this->generateBrief($task, $project, $user);

        if ($generated !== null) {
            TaskAiBrief::create([
                'crm_project_task_id' => $task->id,
                'brief_json' => $generated,
                'context_hash' => $contextHash,
                'expires_at' => now()->addHours(self::BRIEF_TTL_H),
            ]);

            return array_merge($this->normalizeBrief($generated), ['cached' => false]);
        }

        return $this->emptyBrief();
    }

    /**
     * @return array{answer: string, sources: array}
     */
    public function ask(CrmProjectTask $task, CrmProject $project, User $user, string $question): array
    {
        $question = trim($question);
        if ($question === '') {
            return ['answer' => 'Inserisci una domanda.', 'sources' => []];
        }

        $context = $this->buildTaskContext($task, $project);
        $prompt = <<<PROMPT
Sei un assistente discreto per task di progetto. Rispondi in italiano, in modo conciso e pratico.
Usa SOLO il contesto fornito. Se non sai, dillo brevemente.

CONTESTO:
{$context}

DOMANDA UTENTE ({$user->name}):
{$question}

Rispondi in JSON:
{
  "answer": "risposta breve e utile",
  "sources": ["elemento contesto usato"]
}
PROMPT;

        $decoded = $this->callGroq($prompt);

        if ($decoded === null || empty($decoded['answer'])) {
            return [
                'answer' => 'Al momento non riesco a rispondere. Riprova tra poco.',
                'sources' => [],
            ];
        }

        return [
            'answer' => (string) $decoded['answer'],
            'sources' => is_array($decoded['sources'] ?? null) ? $decoded['sources'] : [],
        ];
    }

    private function generateBrief(CrmProjectTask $task, CrmProject $project, User $user): ?array
    {
        $context = $this->buildTaskContext($task, $project);

        $prompt = <<<PROMPT
Sei un assistente AI esperto per task di progetto. Restituisci SOLO JSON valido, senza testo aggiuntivo.

REGOLA FONDAMENTALE: Analizza il tipo di task (intent) e rispondi con la struttura JSON appropriata per quell'intent.
Se la task riguarda scrivere o inviare un messaggio/email/comunicazione, NON generare una checklist: scrivi la bozza effettiva.

CONTESTO TASK:
{$context}

UTENTE: {$user->name}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — CLASSIFICAZIONE INTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scegli l'intent corretto:
- "communication" → scrivere/inviare un messaggio, email, risposta, contattare un cliente o fornitore
- "procedure"     → eseguire passi tecnici o procedurali
- "creative"      → creare contenuto, design, materiale o presentazioni
- "analysis"      → ricerca, analisi, revisione o audit
- "meeting"       → call, riunione, presentazione da preparare
- "generic"       → tutto il resto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — RISPOSTA BASATA SULL'INTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se intent = "communication":
IMPORTANTE: Scrivi la bozza reale del messaggio o email in italiano, tono professionale, pronta da copiare.
Se il nome del cliente non è disponibile nel contesto, usa "[Nome Cliente]" come placeholder.
Se mancano informazioni essenziali per personalizzare il messaggio, elencale in missing_info_requests e includi missing_info nella ready_to_use.
Firma con il nome PM del progetto, oppure "Il Team Backclub / Backsoftware" come fallback.

{
  "intent": "communication",
  "hint": "una riga riassuntiva di cosa fa questa bozza",
  "confidence": "high",
  "ready_to_use": {
    "type": "email",
    "subject": "Oggetto dell'email (solo per email)",
    "body": "Testo completo del messaggio/email in italiano, professionale, pronto da copiare.\n\nCordiali saluti,\n[Nome PM / Il Team Backclub]",
    "variables_used": ["nome_cliente"],
    "missing_info": []
  },
  "missing_info_requests": []
}

Se mancano info essenziali per la communication:
{
  "intent": "communication",
  "hint": "...",
  "confidence": "low",
  "ready_to_use": null,
  "missing_info_requests": [
    {"field": "client_name", "question": "Come si chiama il cliente?", "type": "text"},
    {"field": "project_detail", "question": "Qual è il dettaglio specifico da comunicare?", "type": "text"}
  ]
}

Se intent = "procedure" o "creative" o "meeting":
{
  "intent": "procedure",
  "hint": "...",
  "confidence": "high|medium|low",
  "steps": [
    {"step": 1, "action": "Azione concreta", "why": "Perché è importante", "effort": "low|medium|high"}
  ]
}

Se intent = "analysis":
{
  "intent": "analysis",
  "hint": "...",
  "confidence": "high|medium|low",
  "checklist": [
    {"id": "c1", "label": "Cosa verificare", "category": "quality|delivery|communication|technical"}
  ]
}

Se intent = "generic":
{
  "intent": "generic",
  "hint": "...",
  "confidence": "high|medium|low",
  "next_step": "La singola azione più urgente da fare adesso"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGOLE FINALI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Per qualsiasi task che menzioni "scrivi", "invia", "manda", "contatta", "messaggio", "email", "risposta": usa SEMPRE intent "communication" e scrivi la bozza effettiva
- steps: 3-5 passi ordinati per procedure/creative/meeting
- checklist: 3-6 elementi per analysis
- confidence: "high" se contesto chiaro, "medium" se parziale, "low" se scarso
- Non inventare informazioni assenti dal contesto
PROMPT;

        $decoded = $this->callGroq($prompt);

        if ($decoded === null) {
            return null;
        }

        return $this->normalizeBrief($decoded);
    }

    private function buildTaskContext(CrmProjectTask $task, CrmProject $project): string
    {
        $task->loadMissing([
            'assignments.user:id,name',
            'subtasks:id,parent_task_id,title,status,progress',
            'comments' => fn ($q) => $q->orderByDesc('created_at')->limit(3)->with('user:id,name'),
            'events' => fn ($q) => $q->orderByDesc('created_at')->limit(5)->with('user:id,name'),
        ]);

        $assignees = $task->assignments
            ->where('is_active', true)
            ->map(fn ($a) => $a->user?->name ?? 'Utente')
            ->implode(', ');

        $recentComments = $task->comments
            ->map(fn ($c) => ($c->user?->name ?? 'Utente') . ': ' . mb_substr($c->comment, 0, 200))
            ->implode("\n");

        $recentEvents = $task->events
            ->map(fn ($e) => ($e->description ?? $e->event_type) . ' (' . optional($e->created_at)->format('d/m H:i') . ')')
            ->implode("\n");

        $subtasks = $task->subtasks
            ->map(fn ($s) => "- [{$s->status}] {$s->title} ({$s->progress}%)")
            ->implode("\n");

        $clientName = $project->client_name ?? $project->contact_name ?? null;

        return implode("\n", array_filter([
            "Progetto: {$project->name}",
            $clientName ? "Cliente: {$clientName}" : null,
            "Task: {$task->title}",
            "Stato: {$task->status}",
            "Priorità: {$task->priority}",
            "Scadenza: " . ($task->due_date?->format('Y-m-d') ?? 'non definita'),
            "Progresso: {$task->progress}%",
            "Assegnatari (PM): " . ($assignees ?: 'nessuno'),
            "Descrizione: " . mb_substr((string) ($task->description ?? ''), 0, 800),
            "Note lavoro: " . mb_substr((string) ($task->work_notes ?? ''), 0, 500),
            $subtasks ? "Subtask:\n{$subtasks}" : null,
            $recentComments ? "Ultimi commenti:\n{$recentComments}" : null,
            $recentEvents ? "Eventi recenti:\n{$recentEvents}" : null,
        ]));
    }

    private function buildContextHash(CrmProjectTask $task): string
    {
        $payload = [
            'status' => $task->status,
            'progress' => $task->progress,
            'due_date' => optional($task->due_date)->toDateString(),
            'description' => mb_substr((string) ($task->description ?? ''), 0, 500),
            'work_notes' => mb_substr((string) ($task->work_notes ?? ''), 0, 300),
            'updated_at' => optional($task->updated_at)->toIso8601String(),
        ];

        return hash('sha256', json_encode($payload));
    }

    /**
     * Normalizes raw LLM output into a consistent shape regardless of intent.
     *
     * @param array<string, mixed> $raw
     * @return array{intent: string, hint: ?string, confidence: ?string, ready_to_use: ?array, missing_info_requests: array, steps: array, checklist: array, blockers: array, next_step: ?string, roadmap: array}
     */
    private function normalizeBrief(array $raw): array
    {
        $intent = isset($raw['intent']) && in_array($raw['intent'], self::VALID_INTENTS, true)
            ? $raw['intent']
            : 'generic';

        $hint = isset($raw['hint']) && is_string($raw['hint']) && trim($raw['hint']) !== ''
            ? trim($raw['hint'])
            : null;

        $confidence = isset($raw['confidence']) && in_array($raw['confidence'], ['high', 'medium', 'low'], true)
            ? $raw['confidence']
            : null;

        $nextStep = isset($raw['next_step']) && is_string($raw['next_step']) && trim($raw['next_step']) !== ''
            ? trim($raw['next_step'])
            : null;

        // ── communication: ready_to_use ──────────────────────────────────────
        $readyToUse = null;
        if (isset($raw['ready_to_use']) && is_array($raw['ready_to_use'])) {
            $ru = $raw['ready_to_use'];
            $ruType = in_array($ru['type'] ?? null, ['email', 'message', 'whatsapp'], true)
                ? $ru['type']
                : 'message';
            $readyToUse = [
                'type'           => $ruType,
                'subject'        => is_string($ru['subject'] ?? null) ? trim($ru['subject']) : null,
                'body'           => is_string($ru['body'] ?? null) ? trim($ru['body']) : '',
                'variables_used' => is_array($ru['variables_used'] ?? null) ? $ru['variables_used'] : [],
                'missing_info'   => is_array($ru['missing_info'] ?? null) ? $ru['missing_info'] : [],
            ];
        }

        // ── communication: missing_info_requests ─────────────────────────────
        $missingInfoRequests = [];
        if (isset($raw['missing_info_requests']) && is_array($raw['missing_info_requests'])) {
            foreach ($raw['missing_info_requests'] as $req) {
                if (!is_array($req)) continue;
                $missingInfoRequests[] = [
                    'field'    => is_string($req['field'] ?? null) ? $req['field'] : 'info',
                    'question' => is_string($req['question'] ?? null) ? trim($req['question']) : '',
                    'type'     => in_array($req['type'] ?? null, ['text', 'select'], true) ? $req['type'] : 'text',
                ];
            }
        }

        // ── procedure / creative / meeting: steps ────────────────────────────
        $steps = [];
        $stepsRaw = $raw['steps'] ?? [];
        if (!is_array($stepsRaw)) $stepsRaw = [];
        foreach ($stepsRaw as $i => $step) {
            if (!is_array($step)) continue;
            $steps[] = [
                'step'   => (int) ($step['step'] ?? $i + 1),
                'action' => is_string($step['action'] ?? null) ? trim($step['action']) : '',
                'why'    => is_string($step['why'] ?? null) ? trim($step['why']) : '',
                'effort' => in_array($step['effort'] ?? null, ['low', 'medium', 'high'], true) ? $step['effort'] : 'medium',
                'status' => in_array($step['status'] ?? null, ['todo', 'doing', 'done'], true) ? $step['status'] : 'todo',
            ];
        }

        // ── analysis: checklist ──────────────────────────────────────────────
        $checklist = [];
        if (isset($raw['checklist']) && is_array($raw['checklist'])) {
            $validCategories = ['quality', 'delivery', 'communication', 'technical'];
            foreach ($raw['checklist'] as $i => $item) {
                if (!is_array($item)) continue;
                $checklist[] = [
                    'id'       => is_string($item['id'] ?? null) ? $item['id'] : 'c' . ($i + 1),
                    'label'    => is_string($item['label'] ?? null) ? trim($item['label']) : '',
                    'category' => in_array($item['category'] ?? null, $validCategories, true) ? $item['category'] : 'quality',
                ];
            }
        }

        // ── blockers (legacy + procedure) ────────────────────────────────────
        $blockers = [];
        if (isset($raw['blockers']) && is_array($raw['blockers'])) {
            foreach ($raw['blockers'] as $b) {
                if (is_string($b) && trim($b) !== '') {
                    $blockers[] = ['message' => trim($b), 'severity' => 'medium'];
                } elseif (is_array($b) && isset($b['message']) && is_string($b['message'])) {
                    $blockers[] = [
                        'message'  => trim($b['message']),
                        'severity' => in_array($b['severity'] ?? null, ['high', 'medium', 'low'], true) ? $b['severity'] : 'medium',
                    ];
                }
            }
        }

        // ── roadmap (legacy fallback — kept for cached old responses) ────────
        $roadmap = [];
        if (isset($raw['roadmap']) && is_array($raw['roadmap'])) {
            foreach ($raw['roadmap'] as $i => $step) {
                if (!is_array($step)) continue;
                $roadmap[] = [
                    'step'   => (int) ($step['step'] ?? $i + 1),
                    'action' => is_string($step['action'] ?? null) ? trim($step['action']) : '',
                    'why'    => is_string($step['why'] ?? null) ? trim($step['why']) : '',
                    'effort' => in_array($step['effort'] ?? null, ['low', 'medium', 'high'], true) ? $step['effort'] : 'medium',
                    'status' => in_array($step['status'] ?? null, ['todo', 'doing', 'done'], true) ? $step['status'] : 'todo',
                ];
            }
        }

        return [
            'intent'               => $intent,
            'hint'                 => $hint,
            'confidence'           => $confidence,
            'ready_to_use'         => $readyToUse,
            'missing_info_requests' => $missingInfoRequests,
            'steps'                => $steps,
            'checklist'            => $checklist,
            'blockers'             => $blockers,
            'next_step'            => $nextStep,
            'roadmap'              => $roadmap,
        ];
    }

    /**
     * @return array{intent: string, hint: ?string, confidence: ?string, ready_to_use: ?array, missing_info_requests: array, steps: array, checklist: array, blockers: array, next_step: ?string, roadmap: array, cached: bool}
     */
    private function emptyBrief(): array
    {
        return array_merge($this->normalizeBrief([]), ['cached' => false]);
    }

    private function callGroq(string $prompt): ?array
    {
        $apiKey = config('services.groq.api_key');

        if (empty($apiKey)) {
            Log::warning('TaskDetailAiService: no GROQ API key configured.');
            return null;
        }

        $response = Http::timeout(self::LLM_TIMEOUT_S)
            ->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])
            ->post(self::GROQ_API_URL, [
                'model'    => self::MODEL,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature'     => 0.4,
                'max_tokens'      => 1500,
                'response_format' => ['type' => 'json_object'],
            ]);

        if ($response->failed()) {
            Log::warning('TaskDetailAiService: Groq API error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return null;
        }

        $rawContent = $response->json('choices.0.message.content');

        if (empty($rawContent)) {
            return null;
        }

        $decoded = json_decode($rawContent, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('TaskDetailAiService: invalid JSON from LLM', ['raw' => $rawContent]);
            return null;
        }

        return $decoded;
    }
}
