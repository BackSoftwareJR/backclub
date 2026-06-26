<?php

namespace App\Console\Commands\OrganicWeb;

use App\Services\OrganicWeb\SearchConsoleService;
use Illuminate\Console\Command;

class TestSearchConsoleCommand extends Command
{
    protected $signature = 'organic:test-gsc {user_id : ID utente da testare}';

    protected $description = 'Testa la connessione Google Search Console per un utente';

    public function handle(SearchConsoleService $searchConsoleService): int
    {
        $userId = (int) $this->argument('user_id');

        $this->info("Recupero siti per user_id: {$userId}...");

        try {
            $result = $searchConsoleService->listSites($userId);
            $sites = $result['sites'];

            if (empty($sites)) {
                $this->warn('Nessun sito trovato per questo utente in Google Search Console.');

                return Command::SUCCESS;
            }

            $rows = array_map(
                fn ($site) => [$site->getSiteUrl(), $site->getPermissionLevel()],
                $sites,
            );

            $this->table(['URL Sito', 'Livello Permesso'], $rows);

            $this->info('Connessione Google Search Console verificata con successo.');
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}
