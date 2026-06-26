<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_gsc_page_queries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organic_web_project_id');
            $table->date('date');
            $table->string('page_url', 2048);
            $table->string('query', 512);
            $table->unsignedInteger('clicks')->default(0);
            $table->unsignedInteger('impressions')->default(0);
            $table->double('ctr', 8, 4)->nullable();
            $table->double('position', 8, 4)->nullable();
            $table->timestamps();

            $table->index(['organic_web_project_id', 'date']);
            $table->index(['organic_web_project_id', 'page_url', 'date']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_gsc_page_queries');
    }
};
