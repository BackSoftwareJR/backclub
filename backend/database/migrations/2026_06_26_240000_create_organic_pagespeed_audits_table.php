<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_pagespeed_audits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->string('url', 2048);
            $table->enum('device', ['mobile', 'desktop'])->default('mobile');
            $table->tinyInteger('performance_score')->unsigned()->nullable()->comment('0-100');
            $table->double('lcp', 8, 3)->nullable()->comment('Largest Contentful Paint in seconds');
            $table->double('cls', 8, 4)->nullable()->comment('Cumulative Layout Shift');
            $table->double('fid', 8, 3)->nullable()->comment('First Input Delay in ms');
            $table->json('opportunities')->nullable();
            $table->timestamps();
        });

        DB::connection('mysql_marketing')->statement(
            'ALTER TABLE organic_pagespeed_audits ADD INDEX idx_url (url(191))'
        );
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_pagespeed_audits');
    }
};
