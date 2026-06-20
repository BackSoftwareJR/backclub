<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('focus_task_id')->nullable()->constrained('focus_tasks')->nullOnDelete();
            $table->foreignId('crm_task_id')->nullable()->constrained('crm_project_tasks')->nullOnDelete();
            $table->string('title_snapshot');
            $table->json('tags_snapshot')->nullable();
            $table->enum('cognitive_load', ['deep_work', 'creative', 'repetitive', 'meetings', 'admin']);
            $table->integer('estimated_minutes');
            $table->integer('actual_minutes');
            $table->tinyInteger('mental_fatigue_score');
            $table->tinyInteger('time_of_day_hour');
            $table->tinyInteger('day_of_week');
            $table->decimal('accuracy_ratio', 5, 2)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'cognitive_load']);
            $table->index(['user_id', 'time_of_day_hour']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_metrics');
    }
};
