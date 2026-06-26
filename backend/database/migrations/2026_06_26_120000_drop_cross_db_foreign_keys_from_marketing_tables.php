<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rimuove i vincoli FK cross-database (mysql_marketing → DB principale)
 * che violano la regola architetturale: nel namespace mysql_marketing le FK
 * verso tabelle del DB principale si gestiscono SOLO via Eloquent, mai a livello DB.
 *
 * MySQL non supporta FK cross-database; i tentativi di crearle vengono ignorati
 * silenziosamente o lanciano un'eccezione. Questa migration usa try/catch per
 * garantire idempotenza su qualsiasi stato del DB.
 *
 * Il metodo down() è vuoto per design: i vincoli cross-DB non devono essere
 * mai ricreati a livello database (irreversibile by design).
 */
return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        // user_google_integrations.user_id → users (DB principale)
        $this->dropForeignSafe('user_google_integrations', ['user_id']);

        // organic_web_projects.crm_project_id → crm_projects (DB principale)
        $this->dropForeignSafe('organic_web_projects', ['crm_project_id']);

        // organic_skill_runs.created_by → users (DB principale)
        $this->dropForeignSafe('organic_skill_runs', ['created_by']);

        // organic_skill_steps.completed_by → users (DB principale)
        $this->dropForeignSafe('organic_skill_steps', ['completed_by']);

        // organic_human_tasks.assignee_id → users (DB principale)
        $this->dropForeignSafe('organic_human_tasks', ['assignee_id']);

        // organic_blog_posts.approved_by → users (DB principale)
        $this->dropForeignSafe('organic_blog_posts', ['approved_by']);

        // organic_keyword_snapshots.approved_by → users (DB principale)
        $this->dropForeignSafe('organic_keyword_snapshots', ['approved_by']);
    }

    public function down(): void
    {
        // Irreversibile by design: i vincoli FK cross-database non devono essere ricreati.
    }

    /**
     * Tenta di rimuovere un vincolo FK; ignora silenziosamente se non esiste.
     *
     * @param  array<string>  $columns
     */
    private function dropForeignSafe(string $table, array $columns): void
    {
        try {
            Schema::connection('mysql_marketing')->table($table, function (Blueprint $blueprint) use ($columns): void {
                $blueprint->dropForeign($columns);
            });
        } catch (\Throwable) {
            // Il vincolo non esiste (MySQL non supporta FK cross-database) — noop.
        }
    }
};
