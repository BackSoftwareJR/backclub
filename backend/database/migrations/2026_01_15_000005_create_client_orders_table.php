<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique()->comment('Numero ordine univoco');
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->enum('status', ['pending', 'confirmed', 'processing', 'completed', 'cancelled'])->default('pending');
            $table->decimal('total_amount', 10, 2)->comment('Importo totale ordine');
            $table->decimal('discount_amount', 10, 2)->default(0)->comment('Importo sconto applicato');
            $table->decimal('final_amount', 10, 2)->comment('Importo finale dopo sconti');
            $table->json('items')->comment('Array JSON con i prodotti/servizi ordinati');
            $table->text('notes')->nullable()->comment('Note ordine');
            $table->date('order_date')->comment('Data ordine');
            $table->date('delivery_date')->nullable()->comment('Data consegna prevista');
            $table->string('payment_method', 50)->nullable()->comment('Metodo di pagamento');
            $table->enum('payment_status', ['pending', 'partial', 'paid', 'refunded'])->default('pending');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index('client_id');
            $table->index('status');
            $table->index('order_date');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_orders');
    }
};

