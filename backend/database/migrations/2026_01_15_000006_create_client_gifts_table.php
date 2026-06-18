<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_gifts', function (Blueprint $table) {
            $table->id();
            $table->string('title')->comment('Titolo regalo');
            $table->text('description')->comment('Descrizione regalo');
            $table->enum('gift_type', ['discount', 'service', 'credit', 'custom'])->default('discount')->comment('Tipo regalo');
            $table->decimal('discount_percentage', 5, 2)->nullable()->comment('Percentuale sconto (se tipo discount)');
            $table->decimal('credit_amount', 10, 2)->nullable()->comment('Importo credito (se tipo credit)');
            $table->foreignId('service_id')->nullable()->constrained('price_list_items')->onDelete('set null')->comment('Servizio incluso (se tipo service)');
            $table->json('client_ids')->comment('Array di ID clienti destinatari');
            $table->date('valid_from')->comment('Data inizio validità');
            $table->date('valid_until')->comment('Data fine validità');
            $table->text('email_subject')->nullable()->comment('Oggetto email');
            $table->text('email_body')->nullable()->comment('Corpo email (HTML)');
            $table->enum('email_status', ['draft', 'scheduled', 'sent', 'failed'])->default('draft')->comment('Stato invio email');
            $table->timestamp('email_sent_at')->nullable()->comment('Data invio email');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index('gift_type');
            $table->index('is_active');
            $table->index(['valid_from', 'valid_until']);
            $table->index('email_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_gifts');
    }
};

