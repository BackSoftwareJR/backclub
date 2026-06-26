<?php

namespace App\Services\OrganicWeb;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrganicAiService
{
    private const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL = 'llama-3.3-70b-versatile';
    private const TIMEOUT_S = 60;
    private const MAX_TOKENS = 4096;

    /**
     * Genera keyword seed da topic e nicchia.
     *
     * @return array{keywords: array, long_tail: array, questions: array}
     */
    public function generateKeywordSeed(
        string $website,
        string $niche,
        array $topics,
        string $language = 'it'
    ): array {
        $topicsStr = implode(', ', $topics);

        $prompt = <<<PROMPT
Sei un esperto SEO specializzato in keyword research per il mercato italiano.
Analizza i topic forniti e genera una lista di keyword pertinenti.

SITO: {$website}
NICCHIA: {$niche}
TOPIC PRINCIPALI: {$topicsStr}
LINGUA: {$language}

Genera keyword organizzate in tre categorie. Rispondi SOLO in JSON valido:
{
  "keywords": ["keyword principale 1", "keyword principale 2", ...],
  "long_tail": ["keyword long tail 1", "keyword long tail 2", ...],
  "questions": ["domanda frequente 1", "domanda frequente 2", ...]
}

REGOLE:
- "keywords": 15-20 keyword principali ad alto volume, coerenti con la nicchia
- "long_tail": 20-30 keyword long-tail più specifiche e conversazionali
- "questions": 10-15 domande che gli utenti potrebbero cercare (inizia con Come, Cosa, Perché, Quanto, Quale)
- Tutte le keyword devono essere in lingua: {$language}
- Prioritizza intenzione di ricerca informazionale e commerciale
PROMPT;

        $result = $this->callGroq($prompt, 0.5);

        if (!$result) {
            return ['keywords' => [], 'long_tail' => [], 'questions' => []];
        }

        return [
            'keywords'  => is_array($result['keywords'] ?? null) ? $result['keywords'] : [],
            'long_tail' => is_array($result['long_tail'] ?? null) ? $result['long_tail'] : [],
            'questions' => is_array($result['questions'] ?? null) ? $result['questions'] : [],
        ];
    }

