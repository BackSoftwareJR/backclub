<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_branch_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('workspace_branches')->cascadeOnDelete();
            $table->string('role');
            $table->timestamps();

            $table->unique(['branch_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_branch_roles');
    }
};