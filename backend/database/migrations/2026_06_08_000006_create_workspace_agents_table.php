<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('crm_projects')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('workspace_branches')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('prompt');
            $table->enum('status', ['pending', 'running', 'review', 'completed', 'failed', 'stopped'])->default('pending');
            $table->string('n8n_workflow_id')->nullable();
            $table->string('n8n_execution_id')->nullable();
            $table->longText('logs')->nullable();
            $table->longText('result')->nullable();
            $table->text('review_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_agents');
    }
};