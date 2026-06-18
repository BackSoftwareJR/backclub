<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            // Check if columns don't exist before adding them
            if (!Schema::hasColumn('crm_project_tasks', 'execution_mode')) {
                $table->enum('execution_mode', ['human', 'agent', 'agent_human'])
                    ->default('human')
                    ->after('status');
            }
            
            if (!Schema::hasColumn('crm_project_tasks', 'n8n_status')) {
                $table->enum('n8n_status', ['pending', 'processing', 'completed', 'failed', 'skipped'])
                    ->nullable()
                    ->after('execution_mode');
            }
            
            if (!Schema::hasColumn('crm_project_tasks', 'n8n_execution_id')) {
                $table->string('n8n_execution_id', 255)
                    ->nullable()
                    ->after('n8n_status')
                    ->comment('Orchestrator run_id');
            }
            
            if (!Schema::hasColumn('crm_project_tasks', 'n8n_response')) {
                $table->longText('n8n_response')
                    ->nullable()
                    ->after('n8n_execution_id')
                    ->comment('JSON response from orchestrator');
            }
            
            if (!Schema::hasColumn('crm_project_tasks', 'n8n_response_format')) {
                $table->string('n8n_response_format', 50)
                    ->nullable()
                    ->after('n8n_response');
            }
            
            if (!Schema::hasColumn('crm_project_tasks', 'n8n_error')) {
                $table->text('n8n_error')
                    ->nullable()
                    ->after('n8n_response_format');
            }
            
            if (!Schema::hasColumn('crm_project_tasks', 'n8n_completed_at')) {
                $table->timestamp('n8n_completed_at')
                    ->nullable()
                    ->after('n8n_error');
            }
            
            // Progress column might already exist, check first
            if (!Schema::hasColumn('crm_project_tasks', 'progress')) {
                $table->tinyInteger('progress')
                    ->unsigned()
                    ->default(0)
                    ->after('n8n_completed_at')
                    ->comment('Progress percentage 0-100');
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            $columnsToRemove = [
                'execution_mode',
                'n8n_status', 
                'n8n_execution_id',
                'n8n_response',
                'n8n_response_format',
                'n8n_error',
                'n8n_completed_at'
            ];
            
            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('crm_project_tasks', $column)) {
                    $table->dropColumn($column);
                }
            }
            
            // Only drop progress if it was added by this migration
            // In practice, you might want to keep this check manual
            // if (Schema::hasColumn('crm_project_tasks', 'progress')) {
            //     $table->dropColumn('progress');
            // }
        });
    }
};