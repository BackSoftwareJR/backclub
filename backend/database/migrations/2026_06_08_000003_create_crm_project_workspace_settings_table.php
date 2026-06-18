<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_project_workspace_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('crm_projects')->cascadeOnDelete();
            $table->string('workspace_type_code');
            $table->boolean('is_enabled')->default(false);
            $table->string('staging_url')->nullable();
            $table->string('preview_url')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'workspace_type_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_project_workspace_settings');
    }
};