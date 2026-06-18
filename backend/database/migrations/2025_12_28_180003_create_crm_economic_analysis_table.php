<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_economic_analysis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_department_id')->constrained('crm_departments')->onDelete('cascade');
            $table->enum('period_type', ['monthly', 'quarterly', 'yearly']);
            $table->integer('period_year');
            $table->integer('period_month')->nullable()->comment('NULL per yearly');
            $table->integer('period_quarter')->nullable()->comment('NULL per monthly/yearly');
            $table->decimal('revenue_generated', 15, 2)->default(0)->comment('Ricavi generati');
            $table->decimal('budget_used', 15, 2)->default(0)->comment('Budget utilizzato');
            $table->integer('projects_completed')->default(0);
            $table->integer('team_size')->default(0);
            $table->decimal('client_satisfaction', 3, 2)->nullable()->comment('Score 0-5');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->unique(['crm_department_id', 'period_type', 'period_year', 'period_month', 'period_quarter'], 'unique_period');
            $table->index(['period_year', 'period_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_economic_analysis');
    }
};
