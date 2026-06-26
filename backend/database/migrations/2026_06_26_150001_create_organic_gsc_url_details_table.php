<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_gsc_url_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->string('url', 2048);
            $table->string('indexing_status', 64)->nullable();
            $table->timestamp('last_crawled')->nullable();
            $table->string('canonical_url', 2048)->nullable();
            $table->string('mobile_usability', 64)->nullable();
            $table->string('coverage_state', 128)->nullable();
            $table->boolean('blocked_by_robots')->default(false);
            $table->json('errors_json')->nullable();
            $table->timestamps();

            $table->index(['organic_web_project_id', 'indexing_status']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_gsc_url_details');
    }
};
