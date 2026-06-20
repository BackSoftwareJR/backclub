<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_work_patterns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->unique();
            $table->json('peak_hours')->nullable();
            $table->decimal('avg_estimation_accuracy', 5, 2)->default(1.00);
            $table->json('preferred_cognitive_loads')->nullable();
            $table->integer('total_tasks_completed')->default(0);
            $table->integer('avg_deep_work_minutes')->default(90);
            $table->tinyInteger('fatigue_threshold_hour')->default(15);
            $table->timestamp('last_recalculated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_work_patterns');
    }
};
