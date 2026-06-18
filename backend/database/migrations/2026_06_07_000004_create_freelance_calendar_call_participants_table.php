<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('freelance_calendar_call_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained('freelance_calendar_events')->cascadeOnDelete();
            $table->string('email');
            $table->string('name')->nullable();
            $table->string('google_attendee_id', 255)->nullable();
            $table->timestamps();

            $table->index('call_id');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('freelance_calendar_call_participants');
    }
};
