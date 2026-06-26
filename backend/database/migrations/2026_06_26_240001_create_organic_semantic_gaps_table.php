<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_semantic_gaps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->string('url', 2048);
            $table->string('target_keyword', 512);
            $table->json('missing_entities')->nullable();
            $table->text('ai_suggested_paragraph')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_semantic_gaps');
    }
};
