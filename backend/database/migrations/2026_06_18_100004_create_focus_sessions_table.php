<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('focus_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('session_date');
            $table->enum('status', ['draft', 'active', 'completed'])->default('draft');
            $table->text('llm_prompt_used')->nullable();
            $table->json('llm_response_raw')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->integer('total_estimated_minutes')->default(0);
            $table->integer('completed_tasks_count')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'session_date']);
            $table->index(['user_id', 'session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('focus_sessions');
    }
};
