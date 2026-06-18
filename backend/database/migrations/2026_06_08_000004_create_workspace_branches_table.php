<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('crm_projects')->cascadeOnDelete();
            $table->string('workspace_type_code');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('git_branch')->nullable();
            $table->string('color')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_branches');
    }
};