<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_ai_chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organic_web_project_id')->index();
            $table->unsignedBigInteger('report_id')->nullable()->index();
            $table->string('title', 512)->default('Nuova Chat');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_ai_chat_sessions');
    }
};
