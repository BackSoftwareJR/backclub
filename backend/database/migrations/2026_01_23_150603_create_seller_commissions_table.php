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
        Schema::create('seller_commissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seller_id')->comment('FK a sellers');
            $table->unsignedBigInteger('contract_id')->comment('FK a contracts');
            $table->unsignedBigInteger('payment_plan_id')->comment('FK a payment_plans');
            $table->unsignedBigInteger('invoice_id')->nullable()->comment('FK a invoices');
            $table->unsignedBigInteger('installment_id')->nullable()->comment('FK a payment_plan_installments');
            $table->decimal('amount', 10, 2)->comment('Importo commissione');
            $table->decimal('commission_rate', 5, 2)->comment('Percentuale commissione usata');
            $table->enum('status', ['pending', 'pending_collection', 'collected'])->default('pending');
            $table->timestamp('invoice_issued_at')->nullable()->comment('Quando fattura emessa');
            $table->timestamp('invoice_paid_at')->nullable()->comment('Quando fattura saldata');
            $table->timestamp('collected_at')->nullable()->comment('Quando commissione riscossa');
            $table->string('receipt_link', 500)->nullable()->comment('Link ricevuta pagamento');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->foreign('seller_id')->references('id')->on('sellers')->onDelete('cascade');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');
            $table->foreign('payment_plan_id')->references('id')->on('payment_plans')->onDelete('cascade');
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('set null');
            $table->foreign('installment_id')->references('id')->on('payment_plan_installments')->onDelete('set null');
            
            $table->index('seller_id');
            $table->index('contract_id');
            $table->index('payment_plan_id');
            $table->index('invoice_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seller_commissions');
    }
};
