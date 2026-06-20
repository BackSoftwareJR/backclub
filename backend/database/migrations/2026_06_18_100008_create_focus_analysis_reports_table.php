<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('focus_analysis_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('report_type', ['overview', 'project', 'synthesis']);
            $table->unsignedInteger('subject_id')->nullable();
            $table->string('subject_name', 255);
            $table->enum('status', ['pending', 'analyzing', 'ready', 'stale'])->default('pending');
            $table->json('content')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('analyzed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'report_type', 'status'], 'far_user_type_status');
            $table->index(['user_id', 'subject_id'], 'far_user_subject');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('focus_analysis_reports');
    }
};
