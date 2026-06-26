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
        // Tabella performance giornaliere GSC
        Schema::connection('mysql_marketing')->create('organic_gsc_performance_daily', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->date('date');
            $table->integer('clicks')->default(0);
            $table->integer('impressions')->default(0);
            $table->double('ctr')->nullable();
            $table->double('position')->nullable();
            $table->timestamps();

            $table->unique(['organic_web_project_id', 'date'], 'organic_gsc_performance_unique');
        });

        // Tabella sitemap GSC
        Schema::connection('mysql_marketing')->create('organic_gsc_sitemaps', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->string('path', 500);
            $table->timestamp('last_submitted')->nullable();
            $table->timestamp('last_downloaded')->nullable();
            $table->string('status', 50)->nullable();
            $table->integer('downloaded_urls')->default(0);
            $table->text('errors')->nullable();
            $table->timestamps();
        });

        // Tabella errori di indicizzazione GSC
        Schema::connection('mysql_marketing')->create('organic_gsc_indexing_errors', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->string('url', 500);
            $table->string('verdict', 100)->nullable();
            $table->string('coverage_state', 100)->nullable();
            $table->timestamp('last_scanned_at')->nullable();
            $table->timestamps();

            $table->index('url', 'organic_gsc_indexing_errors_url_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_gsc_indexing_errors');
        Schema::connection('mysql_marketing')->dropIfExists('organic_gsc_sitemaps');
        Schema::connection('mysql_marketing')->dropIfExists('organic_gsc_performance_daily');
    }
};
