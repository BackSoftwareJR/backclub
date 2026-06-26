<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_ai_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->string('title', 512)->nullable();
            $table->longText('deep_analysis_markdown')->nullable();
            $table->string('model_used', 128)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_ai_reports');
    }
};
