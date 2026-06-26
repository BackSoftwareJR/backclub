<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('organic_project_google_integrations', function (Blueprint $table) {
            $table->id();
            // Cross-DB reference: organic_web_project_id → mysql_marketing.organic_web_projects (same DB — FK ok)
            $table->foreignId('organic_web_project_id')
                ->unique()
                ->constrained('organic_web_projects')
                ->cascadeOnDelete();
            // Cross-DB reference: user_id → main_db.users (no FK constraint possible cross-DB)
            $table->unsignedBigInteger('user_id')->index();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamp('connected_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('organic_project_google_integrations');
    }
};
