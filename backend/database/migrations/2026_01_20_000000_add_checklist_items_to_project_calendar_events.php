<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Verifica se la colonna esiste già
        $hasColumn = Schema::hasColumn('project_calendar_events', 'checklist_items');
        
        if (!$hasColumn) {
            Schema::table('project_calendar_events', function (Blueprint $table) {
                $table->json('checklist_items')->nullable()->after('description')->comment('Array di {id, text, completed} per checklist eventi');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('project_calendar_events', 'checklist_items')) {
            Schema::table('project_calendar_events', function (Blueprint $table) {
                $table->dropColumn('checklist_items');
            });
        }
    }
};

