<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timelines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#6366f1');
            $table->timestamps();
        });

        Schema::create('timeline_phases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('timeline_id')->constrained('timelines')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('color', 7)->default('#8b5cf6');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('timeline_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('phase_id')->constrained('timeline_phases')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('date_order')->nullable();
            $table->boolean('is_completed')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('timeline_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('step_id')->constrained('timeline_steps')->cascadeOnDelete();
            $table->string('text', 500);
            $table->boolean('is_completed')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timeline_checklist_items');
        Schema::dropIfExists('timeline_steps');
        Schema::dropIfExists('timeline_phases');
        Schema::dropIfExists('timelines');
    }
};
