<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('project_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_project_id')->constrained('crm_projects')->onDelete('cascade');
            $table->enum('type', ['project', 'user'])->default('project')->comment('project = spesa progetto, user = spesa per utente');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null')->comment('Utente se type=user');
            $table->string('title', 255)->comment('Titolo breve della spesa');
            $table->text('description')->nullable()->comment('Descrizione dettagliata');
            $table->decimal('amount_cocchi', 15, 2)->comment('Importo in cocchi');
            $table->date('expense_date')->comment('Data della spesa');
            $table->string('category', 100)->nullable()->comment('Categoria spesa');
            $table->enum('status', ['pending', 'approved', 'rejected', 'paid'])->default('pending')->comment('Stato approvazione');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->string('payment_method', 100)->nullable()->comment('Metodo di pagamento');
            $table->string('receipt_file_path', 500)->nullable()->comment('Path ricevuta/screenshot');
            $table->string('receipt_file_name', 255)->nullable();
            $table->boolean('is_reimbursement_request')->default(false)->comment('Se è una richiesta di rimborso');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('crm_project_id');
            $table->index('type');
            $table->index('user_id');
            $table->index('status');
            $table->index('expense_date');
            $table->index('is_reimbursement_request');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_expenses');
    }
};

