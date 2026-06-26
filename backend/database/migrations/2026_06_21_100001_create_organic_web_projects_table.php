<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_web_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_project_id')->constrained('crm_projects')->onDelete('cascade');
            $table->string('website_url');
            $table->enum('blog_platform', ['wordpress', 'webflow', 'custom', 'other'])->default('wordpress');
            $table->string('blog_api_url')->nullable();
            $table->text('blog_api_key_encrypted')->nullable();
            $table->text('blog_api_token_encrypted')->nullable();
            $table->string('gsc_property_id')->nullable();
            $table->json('target_keywords')->nullable();
            $table->text('tone_of_voice')->nullable();
            $table->text('target_audience')->nullable();
            $table->integer('posting_frequency')->default(4);
            $table->json('active_skills')->nullable();
            $table->string('language', 10)->default('it');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_audit_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_web_projects');
    }
};
