<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_project_task_n8n_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_project_task_id')
                ->constrained('crm_project_tasks')
                ->onDelete('cascade');
            $table->string('step_key')
                ->comment('Unique identifier for this step type');
            $table->string('title')->nullable();
            $table->text('message')->nullable();
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'skipped'])
                ->default('pending');
            $table->json('payload')->nullable()
                ->comment('Additional step data from orchestrator');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index(['crm_project_task_id', 'sort_order']);
            $table->index(['crm_project_task_id', 'step_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_project_task_n8n_steps');
    }
};