<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('seller_calendar_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seller_id')->nullable()->comment('ID del venditore (opzionale, può essere null se si usa user_id)');
            $table->enum('type', ['event', 'call', 'deadline', 'reminder', 'task'])->default('event');
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('location', 255)->nullable()->comment('Per eventi');
            $table->string('call_link', 500)->nullable()->comment('Per call');
            $table->text('call_notes')->nullable()->comment('Per call');
            $table->string('deadline_type', 100)->nullable()->comment('Per scadenze');
            $table->string('color', 7)->nullable()->comment('Colore esadecimale');
            $table->json('checklist_items')->nullable()->comment('Checklist per eventi');
            $table->boolean('has_checklist')->default(false);
            $table->unsignedBigInteger('created_by')->comment('ID utente che ha creato l\'evento');
            $table->dateTime('completed_at')->nullable();
            $table->unsignedBigInteger('completed_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('seller_id');
            $table->index('start_time');
            $table->index('type');
            $table->index('created_by');
            
            $table->foreign('created_by')->references('id')->on('users')->onDelete('restrict');
        });

        // Tabella visibilità eventi (per eventi condivisi tra seller, se necessario in futuro)
        Schema::create('seller_calendar_event_visibility', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('event_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->unique(['event_id', 'user_id']);
            $table->index('event_id');
            $table->index('user_id');
            
            $table->foreign('event_id')->references('id')->on('seller_calendar_events')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        // Tabella notifiche call
        Schema::create('seller_calendar_call_notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('call_id');
            $table->enum('notification_type', ['email', 'in_app']);
            $table->integer('minutes_before')->comment('Minuti prima della call (10 o 5)');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index('call_id');
            $table->index('sent_at');
            
            $table->foreign('call_id')->references('id')->on('seller_calendar_events')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seller_calendar_call_notifications');
        Schema::dropIfExists('seller_calendar_event_visibility');
        Schema::dropIfExists('seller_calendar_events');
    }
};
