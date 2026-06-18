<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_crm_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('crm_department_id')->nullable()->constrained('crm_departments')->onDelete('set null')->comment('NULL per allocazione globale');
            $table->foreignId('project_id')->nullable()->constrained('projects')->onDelete('set null')->comment('Progetto specifico');
            $table->decimal('cocchi_allocated', 15, 2)->default(0);
            $table->decimal('cocchi_used', 15, 2)->default(0);
            $table->date('allocation_date');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('crm_department_id');
            $table->index('project_id');
            $table->index('allocation_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_crm_allocations');
    }
};
