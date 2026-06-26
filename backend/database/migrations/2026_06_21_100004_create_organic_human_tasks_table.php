<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_human_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('skill_step_id')->constrained('organic_skill_steps')->onDelete('cascade');
            $table->foreignId('organic_project_id')->constrained('organic_web_projects')->onDelete('cascade');
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->text('instructions')->nullable();
            $table->text('upload_instructions')->nullable();
            $table->json('upload_data')->nullable();
            $table->string('upload_filename')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed', 'skipped'])->default('pending');
            $table->enum('priority', ['normal', 'high', 'urgent'])->default('normal');
            $table->timestamp('due_at')->nullable();
            $table->timestamp('reminded_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_human_tasks');
    }
};
