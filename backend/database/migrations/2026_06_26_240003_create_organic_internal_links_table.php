<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_internal_links', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->string('from_url', 2048);
            $table->string('to_url', 2048);
            $table->string('anchor_text', 512)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_internal_links');
    }
};
