<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organic_skill_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('skill_run_id')->constrained('organic_skill_runs')->onDelete('cascade');
            $table->integer('step_index');
            $table->string('step_key');
            $table->enum('step_type', ['human', 'ai', 'code', 'api']);
            $table->enum('status', ['pending', 'running', 'waiting', 'completed', 'failed', 'skipped'])->default('pending');
            $table->json('input')->nullable();
            $table->json('output')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organic_skill_steps');
    }
};
