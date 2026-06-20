<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('focus_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('crm_task_id')->nullable()->constrained('crm_project_tasks')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('cognitive_load', ['deep_work', 'creative', 'repetitive', 'meetings', 'admin']);
            $table->enum('deadline_type', ['hard', 'soft', 'none'])->default('none');
            $table->date('due_date')->nullable();
            $table->time('due_time')->nullable();
            $table->integer('estimated_minutes')->default(60);
            $table->integer('priority_score')->default(50);
            $table->enum('status', ['pending', 'in_progress', 'completed', 'skipped'])->default('pending');
            $table->json('tags')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('focus_tasks');
    }
};
