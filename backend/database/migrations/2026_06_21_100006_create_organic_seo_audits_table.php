<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organic_seo_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organic_project_id')->constrained('organic_web_projects')->onDelete('cascade');
            $table->foreignId('skill_run_id')->nullable()->constrained('organic_skill_runs')->nullOnDelete();
            $table->date('audit_date');
            $table->integer('overall_score')->nullable();
            $table->integer('pages_crawled')->default(0);
            $table->json('issues')->nullable();
            $table->json('recommendations')->nullable();
            $table->integer('critical_count')->default(0);
            $table->integer('warning_count')->default(0);
            $table->integer('info_count')->default(0);
            $table->json('raw_crawl_data')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organic_seo_audits');
    }
};
