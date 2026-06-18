<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('freelance_calendar_events')) {
            Schema::create('freelance_calendar_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->enum('type', ['event', 'call', 'deadline', 'reminder', 'task'])->default('event');
                $table->string('title');
                $table->text('description')->nullable();
                $table->dateTime('start_time');
                $table->dateTime('end_time');
                $table->string('location', 255)->nullable();
                $table->string('call_link', 500)->nullable();
                $table->text('call_notes')->nullable();
                $table->string('deadline_type', 100)->nullable();
                $table->string('color', 7)->nullable();
                $table->json('checklist_items')->nullable();
                $table->boolean('has_checklist')->default(false);
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->dateTime('completed_at')->nullable();
                $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();

                $table->index('user_id');
                $table->index('start_time');
                $table->index('type');
            });
        }

        if (!Schema::hasTable('freelance_calendar_event_visibility')) {
            Schema::create('freelance_calendar_event_visibility', function (Blueprint $table) {
                $table->id();
                $table->foreignId('event_id')->constrained('freelance_calendar_events')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['event_id', 'user_id']);
            });
        }

        if (!Schema::hasTable('freelance_calendar_call_notifications')) {
            Schema::create('freelance_calendar_call_notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('call_id')->constrained('freelance_calendar_events')->cascadeOnDelete();
                $table->enum('notification_type', ['email', 'in_app']);
                $table->integer('minutes_before');
                $table->timestamp('sent_at')->nullable();
                $table->timestamps();

                $table->index('call_id');
                $table->index('sent_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('freelance_calendar_call_notifications');
        Schema::dropIfExists('freelance_calendar_event_visibility');
        Schema::dropIfExists('freelance_calendar_events');
    }
};
