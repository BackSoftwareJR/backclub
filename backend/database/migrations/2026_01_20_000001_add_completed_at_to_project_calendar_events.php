<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Verifica se la colonna esiste già
        $hasColumn = Schema::hasColumn('project_calendar_events', 'completed_at');
        
        if (!$hasColumn) {
            Schema::table('project_calendar_events', function (Blueprint $table) {
                $table->timestamp('completed_at')->nullable()->after('updated_at')->comment('Data/ora di completamento (solo per eventi e call)');
                $table->unsignedBigInteger('completed_by')->nullable()->after('completed_at')->comment('Utente che ha completato l\'evento/call');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('project_calendar_events', 'completed_at')) {
            Schema::table('project_calendar_events', function (Blueprint $table) {
                $table->dropColumn(['completed_at', 'completed_by']);
            });
        }
    }
};

