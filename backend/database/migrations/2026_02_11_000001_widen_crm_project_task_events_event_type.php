<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Allarga la colonna event_type per evitare "Data truncated" (es. riassegnazione_utente, approvazione_eliminazione).
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE crm_project_task_events MODIFY COLUMN event_type VARCHAR(64) NOT NULL');
    }

    /**
     * Reverse (ripristina lunghezza comune se era più corta).
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE crm_project_task_events MODIFY COLUMN event_type VARCHAR(32) NOT NULL');
    }
};
