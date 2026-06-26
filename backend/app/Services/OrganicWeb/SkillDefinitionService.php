<?php

namespace App\Services\OrganicWeb;

class SkillDefinitionService
{
    public function getAllSkills(): array
    {
        return [
            $this->monthlyKeywordResearch(),
            $this->editorialPlan(),
            $this->writePost(),
            $this->seoTechnicalAudit(),
            $this->contentRefresh(),
            $this->seoInitialSetup(),
            $this->gscMonthlyReview(),
        ];
    }

    public function getSkillById(string $id): ?array
    {
        foreach ($this->getAllSkills() as $skill) {
            if ($skill['id'] === $id) {
                return $skill;
            }
        }
        return null;
    }

    public function getSkillIds(): array
    {
        return array_column($this->getAllSkills(), 'id');
    }

    // ─────────────────────────────────────────────────────
    // 1. MONTHLY KEYWORD RESEARCH
    // ─────────────────────────────────────────────────────
    private function monthlyKeywordResearch(): array
    {
        return [
            'id' => 'monthly_keyword_research',
            'name' => 'Ricerca Keyword Mensile',
            'category' => 'analysis',
            'trigger' => 'scheduled',
            'description' => 'Ricerca e clusterizzazione keyword mensile per pianificazione editoriale.',
            'steps' => [
                [
                    'key' => 'human_define_topics',
                    'type' => 'human',
                    'name' => 'Definisci topic e seed keyword',
                    'description' => 'Il team definisce i topic principali del mese e le seed keyword di partenza.',
                    'instructions' => 'Inserisci i topic principali del mese, le keyword seed e il contesto del progetto. Considera stagionalità, eventi e obiettivi del cliente.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'ai_generate_seed_list',
                    'type' => 'ai',
                    'name' => 'Genera lista keyword seed espansa',
                    'description' => 'AI espande le seed keyword con varianti, long-tail e correlate.',
                    'required_input_keys' => ['topics', 'seed_keywords', 'tone_of_voice', 'target_audience'],
                    'output_keys' => ['expanded_keywords', 'keyword_suggestions'],
                ],
                [
                    'key' => 'human_upload_volumes',
                    'type' => 'human',
                    'name' => 'Esporta e carica CSV volumi di ricerca',
                    'description' => 'L\'operatore esporta i volumi da Google Keyword Planner / Ahrefs e carica il CSV.',
                    'instructions' => '1. Prendi la lista keyword suggerita dall\'AI. 2. Inseriscila in Google Keyword Planner o Ahrefs. 3. Esporta il CSV con: keyword, volume mensile, difficoltà KD, CPC. 4. Carica il file CSV qui sotto.',
                    'requires_upload' => true,
                    'upload_instructions' => 'Carica il CSV esportato da Google Keyword Planner o Ahrefs. Formato atteso: keyword, volume, difficulty, cpc. Encoding: UTF-8.',
                ],
                [
                    'key' => 'ai_cluster_keywords',
                    'type' => 'ai',
                    'name' => 'Clusterizza keyword per intent',
                    'description' => 'AI raggruppa le keyword per cluster tematici e intento di ricerca.',
                    'required_input_keys' => ['csv_data', 'target_audience', 'tone_of_voice'],
                    'output_keys' => ['clustered_keywords', 'primary_cluster', 'search_intents'],
                ],
                [
                    'key' => 'human_approve_clusters',
                    'type' => 'human',
                    'name' => 'Approva cluster keyword',
                    'description' => 'Il team valida i cluster proposti dall\'AI e li approva o modifica.',
                    'instructions' => 'Revisiona i cluster keyword generati dall\'AI. Verifica che: (1) i cluster siano coerenti con il business del cliente, (2) l\'intento di ricerca sia corretto, (3) non ci siano keyword irrilevanti. Approva o lascia note per modifiche.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
            ],
        ];
    }

    // ─────────────────────────────────────────────────────
    // 2. EDITORIAL PLAN
    // ─────────────────────────────────────────────────────
    private function editorialPlan(): array
    {
        return [
            'id' => 'editorial_plan',
            'name' => 'Piano Editoriale Mensile',
            'category' => 'content',
            'trigger' => 'scheduled',
            'description' => 'Generazione e approvazione del piano editoriale mensile basato sui cluster keyword approvati.',
            'steps' => [
                [
                    'key' => 'ai_generate_titles',
                    'type' => 'ai',
                    'name' => 'Genera titoli e scaletta post',
                    'description' => 'AI genera i titoli degli articoli del mese con keyword target e scaletta.',
                    'required_input_keys' => ['clustered_keywords', 'posting_frequency', 'tone_of_voice', 'target_audience', 'language'],
                    'output_keys' => ['editorial_plan', 'post_titles', 'target_keywords_map'],
                ],
                [
                    'key' => 'human_review_plan',
                    'type' => 'human',
                    'name' => 'Review piano editoriale',
                    'description' => 'Il team revisiona i titoli proposti e verifica la coerenza con la strategia.',
                    'instructions' => 'Revisiona il piano editoriale proposto dall\'AI. Verifica: (1) titoli accattivanti e SEO-friendly, (2) distribuzione temporale coerente, (3) copertura dei cluster keyword principali. Lascia note su eventuali modifiche.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'human_approve_plan',
                    'type' => 'human',
                    'name' => 'Approva e blocca piano editoriale',
                    'description' => 'Approvazione finale del piano da parte del responsabile.',
                    'instructions' => 'Dopo la review, approva il piano editoriale definitivo. Una volta approvato, il sistema avvierà automaticamente i task di scrittura per ogni post.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
            ],
        ];
    }

    // ─────────────────────────────────────────────────────
    // 3. WRITE POST
    // ─────────────────────────────────────────────────────
    private function writePost(): array
    {
        return [
            'id' => 'write_post',
            'name' => 'Scrittura e Pubblicazione Post',
            'category' => 'content',
            'trigger' => 'manual',
            'description' => 'Scrittura completa di un post SEO-ottimizzato, review umana e pubblicazione.',
            'steps' => [
                [
                    'key' => 'ai_write_draft',
                    'type' => 'ai',
                    'name' => 'Scrivi bozza completa',
                    'description' => 'Groq scrive il post completo con struttura H1/H2/H3, introduzione, corpo e conclusione.',
                    'required_input_keys' => ['title', 'target_keyword', 'secondary_keywords', 'tone_of_voice', 'target_audience', 'language'],
                    'output_keys' => ['content', 'meta_title', 'meta_description', 'word_count', 'suggested_structure'],
                ],
                [
                    'key' => 'human_review_draft',
                    'type' => 'human',
                    'name' => 'Review editoriale bozza',
                    'description' => 'Lettura umana: accuracy dei fatti, tono, fluency e conformità alle linee guida.',
                    'instructions' => 'Leggi il post generato e verifica: (1) accuratezza dei fatti e informazioni, (2) tono coerente con la brand voice, (3) fluidità del testo, (4) assenza di errori grammaticali. Lascia note con le correzioni necessarie.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'ai_optimize_with_feedback',
                    'type' => 'ai',
                    'name' => 'Ottimizza con feedback umano',
                    'description' => 'AI incorpora il feedback umano e ottimizza il testo.',
                    'required_input_keys' => ['content', 'human_feedback', 'target_keyword'],
                    'output_keys' => ['content_revised', 'meta_title', 'meta_description', 'seo_score'],
                ],
                [
                    'key' => 'human_publish',
                    'type' => 'human',
                    'name' => 'Pubblica il post',
                    'description' => 'L\'operatore pubblica il post sul CMS (WordPress/Webflow/altro).',
                    'instructions' => '1. Copia il contenuto ottimizzato. 2. Incollalo nel CMS del cliente. 3. Imposta: title, meta description, categoria, tag, immagine in evidenza. 4. Pubblica o schedula. 5. Copia e incolla qui l\'URL del post pubblicato.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'code_update_sitemap',
                    'type' => 'code',
                    'name' => 'Aggiorna sitemap',
                    'description' => 'Il sistema aggiorna automaticamente la sitemap XML con il nuovo URL.',
                    'handler' => 'updateSitemap',
                    'required_input_keys' => ['published_url', 'blog_api_url', 'blog_api_token_encrypted'],
                ],
                [
                    'key' => 'api_ping_indexnow',
                    'type' => 'api',
                    'name' => 'Ping IndexNow',
                    'description' => 'Notifica Bing/Yandex tramite IndexNow per indicizzazione rapida.',
                    'handler' => 'pingIndexNow',
                    'endpoint' => 'https://api.indexnow.org/indexnow',
                    'required_input_keys' => ['published_url', 'website_url'],
                ],
            ],
        ];
    }

    // ─────────────────────────────────────────────────────
    // 4. SEO TECHNICAL AUDIT
    // ─────────────────────────────────────────────────────
    private function seoTechnicalAudit(): array
    {
        return [
            'id' => 'seo_technical_audit',
            'name' => 'Audit SEO Tecnico',
            'category' => 'seo-tech',
            'trigger' => 'scheduled',
            'description' => 'Crawl tecnico del sito, analisi AI dei problemi SEO e piano di fix.',
            'steps' => [
                [
                    'key' => 'code_crawl_site',
                    'type' => 'code',
                    'name' => 'Crawl tecnico del sito',
                    'description' => 'Il sistema esegue un crawl del sito raccogliendo: status code, meta tags, titoli H1-H6, canonical, hreflang, Core Web Vitals.',
                    'handler' => 'crawlSite',
                    'required_input_keys' => ['website_url'],
                ],
                [
                    'key' => 'ai_analyze_issues',
                    'type' => 'ai',
                    'name' => 'Analisi AI problemi SEO',
                    'description' => 'AI analizza i dati di crawl e identifica problemi critici, warning e suggerimenti.',
                    'required_input_keys' => ['crawl_data', 'website_url', 'target_keywords'],
                    'output_keys' => ['issues', 'recommendations', 'critical_count', 'warning_count', 'info_count', 'overall_score'],
                ],
                [
                    'key' => 'human_validate_audit',
                    'type' => 'human',
                    'name' => 'Valida audit con il cliente',
                    'description' => 'Il team presenta l\'audit al cliente e raccoglie priorità e feedback.',
                    'instructions' => 'Revisiona il report di audit generato dall\'AI. Verifica la correttezza dei problemi identificati. Presenta il report al cliente e raccogli feedback sulle priorità di fix.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'code_auto_fix',
                    'type' => 'code',
                    'name' => 'Fix automatici via API CMS',
                    'description' => 'Il sistema corregge automaticamente i problemi risolvibili via API (meta tag mancanti, redirect, ecc.).',
                    'handler' => 'autoFixSeoIssues',
                    'required_input_keys' => ['issues', 'blog_api_url', 'blog_api_token_encrypted'],
                ],
                [
                    'key' => 'human_manual_fixes',
                    'type' => 'human',
                    'name' => 'Fix manuali residui',
                    'description' => 'L\'operatore esegue manualmente i fix che richiedono intervento umano.',
                    'instructions' => 'Esegui i fix manuali elencati nel report che non possono essere automatizzati. Documenta ogni fix completato con note e link alla pagina corretta.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
            ],
        ];
    }

    // ─────────────────────────────────────────────────────
    // 5. CONTENT REFRESH
    // ─────────────────────────────────────────────────────
    private function contentRefresh(): array
    {
        return [
            'id' => 'content_refresh',
            'name' => 'Aggiornamento Contenuto',
            'category' => 'content',
            'trigger' => 'manual',
            'description' => 'Identificazione da GSC dei contenuti da aggiornare, riscrittura AI e re-submission.',
            'steps' => [
                [
                    'key' => 'human_identify_from_gsc',
                    'type' => 'human',
                    'name' => 'Identifica contenuti da aggiornare (GSC)',
                    'description' => 'L\'operatore analizza Google Search Console e identifica i post con calo di performance.',
                    'instructions' => '1. Apri Google Search Console per il sito. 2. Vai in Prestazioni > Pagine. 3. Filtra per ultimi 3 mesi vs 3 mesi precedenti. 4. Identifica le pagine con calo significativo di click o impressioni. 5. Esporta il CSV e caricalo qui.',
                    'requires_upload' => true,
                    'upload_instructions' => 'Carica il CSV di GSC con le pagine da aggiornare. Colonne attese: url, clicks, impressions, ctr, position.',
                ],
                [
                    'key' => 'ai_serp_gap_analysis',
                    'type' => 'ai',
                    'name' => 'Analisi SERP gap e opportunità',
                    'description' => 'AI analizza i dati GSC e identifica i gap di contenuto rispetto ai competitor in SERP.',
                    'required_input_keys' => ['gsc_data', 'target_keywords', 'website_url'],
                    'output_keys' => ['serp_gaps', 'content_opportunities', 'refresh_priorities'],
                ],
                [
                    'key' => 'ai_rewrite_content',
                    'type' => 'ai',
                    'name' => 'Riscrivi e aggiorna contenuto',
                    'description' => 'AI aggiorna il contenuto esistente incorporando le opportunità identificate.',
                    'required_input_keys' => ['original_content', 'serp_gaps', 'target_keyword', 'tone_of_voice'],
                    'output_keys' => ['updated_content', 'meta_title', 'meta_description', 'changelog'],
                ],
                [
                    'key' => 'human_publish_update',
                    'type' => 'human',
                    'name' => 'Pubblica aggiornamento',
                    'description' => 'L\'operatore pubblica il contenuto aggiornato sul CMS.',
                    'instructions' => '1. Copia il contenuto aggiornato. 2. Apri il post nel CMS. 3. Sostituisci il contenuto. 4. Aggiorna data di modifica. 5. Salva e verifica. 6. Incolla qui l\'URL della pagina aggiornata.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'api_resubmit_gsc',
                    'type' => 'api',
                    'name' => 'Re-submit a Google Search Console',
                    'description' => 'Notifica Google tramite IndexNow e richiede re-crawl tramite GSC API.',
                    'handler' => 'resubmitToGsc',
                    'required_input_keys' => ['published_url', 'gsc_property_id'],
                ],
            ],
        ];
    }

    // ─────────────────────────────────────────────────────
    // 6. SEO INITIAL SETUP
    // ─────────────────────────────────────────────────────
    private function seoInitialSetup(): array
    {
        return [
            'id' => 'seo_initial_setup',
            'name' => 'Setup SEO Iniziale Sito',
            'category' => 'setup',
            'trigger' => 'manual',
            'description' => 'Setup completo delle fondamenta SEO per un nuovo sito: sitemap, robots, structured data, GSC.',
            'steps' => [
                [
                    'key' => 'code_generate_sitemap',
                    'type' => 'code',
                    'name' => 'Genera sitemap XML',
                    'description' => 'Il sistema genera e pubblica la sitemap XML completa del sito.',
                    'handler' => 'generateSitemap',
                    'required_input_keys' => ['website_url', 'blog_api_url', 'blog_api_token_encrypted'],
                ],
                [
                    'key' => 'code_configure_robots',
                    'type' => 'code',
                    'name' => 'Configura robots.txt',
                    'description' => 'Il sistema verifica e ottimizza il file robots.txt.',
                    'handler' => 'configureRobots',
                    'required_input_keys' => ['website_url'],
                ],
                [
                    'key' => 'code_add_structured_data',
                    'type' => 'code',
                    'name' => 'Aggiungi structured data (Schema.org)',
                    'description' => 'Il sistema aggiunge i markup Schema.org appropriati (Organization, Website, BreadcrumbList).',
                    'handler' => 'addStructuredData',
                    'required_input_keys' => ['website_url', 'blog_api_url', 'blog_api_token_encrypted'],
                ],
                [
                    'key' => 'human_gsc_config',
                    'type' => 'human',
                    'name' => 'Configura Google Search Console',
                    'description' => 'L\'operatore verifica il sito in GSC e configura le proprietà.',
                    'instructions' => '1. Accedi a Google Search Console (search.google.com/search-console). 2. Aggiungi la proprietà per il sito del cliente. 3. Verifica la proprietà tramite DNS o file HTML. 4. Imposta la property come preferita. 5. Configura le impostazioni internazionali se necessario.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'human_submit_sitemap_gsc',
                    'type' => 'human',
                    'name' => 'Invia sitemap a GSC',
                    'description' => 'L\'operatore invia la sitemap tramite Google Search Console.',
                    'instructions' => '1. In GSC, vai in Indice > Sitemap. 2. Incolla l\'URL della sitemap (es. https://sito.it/sitemap.xml). 3. Clicca "Invia". 4. Verifica che lo stato sia "Nessun errore". 5. Documenta l\'URL della sitemap inviata.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'human_analytics_setup',
                    'type' => 'human',
                    'name' => 'Configura Google Analytics 4',
                    'description' => 'L\'operatore configura GA4 per il tracciamento del traffico organico.',
                    'instructions' => '1. Crea o accedi alla proprietà GA4 del cliente. 2. Installa il tag GA4 sul sito (tramite GTM o direttamente nel codice). 3. Configura gli eventi chiave: page_view, scroll, form_submit. 4. Collega GA4 a GSC per i dati organici. 5. Verifica il funzionamento con la modalità debug.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
                [
                    'key' => 'ai_baseline_audit',
                    'type' => 'ai',
                    'name' => 'Audit baseline iniziale',
                    'description' => 'AI esegue un primo audit baseline per documentare lo stato SEO di partenza.',
                    'required_input_keys' => ['website_url', 'target_keywords', 'tone_of_voice', 'target_audience'],
                    'output_keys' => ['baseline_score', 'baseline_issues', 'baseline_recommendations', 'quick_wins'],
                ],
            ],
        ];
    }

    // ─────────────────────────────────────────────────────
    // 7. GSC MONTHLY REVIEW
    // ─────────────────────────────────────────────────────
    private function gscMonthlyReview(): array
    {
        return [
            'id' => 'gsc_monthly_review',
            'name' => 'Review GSC Mensile',
            'category' => 'analysis',
            'trigger' => 'scheduled',
            'description' => 'Analisi mensile dei dati Google Search Console per monitorare le performance organiche.',
            'steps' => [
                [
                    'key' => 'human_export_gsc_csv',
                    'type' => 'human',
                    'name' => 'Esporta dati GSC del mese',
                    'description' => 'L\'operatore esporta i dati di performance da Google Search Console.',
                    'instructions' => '1. Accedi a Google Search Console. 2. Vai in "Prestazioni > Risultati della Ricerca". 3. Imposta il periodo: ultimo mese completo. 4. Attiva le colonne: Click, Impressioni, CTR, Posizione media. 5. Esporta in formato CSV cliccando il pulsante di download. 6. Carica il file qui.',
                    'requires_upload' => true,
                    'upload_instructions' => 'Carica il CSV di GSC. Formato atteso: query, clicks, impressions, ctr, position. Encoding: UTF-8.',
                ],
                [
                    'key' => 'ai_analyze_trends',
                    'type' => 'ai',
                    'name' => 'Analisi trend e performance',
                    'description' => 'AI analizza i dati GSC e identifica trend positivi, negativi e opportunità.',
                    'required_input_keys' => ['gsc_data', 'target_keywords', 'previous_month_data'],
                    'output_keys' => ['trend_analysis', 'top_performers', 'declining_pages', 'keyword_opportunities', 'ctr_insights'],
                ],
                [
                    'key' => 'ai_generate_report',
                    'type' => 'ai',
                    'name' => 'Genera report mensile',
                    'description' => 'AI produce il report mensile completo con highlights, KPI e raccomandazioni.',
                    'required_input_keys' => ['trend_analysis', 'top_performers', 'declining_pages', 'keyword_opportunities'],
                    'output_keys' => ['monthly_report', 'executive_summary', 'kpi_summary', 'action_items'],
                ],
                [
                    'key' => 'human_share_with_client',
                    'type' => 'human',
                    'name' => 'Condividi report con il cliente',
                    'description' => 'L\'operatore presenta il report mensile al cliente.',
                    'instructions' => '1. Revisiona il report generato dall\'AI. 2. Personalizza se necessario con note specifiche. 3. Invia il report al cliente via email o presentalo in call. 4. Documenta le azioni concordate per il mese successivo.',
                    'requires_upload' => false,
                    'upload_instructions' => null,
                ],
            ],
        ];
    }
}
