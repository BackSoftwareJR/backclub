<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->table('organic_pagespeed_audits', function (Blueprint $table) {
            // Metriche complete (valori numerici raw)
            $table->double('fcp', 8, 3)->nullable()->comment('First Contentful Paint in seconds')->after('fid');
            $table->double('ttfb', 8, 3)->nullable()->comment('Time to First Byte in seconds')->after('fcp');
            $table->double('tti', 8, 3)->nullable()->comment('Time to Interactive in seconds')->after('ttfb');
            $table->double('tbt', 8, 3)->nullable()->comment('Total Blocking Time in ms')->after('tti');
            $table->double('speed_index', 8, 3)->nullable()->comment('Speed Index in seconds')->after('tbt');

            // Punteggi categoria (0-100)
            $table->tinyInteger('accessibility_score')->unsigned()->nullable()->after('speed_index');
            $table->tinyInteger('best_practices_score')->unsigned()->nullable()->after('accessibility_score');
            $table->tinyInteger('seo_score')->unsigned()->nullable()->after('best_practices_score');

            // Report completo
            $table->longText('audits_json')->nullable()->comment('JSON completo di tutti gli audit PSI')->after('seo_score');
            $table->longText('diagnostics_json')->nullable()->comment('JSON diagnostics')->after('audits_json');
            $table->longText('passed_audits_json')->nullable()->comment('Audit superati')->after('diagnostics_json');

            // AI suggestions
            $table->longText('ai_suggestions_json')->nullable()->comment('Suggerimenti AI raggruppati per criticità')->after('passed_audits_json');
            $table->timestamp('ai_suggestions_generated_at')->nullable()->after('ai_suggestions_json');

            // Stato
            $table->enum('status', ['pending', 'completed', 'failed'])->default('completed')->after('ai_suggestions_generated_at');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->table('organic_pagespeed_audits', function (Blueprint $table) {
            $table->dropColumn([
                'fcp',
                'ttfb',
                'tti',
                'tbt',
                'speed_index',
                'accessibility_score',
                'best_practices_score',
                'seo_score',
                'audits_json',
                'diagnostics_json',
                'passed_audits_json',
                'ai_suggestions_json',
                'ai_suggestions_generated_at',
                'status',
            ]);
        });
    }
};
