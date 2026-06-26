<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->create('user_google_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('google_email');
            $table->text('access_token');
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->json('scopes')->nullable();
            $table->string('calendar_id', 255)->default('primary');
            $table->boolean('auto_sync_calls')->default(true);
            $table->timestamp('connected_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->dropIfExists('user_google_integrations');
    }
};
