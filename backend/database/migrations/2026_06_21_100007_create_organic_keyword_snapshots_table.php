<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organic_keyword_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organic_project_id')->constrained('organic_web_projects')->onDelete('cascade');
            $table->date('snapshot_date');
            $table->integer('month');
            $table->integer('year');
            $table->json('raw_keywords')->nullable();
            $table->json('clustered_keywords')->nullable();
            $table->json('primary_cluster')->nullable();
            $table->json('search_intents')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organic_keyword_snapshots');
    }
};
