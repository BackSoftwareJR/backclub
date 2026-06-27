<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_pagespeed_verifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->unsignedBigInteger('audit_id')->nullable()->index();
            $table->text('implementation_context');
            $table->string('github_repo_url', 512);
            $table->json('verification_result')->nullable();
            $table->tinyInteger('quality_score')->unsigned()->nullable();
            $table->boolean('completed')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_pagespeed_verifications');
    }
};
