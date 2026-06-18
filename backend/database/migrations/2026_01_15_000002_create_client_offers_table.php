<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_offers', function (Blueprint $table) {
            $table->id();
            $table->string('title')->comment('Titolo offerta');
            $table->text('description')->comment('Descrizione offerta');
            $table->decimal('discount_percentage', 5, 2)->comment('Percentuale di sconto');
            $table->json('service_ids')->nullable()->comment('Array di ID servizi inclusi nell\'offerta');
            $table->json('client_ids')->nullable()->comment('Array di ID clienti a cui è riservata l\'offerta (null = tutti)');
            $table->date('valid_from')->comment('Data inizio validità');
            $table->date('valid_until')->comment('Data fine validità');
            $table->boolean('is_active')->default(true);
            $table->string('image_url', 500)->nullable()->comment('URL immagine promozionale');
            $table->text('terms_conditions')->nullable()->comment('Termini e condizioni');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index('is_active');
            $table->index(['valid_from', 'valid_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_offers');
    }
};

