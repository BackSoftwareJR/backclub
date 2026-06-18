<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_department_id')->constrained('crm_departments')->onDelete('cascade');
            $table->enum('type', ['abbonamento', 'spesa_prevista', 'spesa_imprevista', 'servizio', 'altro']);
            $table->string('name')->comment('Nome spesa/abbonamento');
            $table->text('description')->nullable();
            $table->decimal('amount', 15, 2);
            $table->enum('frequency', ['once', 'monthly', 'quarterly', 'yearly'])->default('once');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'expired'])->default('active');
            $table->string('category', 100)->nullable()->comment('Categoria spesa');
            $table->foreignId('related_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('related_project_id')->nullable()->constrained('projects')->onDelete('set null');
            $table->string('attachment_url', 500)->nullable()->comment('Path PDF/documento');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index('crm_department_id');
            $table->index('type');
            $table->index('status');
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_expenses');
    }
};
