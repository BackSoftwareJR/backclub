<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('focus_session_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('focus_session_id')->constrained('focus_sessions')->cascadeOnDelete();
            $table->foreignId('focus_task_id')->nullable()->constrained('focus_tasks')->nullOnDelete();
            $table->enum('slot_type', ['task', 'break', 'buffer', 'lunch']);
            $table->string('title');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('duration_minutes');
            $table->boolean('is_completed')->default(false);
            $table->integer('sort_order')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['focus_session_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('focus_session_slots');
    }
};
