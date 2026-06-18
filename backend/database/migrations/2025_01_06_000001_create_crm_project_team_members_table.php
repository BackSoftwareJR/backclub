<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_project_team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_project_id')->constrained('crm_projects')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('role', 100)->nullable()->comment('Ruolo nel progetto');
            $table->boolean('is_active')->default(true);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
            
            $table->unique(['crm_project_id', 'user_id'], 'unique_crm_project_user');
            $table->index('crm_project_id');
            $table->index('user_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_project_team_members');
    }
};

