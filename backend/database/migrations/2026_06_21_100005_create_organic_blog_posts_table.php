<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_blog_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organic_project_id')->constrained('organic_web_projects')->onDelete('cascade');
            $table->foreignId('skill_run_id')->nullable()->constrained('organic_skill_runs')->nullOnDelete();
            $table->string('title');
            $table->string('target_keyword')->nullable();
            $table->json('secondary_keywords')->nullable();
            $table->enum('status', ['planned', 'writing', 'review', 'approved', 'published', 'rejected'])->default('planned');
            $table->date('scheduled_date')->nullable();
            $table->timestamp('published_date')->nullable();
            $table->string('published_url')->nullable();
            $table->longText('content')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->integer('word_count')->nullable();
            $table->integer('seo_score')->nullable();
            $table->boolean('human_approved')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_blog_posts');
    }
};
