<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('focus_daily_checkins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->tinyInteger('energy_level')->unsigned();
            $table->decimal('available_hours', 4, 2);
            $table->json('selected_project_ids')->nullable();
            $table->json('fixed_events')->nullable();
            $table->text('special_priority')->nullable();
            $table->text('free_note')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
            $table->index(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('focus_daily_checkins');
    }
};
