<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organic_skill_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organic_project_id')->constrained('organic_web_projects')->onDelete('cascade');
            $table->string('skill_id');
            $table->enum('status', ['pending', 'running', 'waiting_human', 'completed', 'failed', 'cancelled'])->default('pending');
            $table->integer('current_step_index')->default(0);
            $table->enum('trigger_type', ['cron', 'manual', 'event', 'dependent'])->default('manual');
            $table->json('trigger_data')->nullable();
            $table->json('context')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organic_skill_runs');
    }
};
