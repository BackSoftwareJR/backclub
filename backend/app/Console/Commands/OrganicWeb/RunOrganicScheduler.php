<?php

namespace App\Console\Commands\OrganicWeb;

use App\Models\OrganicSkillRun;
use App\Models\OrganicWebProject;
use App\Services\OrganicWeb\SkillEngineService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RunOrganicScheduler extends Command
{
    protected $signature = 'organic-web:run-scheduler';

    protected $description = 'Avvia automaticamente le skill programmate per ogni progetto Organic Web attivo.';

    private const SCHEDULED_SKILLS = [
        'gsc_monthly_review'       => 'monthly',
        'monthly_keyword_research' => 'monthly',
        'editorial_plan'           => 'monthly',
        'seo_technical_audit'      => 'weekly',
    ];

    public function __construct(private readonly SkillEngineService $skillEngine)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('[OrganicWeb Scheduler] Avvio controllo skill programmate...');
        Log::info('[OrganicWebScheduler] Avvio scheduler run.');

        $projects = OrganicWebProject::where('is_active', true)->get();

        if ($projects->isEmpty()) {
            $this->info('Nessun progetto attivo trovato.');
            return self::SUCCESS;
        }

        $this->info("Trovati {$projects->count()} progetti attivi.");

        $started = 0;

        foreach ($projects as $project) {
            foreach (self::SCHEDULED_SKILLS as $skillId => $frequency) {
                if (!$this->skillIsActive($project, $skillId)) {
                    continue;
                }

                if ($this->shouldRunSkill($project->id, $skillId, $frequency)) {
                    try {
                        $run = $this->skillEngine->startSkillRun(
                            $project->id,
                            $skillId,
                            ['trigger_type' => 'scheduled'],
                        );

                        $this->info("  ✓ Avviata skill [{$skillId}] per progetto #{$project->id} → run #{$run->id}");

                        Log::info('[OrganicWebScheduler] Skill run avviata', [
                            'project_id' => $project->id,
                            'skill_id'   => $skillId,
                            'run_id'     => $run->id,
                        ]);

                        $started++;
                    } catch (\Throwable $e) {
                        $this->warn("  ✗ Errore avvio skill [{$skillId}] per progetto #{$project->id}: {$e->getMessage()}");

                        Log::error('[OrganicWebScheduler] Errore avvio skill run', [
                            'project_id' => $project->id,
                            'skill_id'   => $skillId,
                            'error'      => $e->getMessage(),
                        ]);
                    }
                }
            }
        }

        $this->info("[OrganicWeb Scheduler] Completato. Skill avviate: {$started}.");
        Log::info('[OrganicWebScheduler] Completato.', ['started' => $started]);

        return self::SUCCESS;
    }

    private function skillIsActive(OrganicWebProject $project, string $skillId): bool
    {
        $activeSkills = $project->active_skills;

        if (empty($activeSkills)) {
            return true;
        }

        return in_array($skillId, (array) $activeSkills, true);
    }

    private function shouldRunSkill(int $projectId, string $skillId, string $frequency): bool
    {
        $query = OrganicSkillRun::where('organic_project_id', $projectId)
            ->where('skill_id', $skillId)
            ->where('status', 'completed');

        if ($frequency === 'monthly') {
            $since = now()->startOfMonth();
        } elseif ($frequency === 'weekly') {
            $since = now()->startOfWeek();
        } else {
            $since = now()->startOfDay();
        }

        $hasRecent = $query->where('completed_at', '>=', $since)->exists();

        if ($hasRecent) {
            return false;
        }

        $isAlreadyRunning = OrganicSkillRun::where('organic_project_id', $projectId)
            ->where('skill_id', $skillId)
            ->whereIn('status', ['running', 'waiting_human'])
            ->exists();

        return !$isAlreadyRunning;
    }
}
