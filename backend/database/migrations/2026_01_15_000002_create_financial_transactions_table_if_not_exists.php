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
        // Crea la tabella solo se non esiste già
        if (!Schema::hasTable('financial_transactions')) {
            Schema::create('financial_transactions', function (Blueprint $table) {
                $table->id();
                $table->enum('type', ['entrata', 'uscita'])->comment('Tipo transazione');
                $table->decimal('amount_cocchi', 10, 2)->comment('Importo in cocchi');
                $table->text('description')->nullable()->comment('Descrizione transazione');
                $table->string('category', 100)->nullable()->comment('Categoria');
                $table->foreignId('project_id')->nullable()->constrained('crm_projects')->onDelete('set null');
                $table->foreignId('client_id')->nullable()->constrained('clients')->onDelete('set null');
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null')->comment('Utente che ha registrato la transazione');
                $table->date('transaction_date')->comment('Data transazione');
                $table->string('reference_number', 100)->nullable()->comment('Numero riferimento');
                $table->string('document_path', 255)->nullable()->comment('Path documento');
                $table->timestamps();
                
                $table->index('project_id');
                $table->index('client_id');
                $table->index('user_id');
                $table->index('type');
                $table->index('transaction_date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non eliminiamo la tabella se esiste già (potrebbe contenere dati)
        // Schema::dropIfExists('financial_transactions');
    }
};

