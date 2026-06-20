<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_agents', function (Blueprint $table) {
            $table->foreignId('crm_task_id')
                ->nullable()
                ->after('user_id')
                ->constrained('crm_project_tasks')
                ->nullOnDelete()
                ->comment('Se valorizzato, questa lavorazione è stata generata automaticamente da un CRM task agente');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_agents', function (Blueprint $table) {
            $table->dropForeign(['crm_task_id']);
            $table->dropColumn('crm_task_id');
        });
    }
};
