<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_workspace_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('workspace_type_code');
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->unique(['user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_workspace_preferences');
    }
};