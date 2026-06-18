<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_department_id')->constrained('crm_departments')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('role', 100)->nullable()->comment('Ruolo nel team');
            $table->decimal('allocation_percentage', 5, 2)->default(100)->comment('Percentuale allocazione (0-100)');
            $table->decimal('cocchi_budget', 15, 2)->default(0)->comment('Budget cocchi assegnato');
            $table->decimal('cocchi_spent', 15, 2)->default(0)->comment('Cocchi spesi');
            $table->boolean('is_active')->default(true);
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamps();
            
            $table->unique(['crm_department_id', 'user_id'], 'unique_crm_user');
            $table->index('crm_department_id');
            $table->index('user_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_team_members');
    }
};
