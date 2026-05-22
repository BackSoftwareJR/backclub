<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            $table->string('execution_mode', 20)->default('human')->after('created_by');
            $table->string('n8n_status', 20)->nullable()->after('execution_mode');
            $table->json('n8n_response')->nullable()->after('n8n_status');
            $table->string('n8n_response_format', 50)->nullable()->after('n8n_response');
            $table->text('n8n_error')->nullable()->after('n8n_response_format');
            $table->timestamp('n8n_completed_at')->nullable()->after('n8n_error');
        });
    }

    public function down(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            $table->dropColumn([
                'execution_mode',
                'n8n_status',
                'n8n_response',
                'n8n_response_format',
                'n8n_error',
                'n8n_completed_at',
            ]);
        });
    }
};
