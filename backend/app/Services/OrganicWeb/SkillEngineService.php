<?php

namespace App\Services\OrganicWeb;

use App\Models\OrganicWebProject;
use App\Models\OrganicSkillRun;
use App\Models\OrganicSkillStep;
use App\Models\OrganicHumanTask;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SkillEngineService
{
    public function __construct(
        private readonly SkillDefinitionService $skillDefinition,
        private readonly OrganicAiService $aiService,
        private readonly OrganicCodeService $codeService,
    ) {}

    /**
     * Avvia una nuova skill run per un progetto.
     */
    public function startSkillRun(
        int $projectId,
        string $skillId,
        array $triggerData = [],
        ?int $userId = null
    ): OrganicSkillRun {
        $skillDef = $this->skillDefinition->getSkillById($skillId);

        if (!$skillDef) {
            throw new \InvalidArgumentException("Skill '{$skillId}' non trovata.");
        }

        $project = OrganicWebProject::findOrFail($projectId);

        return DB::transaction(function () use ($project, $skillDef, $triggerData, $userId) {
            $run = OrganicSkillRun::create([
                'organic_project_id' => $project->id,
                'skill_id' => $skillDef['id'],
                'status' => 'running',
                'current_step_index' => 0,
                'trigger_type' => $triggerData['trigger_type'] ?? 'manual',
                'trigger_data' => $triggerData,
                'context' => [],
                'started_at' => now(),
                'created_by' => $userId,
            ]);

            foreach ($skillDef['steps'] as $index => $stepDef) {
                OrganicSkillStep::create([
                    'skill_run_id' => $run->id,
                    'step_index' => $index,
                    'step_key' => $stepDef['key'],
                    'step_type' => $stepDef['type'],
                    'status' => 'pending',
                ]);
            }

            $this->advanceSkillRun($run);

            return $run->fresh(['steps']);
        });
    }

    /**
     * Avanza lo skill run al prossimo step disponibile.
     */
    public function advanceSkillRun(OrganicSkillRun $run): void
    {
        $run->refresh();

        if (in_array($run->status, ['completed', 'failed', 'cancelled'])) {
            return;
        }

        $skillDef = $this->skillDefinition->getSkillById($run->skill_id);

        if (!$skillDef) {
            $this->failRun($run, "Definizione skill '{$run->skill_id}' non trovata.");
            return;
        }

        $steps = $skillDef['steps'];
        $currentIndex = $run->current_step_index;

        if ($currentIndex >= count($steps)) {
            $this->completeRun($run);
            return;
        }

        $stepDef = $steps[$currentIndex];
        $step = OrganicSkillStep::where('skill_run_id', $run->id)
            ->where('step_index', $currentIndex)
            ->firstOrFail();

        $step->update([
            'status' => 'running',
            'started_at' => now(),
        ]);

        $run->update(['status' => 'running']);

        try {
            $this->executeStep($run, $stepDef, $step);
        } catch (\Throwable $e) {
            Log::error('[SkillEngine] Errore step', [
                'run_id' => $run->id,
                'step_key' => $stepDef['key'],
                'error' => $e->getMessage(),
            ]);
            $step->update(['status' => 'failed']);
            $this->failRun($run, $e->getMessage());
        }
    }

    /**
     * Esegui lo step corrente in base al tipo.
     */
    private function executeStep(OrganicSkillRun $run, array $stepDef, OrganicSkillStep $step): void
    {
        match ($stepDef['type']) {
            'human' => $this->executeHumanStep($run, $stepDef, $step),
            'ai'    => $this->executeAiStep($run, $stepDef, $step),
            'code'  => $this->executeCodeStep($run, $stepDef, $step),
            'api'   => $this->executeApiStep($run, $stepDef, $step),
            default => throw new \InvalidArgumentException("Tipo step sconosciuto: {$stepDef['type']}"),
        };
    }

    /**
     * Step tipo 'human': crea OrganicHumanTask e mette run in waiting_human.
     */
    private function executeHumanStep(OrganicSkillRun $run, array $stepDef, OrganicSkillStep $step): void
    {
        $project = $run->organicProject;

        $input = $this->buildStepInput($run, $stepDef);

        $step->update([
            'status' => 'waiting',
            'input' => $input,
        ]);

        OrganicHumanTask::create([
            'skill_step_id' => $step->id,
            'organic_project_id' => $run->organic_project_id,
            'assignee_id' => null,
            'title' => $stepDef['name'],
            'description' => $stepDef['description'],
            'instructions' => $stepDef['instructions'] ?? null,
            'upload_instructions' => $stepDef['upload_instructions'] ?? null,
            'status' => 'pending',
            'priority' => 'normal',
        ]);

        $run->update(['status' => 'waiting_human']);

        Log::info('[SkillEngine] Human task creato', [
            'run_id' => $run->id,
            'step_key' => $stepDef['key'],
            'project_id' => $run->organic_project_id,
        ]);
    }

    /**
     * Step tipo 'ai': chiama Groq via OrganicAiService.
     */
    private function executeAiStep(OrganicSkillRun $run, array $stepDef, OrganicSkillStep $step): void
    {
        $input   = $this->buildStepInput($run, $stepDef);
        $stepKey = $stepDef['key'];

        $step->update([
            'status'     => 'running',
            'input'      => $input,
            'started_at' => now(),
        ]);

        $project = $run->organicProject;
        $output  = $this->dispatchAiStep($stepKey, $input, $project);

        $step->update([
            'status'       => 'completed',
            'output'       => $output,
            'completed_at' => now(),
        ]);

        $this->mergeContextOutput($run, $output);
        $this->moveToNextStep($run);

        Log::info('[SkillEngine] AI step completato', [
            'run_id'   => $run->id,
            'step_key' => $stepKey,
        ]);
    }

    /**
     * Smista lo step AI al metodo corretto di OrganicAiService.
     */
    private function dispatchAiStep(string $stepKey, array $input, OrganicWebProject $project): array
    {
        $website  = $project->website_url ?? '';
        $niche    = $project->target_audience ?? '';
        $tone     = $project->tone_of_voice ?? '';
        $audience = $project->target_audience ?? '';
        $language = $project->language ?? 'it';

        return match ($stepKey) {
            'ai_generate_seed_list' => $this->aiService->generateKeywordSeed(
                $website,
                $niche,
                (array) ($input['topics'] ?? $input['seed_keywords'] ?? []),
                $language,
            ),

            'ai_cluster_keywords' => $this->aiService->clusterKeywords(
                $this->parseCsvToKeywords($input['csv_data'] ?? []),
                $niche,
            ),

            'ai_generate_titles' => $this->aiService->generateEditorialPlan(
                (array) ($input['clustered_keywords'] ?? []),
                (int) ($input['posting_frequency'] ?? $project->posting_frequency ?? 4),
                $tone,
                $audience,
            ),

            'ai_write_draft' => $this->aiService->writePost(
                (string) ($input['title'] ?? ''),
                (string) ($input['target_keyword'] ?? ''),
                (array) ($input['secondary_keywords'] ?? []),
                $tone,
                $audience,
                $language,
            ),

            'ai_optimize_with_feedback' => $this->aiService->optimizePost(
                (string) ($input['content'] ?? ''),
                (string) ($input['target_keyword'] ?? ''),
                (array) ($input['human_feedback'] ? [$input['human_feedback']] : ($input['issues'] ?? [])),
            ),

            'ai_analyze_issues' => $this->aiService->analyzeSeoAudit(
                (array) ($input['crawl_data'] ?? []),
            ),

            'ai_analyze_trends' => $this->aiService->analyzeGscData(
                (array) ($input['gsc_data'] ?? []),
                "Sito: {$website}, Target: {$audience}",
            ),

            'ai_generate_report' => [
                'monthly_report' => $this->aiService->generateGscReport(
                    $input,
                    $project->crmProject->name ?? $website,
                ),
            ],

            'ai_serp_gap_analysis' => $this->aiService->analyzeContentGap(
                (string) ($input['original_content'] ?? $input['current_content'] ?? ''),
                (string) ($input['target_keyword'] ?? ''),
                (array) ($input['serp_titles'] ?? []),
            ),

            'ai_rewrite_content' => $this->aiService->refreshContent(
                (string) ($input['original_content'] ?? $input['content'] ?? ''),
                (array) ($input['serp_gaps'] ?? $input['suggested_additions'] ?? []),
                (string) ($input['target_keyword'] ?? ''),
            ),

            'ai_baseline_audit' => $this->aiService->analyzeSeoAudit(
                (array) ($input['crawl_data'] ?? [['url' => $website, 'status_code' => 200]]),
            ),

            default => ['_skipped' => true, '_step_key' => $stepKey, '_reason' => 'step_key non mappato'],
        };
    }

    /**
     * Step tipo 'code': esegui logica PHP via OrganicCodeService.
     */
    private function executeCodeStep(OrganicSkillRun $run, array $stepDef, OrganicSkillStep $step): void
    {
        $input   = $this->buildStepInput($run, $stepDef);
        $stepKey = $stepDef['key'];
        $handler = $stepDef['handler'] ?? null;

        $step->update([
            'status'     => 'running',
            'input'      => $input,
            'started_at' => now(),
        ]);

        $output = $this->dispatchCodeStep($stepKey, $handler, $input);

        $step->update([
            'status'       => 'completed',
            'output'       => $output,
            'completed_at' => now(),
        ]);

        $this->mergeContextOutput($run, $output);
        $this->moveToNextStep($run);

        Log::info('[SkillEngine] Code step completato', [
            'run_id'   => $run->id,
            'step_key' => $stepKey,
            'handler'  => $handler,
        ]);
    }

    /**
     * Smista lo step code al metodo corretto di OrganicCodeService.
     */
    private function dispatchCodeStep(string $stepKey, ?string $handler, array $input): array
    {
        $websiteUrl = (string) ($input['website_url'] ?? '');

        return match ($stepKey) {
            'code_crawl_site' => (function () use ($websiteUrl): array {
                $crawlData = $this->codeService->crawlSiteForAudit($websiteUrl, 100);
                return [
                    'pages_crawled' => count($crawlData),
                    'crawl_data'    => $crawlData,
                ];
            })(),

            'code_generate_sitemap' => (function () use ($websiteUrl): array {
                $outputPath   = storage_path('app/sitemaps/' . md5($websiteUrl) . '_sitemap.xml');
                @mkdir(dirname($outputPath), 0755, true);
                $ok = $this->codeService->generateSitemap($websiteUrl, $outputPath);
                return [
                    'sitemap_generated' => $ok,
                    'sitemap_path'      => $ok ? $outputPath : null,
                    'sitemap_url'       => rtrim($websiteUrl, '/') . '/sitemap.xml',
                ];
            })(),

            'code_configure_robots',
            'code_check_robots' => (function () use ($websiteUrl): array {
                $result = $this->codeService->checkRobotsTxt($websiteUrl);
                return [
                    'robots_status'   => empty($result['issues']) ? 'ok' : 'issues_found',
                    'robots_issues'   => $result['issues'],
                    'robots_current'  => $result['current_content'],
                    'robots_suggested' => $result['suggested_content'],
                ];
            })(),

            'code_update_sitemap' => (function () use ($websiteUrl): array {
                $outputPath = storage_path('app/sitemaps/' . md5($websiteUrl) . '_sitemap.xml');
                @mkdir(dirname($outputPath), 0755, true);
                $ok = $this->codeService->generateSitemap($websiteUrl, $outputPath);
                return [
                    'sitemap_updated' => $ok,
                    'sitemap_url'     => rtrim($websiteUrl, '/') . '/sitemap.xml',
                ];
            })(),

            'code_auto_fix',
            'code_add_structured_data' => [
                'fixes_applied'        => 0,
                '_note'                => 'Fix automatici via CMS API: richiede integrazione specifica per la piattaforma.',
                'manual_action_needed' => true,
            ],

            default => match ($handler) {
                'crawlSite'        => ['pages_crawled' => 0, 'crawl_data' => [], '_note' => 'handler non mappato a step_key'],
                'generateSitemap'  => ['sitemap_url' => null, '_note' => 'handler non mappato a step_key'],
                'configureRobots'  => ['robots_status' => 'skipped', '_note' => 'handler non mappato a step_key'],
                default            => ['_skipped' => true, '_step_key' => $stepKey, '_handler' => $handler],
            },
        };
    }

    /**
     * Step tipo 'api': chiama API esterne via OrganicCodeService.
     */
    private function executeApiStep(OrganicSkillRun $run, array $stepDef, OrganicSkillStep $step): void
    {
        $input   = $this->buildStepInput($run, $stepDef);
        $stepKey = $stepDef['key'];
        $handler = $stepDef['handler'] ?? null;

        $step->update([
            'status'     => 'running',
            'input'      => $input,
            'started_at' => now(),
        ]);

        $output = $this->dispatchApiStep($stepKey, $handler, $input);

        $step->update([
            'status'       => 'completed',
            'output'       => $output,
            'completed_at' => now(),
        ]);

        $this->mergeContextOutput($run, $output);
        $this->moveToNextStep($run);

        Log::info('[SkillEngine] API step completato', [
            'run_id'   => $run->id,
            'step_key' => $stepKey,
            'handler'  => $handler,
        ]);
    }

    /**
     * Smista lo step api al metodo corretto di OrganicCodeService.
     */
    private function dispatchApiStep(string $stepKey, ?string $handler, array $input): array
    {
        $publishedUrl = (string) ($input['published_url'] ?? '');
        $websiteUrl   = (string) ($input['website_url'] ?? '');

        return match ($stepKey) {
            'api_ping_indexnow' => (function () use ($publishedUrl, $websiteUrl): array {
                $host    = parse_url($websiteUrl, PHP_URL_HOST) ?? parse_url($publishedUrl, PHP_URL_HOST) ?? '';
                $pinged  = $publishedUrl ? $this->codeService->pingIndexNow($publishedUrl, $host) : false;
                return [
                    'pinged' => $pinged,
                    'url'    => $publishedUrl,
                ];
            })(),

            'api_ping_indexnow_gsc',
            'api_resubmit_gsc' => (function () use ($publishedUrl): array {
                $submitted = $publishedUrl ? $this->codeService->pingGoogleSearchConsole($publishedUrl) : false;
                return [
                    'submitted' => $submitted,
                    'url'       => $publishedUrl,
                ];
            })(),

            default => match ($handler) {
                'pingIndexNow'    => ['pinged' => false, '_note' => 'handler non mappato a step_key'],
                'resubmitToGsc'   => ['submitted' => false, '_note' => 'handler non mappato a step_key'],
                default           => ['_skipped' => true, '_step_key' => $stepKey, '_handler' => $handler],
            },
        };
    }

    /**
     * Completa un human task e riprende il run.
     */
    public function completeHumanTask(
        OrganicHumanTask $task,
        array $output = [],
        string $notes = ''
    ): void {
        DB::transaction(function () use ($task, $output, $notes) {
            $task->update([
                'status' => 'completed',
                'completed_at' => now(),
                'notes' => $notes ?: $task->notes,
            ]);

            $step = $task->skillStep;

            $step->update([
                'status' => 'completed',
                'output' => $output,
                'completed_at' => now(),
                'notes' => $notes,
            ]);

            $this->mergeContextOutput($step->skillRun, $output);
            $this->moveToNextStep($step->skillRun);
            $this->advanceSkillRun($step->skillRun->fresh());
        });
    }

    /**
     * Ottieni i task umani in attesa per un progetto o per tutti.
     */
    public function getPendingHumanTasks(?int $projectId = null): Collection
    {
        $query = OrganicHumanTask::with([
            'organicProject.crmProject:id,name',
            'assignee:id,name,email',
            'skillStep.skillRun',
        ])->whereIn('status', ['pending', 'in_progress']);

        if ($projectId !== null) {
            $query->where('organic_project_id', $projectId);
        }

        return $query->orderBy('created_at', 'asc')->get();
    }

    /**
     * Ottieni lo stato corrente di tutte le skill per un progetto.
     */
    public function getProjectSkillStatus(int $projectId): array
    {
        $allSkills = $this->skillDefinition->getAllSkills();
        $latestRuns = OrganicSkillRun::where('organic_project_id', $projectId)
            ->whereIn('skill_id', array_column($allSkills, 'id'))
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('skill_id');

        $status = [];

        foreach ($allSkills as $skill) {
            $runs = $latestRuns->get($skill['id'], collect());
            $latestRun = $runs->first();

            $status[] = [
                'skill_id' => $skill['id'],
                'skill_name' => $skill['name'],
                'category' => $skill['category'],
                'trigger' => $skill['trigger'],
                'total_steps' => count($skill['steps']),
                'latest_run' => $latestRun ? [
                    'id' => $latestRun->id,
                    'status' => $latestRun->status,
                    'current_step_index' => $latestRun->current_step_index,
                    'started_at' => $latestRun->started_at,
                    'completed_at' => $latestRun->completed_at,
                ] : null,
                'run_count' => $runs->count(),
            ];
        }

        return $status;
    }

    // ─────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────

    /**
     * Converte dati CSV (stringa o array grezzo) in array normalizzato per clusterKeywords.
     *
     * @return array<array{keyword: string, volume: int, difficulty: int|null}>
     */
    private function parseCsvToKeywords(mixed $csvData): array
    {
        if (is_array($csvData) && !empty($csvData)) {
            $first = reset($csvData);
            if (is_array($first) && isset($first['keyword'])) {
                return $csvData;
            }
        }

        if (is_string($csvData) && !empty($csvData)) {
            return $this->codeService->parseKeywordCsv($csvData);
        }

        return [];
    }

    private function buildStepInput(OrganicSkillRun $run, array $stepDef): array
    {
        $project = $run->organicProject;
        $context = $run->context ?? [];

        $projectData = [
            'website_url' => $project->website_url,
            'tone_of_voice' => $project->tone_of_voice,
            'target_audience' => $project->target_audience,
            'target_keywords' => $project->target_keywords,
            'language' => $project->language,
            'posting_frequency' => $project->posting_frequency,
            'gsc_property_id' => $project->gsc_property_id,
            'blog_api_url' => $project->blog_api_url,
            'blog_api_token_encrypted' => $project->blog_api_token_encrypted,
        ];

        $requiredKeys = $stepDef['required_input_keys'] ?? [];
        $input = [];

        foreach ($requiredKeys as $key) {
            $input[$key] = $context[$key] ?? $projectData[$key] ?? $run->trigger_data[$key] ?? null;
        }

        return $input;
    }

    private function mergeContextOutput(OrganicSkillRun $run, array $output): void
    {
        $run->refresh();
        $context = $run->context ?? [];
        $run->update(['context' => array_merge($context, $output)]);
    }

    private function moveToNextStep(OrganicSkillRun $run): void
    {
        $run->refresh();
        $skillDef = $this->skillDefinition->getSkillById($run->skill_id);
        $nextIndex = $run->current_step_index + 1;

        if (!$skillDef || $nextIndex >= count($skillDef['steps'])) {
            $this->completeRun($run);
            return;
        }

        $run->update(['current_step_index' => $nextIndex]);
    }

    private function completeRun(OrganicSkillRun $run): void
    {
        $run->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        Log::info('[SkillEngine] Skill run completata', [
            'run_id' => $run->id,
            'skill_id' => $run->skill_id,
            'project_id' => $run->organic_project_id,
        ]);
    }

    private function failRun(OrganicSkillRun $run, string $message): void
    {
        $run->update([
            'status' => 'failed',
            'failed_at' => now(),
            'error_message' => $message,
        ]);

        Log::error('[SkillEngine] Skill run fallita', [
            'run_id' => $run->id,
            'skill_id' => $run->skill_id,
            'error' => $message,
        ]);
    }
}
