<?php

namespace App\Console\Commands\OrganicWeb;

use App\Models\OrganicHumanTask;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendHumanTaskReminders extends Command
{
    protected $signature = 'organic-web:send-reminders';

    protected $description = 'Invia reminder per i task umani Organic Web scaduti e non ancora ricordati.';

    public function handle(): int
    {
        $this->info('[OrganicWeb] Invio reminder task umani scaduti...');

        $tasks = OrganicHumanTask::with(['organicProject', 'assignee:id,name,email'])
            ->whereIn('status', ['pending', 'in_progress'])
            ->where('due_at', '<', now())
            ->where(function ($q): void {
                $q->whereNull('reminded_at')
                  ->orWhere('reminded_at', '<', now()->subHours(24));
            })
            ->get();

        if ($tasks->isEmpty()) {
            $this->info('Nessun task scaduto da ricordare.');
            return self::SUCCESS;
        }

        $this->info("Trovati {$tasks->count()} task da ricordare.");

        $sent = 0;

        foreach ($tasks as $task) {
            try {
                $task->update(['reminded_at' => now()]);

                $this->notifyTask($task);

                $this->info("  ✓ Reminder inviato task #{$task->id} [{$task->title}]");

                Log::info('[SendHumanTaskReminders] Reminder inviato', [
                    'task_id'    => $task->id,
                    'title'      => $task->title,
                    'project_id' => $task->organic_project_id,
                    'due_at'     => $task->due_at,
                    'assignee'   => $task->assignee?->email,
                ]);

                $sent++;
            } catch (\Throwable $e) {
                $this->warn("  ✗ Errore reminder task #{$task->id}: {$e->getMessage()}");

                Log::error('[SendHumanTaskReminders] Errore invio reminder', [
                    'task_id' => $task->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        $this->info("[OrganicWeb] Completato. Reminder inviati: {$sent}.");

        return self::SUCCESS;
    }

    private function notifyTask(OrganicHumanTask $task): void
    {
        $projectName = $task->organicProject->website_url ?? "progetto #{$task->organic_project_id}";
        $assigneeName = $task->assignee?->name ?? 'Team';
        $dueAt = $task->due_at?->format('d/m/Y H:i') ?? 'N/D';

        Log::warning('[OrganicWeb] REMINDER: task umano scaduto', [
            'task_id'      => $task->id,
            'title'        => $task->title,
            'project'      => $projectName,
            'assignee'     => $assigneeName,
            'due_at'       => $dueAt,
            'notification' => "REMINDER per {$assigneeName}: Task \"{$task->title}\" per {$projectName} è scaduto il {$dueAt}. Completare al più presto.",
        ]);

        // Se disponibile, usa il sistema di notifiche in-app dell'applicazione.
        // Il pattern da seguire è quello già usato altrove nel codebase (es. UserNotification o simile).
        // Per ora si effettua il log strutturato che può essere intercettato da Slack/alert.
    }
}