    /**
     * Clusterizza e prioritizza keyword da input array.
     *
     * @param  array<array{keyword: string, volume: int, difficulty: int|null}> $rawKeywords
     * @return array{clusters: array}
     */
    public function clusterKeywords(array $rawKeywords, string $niche): array
    {
        if (empty($rawKeywords)) {
            return ['clusters' => []];
        }

        $keywordsJson = json_encode(array_slice($rawKeywords, 0, 200), JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
Sei un esperto SEO. Clusterizza le keyword fornite in gruppi tematici coerenti.

NICCHIA: {$niche}
KEYWORD DA CLUSTERIZZARE (JSON):
{$keywordsJson}

Raggruppa le keyword in cluster tematici. Ogni cluster deve avere:
- Un nome descrittivo
- L'intento di ricerca prevalente
- Le keyword appartenenti al cluster

Rispondi SOLO in JSON valido:
{
  "clusters": [
    {
      "name": "Nome cluster tematico",
      "intent": "informational",
      "priority": "high",
      "keywords": [
        {"keyword": "...", "volume": 1000, "difficulty": 30}
      ]
    }
  ]
}

REGOLE:
- "intent" deve essere uno tra: "informational", "transactional", "navigational", "commercial"
- "priority" deve essere uno tra: "high", "medium", "low" (basato su volume/opportunity)
- Crea 3-8 cluster significativi, non troppi piccoli cluster
- Ordina i cluster per priorità (high prima)
PROMPT;

        $result = $this->callGroq($prompt, 0.3);

        if (!$result) {
            return ['clusters' => []];
        }

        return [
            'clusters' => is_array($result['clusters'] ?? null) ? $result['clusters'] : [],
        ];
    }

    /**
     * Genera piano editoriale mensile.
     *
     * @return array{posts: array}
     */
    public function generateEditorialPlan(
        array $keywordClusters,
        int $postsCount,
        string $toneOfVoice,
        string $audience
    ): array {
        $clustersJson = json_encode($keywordClusters, JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
Sei un editor content strategist specializzato in SEO. Genera un piano editoriale mensile.

CLUSTER KEYWORD APPROVATI:
{$clustersJson}

NUMERO DI POST DA PIANIFICARE: {$postsCount}
TONO DI VOCE: {$toneOfVoice}
TARGET AUDIENCE: {$audience}

Crea un piano editoriale mensile con {$postsCount} articoli. Rispondi SOLO in JSON valido:
{
  "posts": [
    {
      "title": "Titolo SEO-ottimizzato dell'articolo",
      "target_keyword": "keyword principale",
      "secondary_keywords": ["kw secondaria 1", "kw secondaria 2"],
      "cluster": "nome del cluster di appartenenza",
      "intent": "informational",
      "outline": [
        "Introduzione: ...",
        "H2: Sezione principale 1",
        "H2: Sezione principale 2",
        "Conclusione"
      ],
      "scheduled_day": 5,
      "estimated_word_count": 1500,
      "notes": "Note editoriali opzionali"
    }
  ]
}

REGOLE:
- Titoli ottimizzati SEO, accattivanti e coerenti con il tono di voce
- "scheduled_day" deve essere compreso tra 1 e 28
- Distribuisci i post uniformemente nel mese
- "outline" deve avere 4-6 punti con H2 chiari e utili
- Ogni post deve targetizzare una keyword primaria diversa
PROMPT;

        $result = $this->callGroq($prompt, 0.5);

        if (!$result) {
            return ['posts' => []];
        }

        return [
            'posts' => is_array($result['posts'] ?? null) ? $result['posts'] : [],
        ];
    }

    /**
     * Scrive un post SEO completo.
     *
     * @return array{content: string, meta_title: string, meta_description: string, word_count: int}
     */
    public function writePost(
        string $title,
        string $targetKeyword,
        array $secondaryKeywords,
        string $toneOfVoice,
        string $audience,
        string $language = 'it'
    ): array {
        $secondaryKwStr = implode(', ', array_slice($secondaryKeywords, 0, 8));

        $prompt = <<<PROMPT
Sei un copywriter SEO esperto. Scrivi un articolo blog completo e ottimizzato per i motori di ricerca.

TITOLO: {$title}
KEYWORD PRINCIPALE: {$targetKeyword}
KEYWORD SECONDARIE: {$secondaryKwStr}
TONO DI VOCE: {$toneOfVoice}
TARGET AUDIENCE: {$audience}
LINGUA: {$language}

Scrivi l'articolo completo. Rispondi SOLO in JSON valido:
{
  "content": "contenuto HTML completo dell'articolo con tag H1, H2, H3, paragrafi, liste",
  "meta_title": "Title tag SEO ottimizzato (max 60 caratteri)",
  "meta_description": "Meta description ottimizzata (max 160 caratteri) con call to action",
  "word_count": 1500
}

REGOLE per il content HTML:
- Inizia con <h1>{$title}</h1>
- Usa H2 per le sezioni principali (almeno 4-5)
- Usa H3 per sottosezioni dove utile
- Paragrafi di massimo 4-5 righe
- Usa <ul> e <li> per liste dove pertinente
- Inserisci la keyword principale nel primo paragrafo, nei titoli H2 rilevanti e nella conclusione
- Usa le keyword secondarie in modo naturale nel testo
- Minimo 1200 parole, ideale 1500-2000 parole
- Tono: {$toneOfVoice}
- Target: {$audience}
- Lingua: {$language}
- Concludi con un paragrafo di call to action
PROMPT;

        $result = $this->callGroq($prompt, 0.6, 6000);

        if (!$result) {
            return [
                'content'          => '',
                'meta_title'       => $title,
                'meta_description' => '',
                'word_count'       => 0,
            ];
        }

        return [
            'content'          => is_string($result['content'] ?? null) ? $result['content'] : '',
            'meta_title'       => is_string($result['meta_title'] ?? null) ? $result['meta_title'] : $title,
            'meta_description' => is_string($result['meta_description'] ?? null) ? $result['meta_description'] : '',
            'word_count'       => is_int($result['word_count'] ?? null) ? $result['word_count'] : str_word_count(strip_tags($result['content'] ?? '')),
        ];
    }

    /**
     * Ottimizza un post esistente incorporando feedback.
     *
     * @param  string[] $issues
     * @return array{content: string, changes_summary: string, seo_score: int}
     */
    public function optimizePost(string $content, string $targetKeyword, array $issues): array
    {
        $issuesStr = implode("\n- ", $issues);
        $truncatedContent = mb_substr($content, 0, 8000);

        $prompt = <<<PROMPT
Sei un copywriter SEO esperto. Ottimizza il post esistente incorporando il feedback ricevuto.

KEYWORD PRINCIPALE: {$targetKeyword}

PROBLEMI DA CORREGGERE / FEEDBACK:
- {$issuesStr}

CONTENUTO ORIGINALE:
{$truncatedContent}

Ottimizza il contenuto. Rispondi SOLO in JSON valido:
{
  "content": "contenuto HTML ottimizzato completo",
  "changes_summary": "Breve descrizione delle modifiche apportate",
  "seo_score": 78
}

REGOLE:
- Correggi tutti i problemi elencati
- Mantieni lo stile e il tono originale
- Ottimizza la densità della keyword principale: {$targetKeyword}
- "seo_score" è un numero da 0 a 100 (stima del miglioramento SEO)
- "changes_summary" deve elencare le 3-5 modifiche principali
PROMPT;

        $result = $this->callGroq($prompt, 0.4, 6000);

        if (!$result) {
            return [
                'content'         => $content,
                'changes_summary' => 'Ottimizzazione non riuscita.',
                'seo_score'       => 0,
            ];
        }

        return [
            'content'         => is_string($result['content'] ?? null) ? $result['content'] : $content,
            'changes_summary' => is_string($result['changes_summary'] ?? null) ? $result['changes_summary'] : '',
            'seo_score'       => is_int($result['seo_score'] ?? null) ? min(100, max(0, $result['seo_score'])) : 0,
        ];
    }

    /**
     * Analizza risultati crawl SEO e produce un report strutturato.
     *
     * @return array{overall_score: int, issues: array}
     */
    public function analyzeSeoAudit(array $crawlData): array
    {
        $crawlJson = json_encode(array_slice($crawlData, 0, 100), JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
Sei un esperto SEO tecnico. Analizza i dati di crawl del sito e identifica problemi SEO.

DATI DI CRAWL (prime 100 pagine):
{$crawlJson}

Analizza e produci un report strutturato. Rispondi SOLO in JSON valido:
{
  "overall_score": 72,
  "issues": [
    {
      "type": "missing_meta_description",
      "severity": "critical",
      "count": 15,
      "pages": ["https://sito.it/pagina1", "https://sito.it/pagina2"],
      "recommendation": "Aggiungi meta description uniche per ogni pagina"
    }
  ],
  "summary": "Breve riassunto dello stato SEO del sito"
}

TIPI DI PROBLEMI da identificare:
- missing_meta_description: pagine senza meta description
- duplicate_title: titoli duplicati tra pagine
- missing_h1: pagine senza H1
- multiple_h1: pagine con più H1
- images_without_alt: immagini senza attributo alt
- broken_links: link interni rotti (status >= 400)
- non_indexable: pagine con noindex o in robots
- missing_canonical: pagine senza canonical tag
- slow_pages: pagine con tempo di caricamento elevato
- thin_content: pagine con contenuto insufficiente

Per ogni problema: "severity" è uno tra "critical", "warning", "info"
"overall_score" è da 0 a 100 (100 = perfetto)
PROMPT;

        $result = $this->callGroq($prompt, 0.2);

        if (!$result) {
            return ['overall_score' => 0, 'issues' => [], 'summary' => ''];
        }

        return [
            'overall_score' => is_int($result['overall_score'] ?? null) ? min(100, max(0, $result['overall_score'])) : 0,
            'issues'        => is_array($result['issues'] ?? null) ? $result['issues'] : [],
            'summary'       => is_string($result['summary'] ?? null) ? $result['summary'] : '',
        ];
    }

    /**
     * Analizza dati GSC (CSV parsed) e identifica opportunità.
     *
     * @return array{top_opportunities: array, declining_keywords: array, quick_wins: array, summary: string}
     */
    public function analyzeGscData(array $gscData, string $siteContext): array
    {
        $gscJson = json_encode(array_slice($gscData, 0, 200), JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
Sei un esperto di SEO analytics. Analizza i dati di Google Search Console e identifica opportunità di crescita.

CONTESTO SITO: {$siteContext}

DATI GSC (query, click, impressioni, CTR, posizione):
{$gscJson}

Analizza i dati e produci insights. Rispondi SOLO in JSON valido:
{
  "top_opportunities": [
    {
      "keyword": "keyword con opportunità",
      "current_position": 12,
      "impressions": 5000,
      "clicks": 120,
      "ctr": 2.4,
      "opportunity": "Descrizione dell'opportunità specifica"
    }
  ],
  "declining_keywords": [
    {
      "keyword": "keyword in calo",
      "current_position": 25,
      "trend": "declining",
      "recommendation": "Cosa fare per recuperare"
    }
  ],
  "quick_wins": [
    {
      "keyword": "quick win keyword",
      "action": "Azione specifica da intraprendere",
      "expected_impact": "Impatto atteso"
    }
  ],
  "summary": "Riassunto esecutivo dell'analisi in 3-4 frasi"
}

CRITERI:
- "top_opportunities": keyword in posizione 4-20 con molte impressioni ma CTR basso (pagina 2 SERP vicino alla 1)
- "declining_keywords": keyword con posizione in peggioramento o CTR molto basso
- "quick_wins": azioni rapide con alto impatto potenziale
- Limite: max 10 elementi per categoria
PROMPT;

        $result = $this->callGroq($prompt, 0.3);

        if (!$result) {
            return [
                'top_opportunities'   => [],
                'declining_keywords'  => [],
                'quick_wins'          => [],
                'summary'             => '',
            ];
        }

        return [
            'top_opportunities'   => is_array($result['top_opportunities'] ?? null) ? $result['top_opportunities'] : [],
            'declining_keywords'  => is_array($result['declining_keywords'] ?? null) ? $result['declining_keywords'] : [],
            'quick_wins'          => is_array($result['quick_wins'] ?? null) ? $result['quick_wins'] : [],
            'summary'             => is_string($result['summary'] ?? null) ? $result['summary'] : '',
        ];
    }

    /**
     * Genera report mensile GSC in formato HTML/markdown.
     */
    public function generateGscReport(array $analysis, string $projectName): string
    {
        $analysisJson = json_encode($analysis, JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
Sei un consulente SEO. Genera un report mensile professionale da presentare al cliente.

PROGETTO: {$projectName}
DATI DI ANALISI:
{$analysisJson}

Genera un report mensile in HTML. Rispondi SOLO in JSON valido:
{
  "report_html": "HTML completo del report mensile"
}

STRUTTURA DEL REPORT HTML:
<h1>Report SEO Mensile - {$projectName}</h1>
<h2>Executive Summary</h2>
[riassunto in 3-4 punti chiave]
<h2>Performance Principali</h2>
[tabella o lista delle metriche chiave]
<h2>Top Opportunità del Mese</h2>
[lista delle opportunità prioritarie]
<h2>Keyword in Calo - Azioni Consigliate</h2>
[lista con azioni specifiche]
<h2>Quick Wins Implementabili</h2>
[lista azioni rapide]
<h2>Prossimi Passi</h2>
[piano d'azione per il mese successivo]

Usa un tono professionale, orientato al business. Includi dati concreti. Max 1000 parole.
PROMPT;

        $result = $this->callGroq($prompt, 0.4, 3000);

        if (!$result || empty($result['report_html'])) {
            return '<p>Report non disponibile.</p>';
        }

        return is_string($result['report_html']) ? $result['report_html'] : '<p>Report non disponibile.</p>';
    }

    /**
     * Analizza gap SERP per content refresh.
     *
     * @param  string[] $serpTitles
     * @return array{missing_topics: array, weak_sections: array, suggested_additions: array}
     */
    public function analyzeContentGap(
        string $currentContent,
        string $targetKeyword,
        array $serpTitles
    ): array {
        $serpStr = implode("\n- ", array_slice($serpTitles, 0, 10));
        $truncatedContent = mb_substr($currentContent, 0, 5000);

        $prompt = <<<PROMPT
Sei un content strategist SEO. Analizza il gap tra il contenuto attuale e i competitor in SERP.

KEYWORD TARGET: {$targetKeyword}

TITOLI COMPETITOR IN SERP (top 10):
- {$serpStr}

CONTENUTO ATTUALE:
{$truncatedContent}

Identifica i gap di contenuto. Rispondi SOLO in JSON valido:
{
  "missing_topics": [
    {
      "topic": "Argomento mancante",
      "importance": "high",
      "reason": "Perché è importante aggiungerlo"
    }
  ],
  "weak_sections": [
    {
      "section": "Sezione da migliorare",
      "issue": "Problema specifico",
      "suggestion": "Come migliorarla"
    }
  ],
  "suggested_additions": [
    {
      "type": "section",
      "title": "Titolo della sezione da aggiungere",
      "content_hint": "Cosa dovrebbe contenere"
    }
  ]
}

CRITERI:
- "missing_topics": argomenti presenti nei competitor ma assenti nel contenuto attuale
- "weak_sections": sezioni presenti ma superficiali o incomplete
- "suggested_additions": aggiunte concrete che migliorerebbero il ranking
- "importance" è uno tra: "high", "medium", "low"
PROMPT;

        $result = $this->callGroq($prompt, 0.3);

        if (!$result) {
            return [
                'missing_topics'     => [],
                'weak_sections'      => [],
                'suggested_additions' => [],
            ];
        }

        return [
            'missing_topics'      => is_array($result['missing_topics'] ?? null) ? $result['missing_topics'] : [],
            'weak_sections'       => is_array($result['weak_sections'] ?? null) ? $result['weak_sections'] : [],
            'suggested_additions' => is_array($result['suggested_additions'] ?? null) ? $result['suggested_additions'] : [],
        ];
    }

    /**
     * Riscrivi/aggiorna sezioni obsolete del contenuto.
     *
     * @return array{updated_content: string, changelog: string}
     */
    public function refreshContent(string $content, array $suggestedAdditions, string $targetKeyword): array
    {
        $additionsJson = json_encode($suggestedAdditions, JSON_UNESCAPED_UNICODE);
        $truncatedContent = mb_substr($content, 0, 6000);

        $prompt = <<<PROMPT
Sei un copywriter SEO esperto. Aggiorna il contenuto esistente incorporando le aggiunte suggerite.

KEYWORD TARGET: {$targetKeyword}

AGGIUNTE SUGGERITE:
{$additionsJson}

CONTENUTO ATTUALE:
{$truncatedContent}

Aggiorna il contenuto. Rispondi SOLO in JSON valido:
{
  "updated_content": "HTML completo del contenuto aggiornato",
  "changelog": "Elenco delle modifiche apportate"
}

REGOLE:
- Incorpora tutte le aggiunte suggerite in modo naturale
- Mantieni il tono e lo stile originale
- Ottimizza la keyword: {$targetKeyword}
- Aggiorna eventuali informazioni obsolete
- "changelog" deve elencare le 3-6 modifiche principali apportate
PROMPT;

        $result = $this->callGroq($prompt, 0.4, 6000);

        if (!$result) {
            return [
                'updated_content' => $content,
                'changelog'       => 'Aggiornamento non riuscito.',
            ];
        }

        return [
            'updated_content' => is_string($result['updated_content'] ?? null) ? $result['updated_content'] : $content,
            'changelog'       => is_string($result['changelog'] ?? null) ? $result['changelog'] : '',
        ];
    }

    // ─────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────

    private function callGroq(string $prompt, float $temperature = 0.4, ?int $maxTokens = null): ?array
    {
        $apiKey = config('services.groq.api_key');

        if (empty($apiKey)) {
            Log::warning('[OrganicAiService] GROQ_API_KEY non configurata.');
            return null;
        }

        $maxTokens = $maxTokens ?? self::MAX_TOKENS;

        try {
            $response = Http::timeout(self::TIMEOUT_S)
                ->withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type'  => 'application/json',
                ])
                ->post(self::GROQ_API_URL, [
                    'model'    => self::MODEL,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature'     => $temperature,
                    'max_tokens'      => $maxTokens,
                    'response_format' => ['type' => 'json_object'],
                ]);

            if ($response->failed()) {
                Log::warning('[OrganicAiService] Groq API error', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;
            }

            $rawContent = $response->json('choices.0.message.content');

            if (empty($rawContent)) {
                Log::warning('[OrganicAiService] Risposta Groq vuota.');
                return null;
            }

            $decoded = json_decode($rawContent, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('[OrganicAiService] JSON non valido da LLM', ['raw' => mb_substr($rawContent, 0, 500)]);
                return null;
            }

            return $decoded;
        } catch (\Throwable $e) {
            Log::error('[OrganicAiService] Eccezione durante chiamata Groq', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Suggerisce un tono di voce adatto al sito.
     */
    public function suggestToneOfVoice(string $websiteUrl, string $projectName, string $language = 'it'): string
    {
        $prompt = "Sei un esperto di content marketing. Analizza questo sito: {$websiteUrl} (Progetto: {$projectName}).
Scrivi un tono di voce efficace per i contenuti blog in lingua {$language}.
Rispondi con 2-3 frasi che descrivono il tono: formale/informale, con esempi di parole chiave da usare o evitare.
Solo il testo del tono di voce, nessun altro commento.";

        return $this->callGroqRaw($prompt) ?? 'Professionale e diretto, con linguaggio chiaro e orientato ai risultati.';
    }

    /**
     * Suggerisce il target audience per il progetto.
     */
    public function suggestTargetAudience(string $websiteUrl, string $projectName, string $existingKeywords = ''): string
    {
        $kwHint = $existingKeywords ? " Keyword già note: {$existingKeywords}." : '';
        $prompt = "Sei un esperto di digital marketing. Analizza questo sito: {$websiteUrl} (Progetto: {$projectName}).{$kwHint}
Descrivi il target audience ideale per i contenuti blog: chi sono, quali problemi hanno, cosa cercano online.
Rispondi con 2-3 frasi concise e specifiche. Solo il testo, nessun altro commento.";

        return $this->callGroqRaw($prompt) ?? 'Professionisti e aziende interessati ad approfondire il tema principale del sito.';
    }

    /**
     * Suggerisce keyword target per il progetto.
     * Ritorna array di stringhe.
     */
    public function suggestKeywords(string $websiteUrl, string $projectName, string $language = 'it'): array
    {
        $prompt = "Sei un esperto SEO. Analizza questo sito: {$websiteUrl} (Progetto: {$projectName}).
Suggerisci 10 keyword target principali per i contenuti blog in lingua {$language}.
Rispondi SOLO con un array JSON di stringhe, senza altri commenti. Esempio: [\"keyword1\", \"keyword2\"]";

        $raw = $this->callGroqRaw($prompt);
        if (!$raw) return [];

        // estrai array JSON dalla risposta
        preg_match('/\[.*\]/s', $raw, $matches);
        if (empty($matches)) return [];

        $decoded = json_decode($matches[0], true);
        return is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
    }

    /**
     * Chiamata Groq che ritorna testo grezzo (non JSON strutturato).
     */
    private function callGroqRaw(string $userPrompt): ?string
    {
        try {
            $apiKey = config('services.groq.api_key');
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->timeout(30)->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'       => 'llama-3.3-70b-versatile',
                'messages'    => [['role' => 'user', 'content' => $userPrompt]],
                'temperature' => 0.7,
                'max_tokens'  => 400,
            ]);

            if (!$response->successful()) return null;
            return trim($response->json('choices.0.message.content') ?? '');
        } catch (\Throwable $e) {
            Log::error('[OrganicAiService] callGroqRaw error', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
