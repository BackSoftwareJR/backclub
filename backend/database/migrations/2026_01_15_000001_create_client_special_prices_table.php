<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_special_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('service_id')->constrained('price_list_items')->onDelete('cascade');
            $table->decimal('price', 10, 2)->comment('Prezzo speciale per il cliente');
            $table->decimal('original_price', 10, 2)->comment('Prezzo originale del servizio');
            $table->decimal('discount_percentage', 5, 2)->default(0)->comment('Percentuale di sconto');
            $table->boolean('is_active')->default(true);
            $table->date('valid_from')->nullable()->comment('Data inizio validità');
            $table->date('valid_until')->nullable()->comment('Data fine validità');
            $table->text('notes')->nullable()->comment('Note aggiuntive');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index('client_id');
            $table->index('service_id');
            $table->index('is_active');
            $table->index(['valid_from', 'valid_until']);
            
            // Evita prezzi speciali duplicati per lo stesso cliente e servizio
            $table->unique(['client_id', 'service_id'], 'unique_client_service_price');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_special_prices');
    }
};

