<?php

namespace App\Console\Commands\OrganicWeb;

use App\Models\OrganicSkillRun;
use App\Services\OrganicWeb\SkillEngineService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AdvanceSkillRuns extends Command
{
    protected $signature = 'organic-web:advance-runs';

    protected $description = 'Avanza tutti i skill run in stato "running" al prossimo step disponibile.';

    public function __construct(private readonly SkillEngineService $skillEngine)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('[OrganicWeb] Avanzamento skill run in corso...');

        $runs = OrganicSkillRun::where('status', 'running')
            ->with(['organicProject', 'steps'])
            ->get();

        if ($runs->isEmpty()) {
            $this->info('Nessun skill run in stato "running" trovato.');
            return self::SUCCESS;
        }

        $this->info("Trovati {$runs->count()} run da avanzare.");

        $advanced = 0;
        $failed   = 0;

        foreach ($runs as $run) {
            try {
                $this->skillEngine->advanceSkillRun($run);

                $run->refresh();

                $this->info("  ✓ Run #{$run->id} [{$run->skill_id}] → {$run->status}");

                Log::info('[AdvanceSkillRuns] Run avanzato', [
                    'run_id'   => $run->id,
                    'skill_id' => $run->skill_id,
                    'status'   => $run->status,
                ]);

                $advanced++;
            } catch (\Throwable $e) {
                $this->warn("  ✗ Errore run #{$run->id}: {$e->getMessage()}");

                Log::error('[AdvanceSkillRuns] Errore avanzamento run', [
                    'run_id' => $run->id,
                    'error'  => $e->getMessage(),
                ]);

                $failed++;
            }
        }

        $this->info("[OrganicWeb] Completato. Avanzati: {$advanced}, Falliti: {$failed}.");

        return self::SUCCESS;
    }
}
