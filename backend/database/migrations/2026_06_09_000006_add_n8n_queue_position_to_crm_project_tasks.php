<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_project_tasks', 'n8n_queue_position')) {
                $table->unsignedInteger('n8n_queue_position')->nullable()->after('n8n_execution_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('crm_project_tasks', 'n8n_queue_position')) {
                $table->dropColumn('n8n_queue_position');
            }
        });
    }
};
