<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_focus_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->unique()->onDelete('cascade');

            $table->time('preferred_start_time')->default('09:00');
            $table->time('preferred_end_time')->default('18:00');
            $table->tinyInteger('max_daily_hours')->unsigned()->default(8);

            $table->boolean('lunch_break_enabled')->default(true);
            $table->time('lunch_start_time')->default('13:00');
            $table->smallInteger('lunch_duration_minutes')->unsigned()->default(60);

            $table->smallInteger('preferred_focus_block_duration')->unsigned()->default(90);
            $table->smallInteger('break_between_focus_blocks')->unsigned()->default(15);

            $table->json('working_days')->default('[1,2,3,4,5]');

            $table->enum('preferred_cognitive_morning', [
                'deep_work', 'creative', 'repetitive', 'meetings', 'admin',
            ])->default('deep_work');

            $table->enum('preferred_cognitive_afternoon', [
                'deep_work', 'creative', 'repetitive', 'meetings', 'admin',
            ])->default('repetitive');

            $table->boolean('rest_reminder_enabled')->default(true);
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_focus_preferences');
    }
};
