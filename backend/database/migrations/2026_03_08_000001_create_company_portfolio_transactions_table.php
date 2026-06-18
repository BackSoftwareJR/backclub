<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_portfolio_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50); // invoice_settled, expense, withdrawal
            $table->decimal('amount', 12, 2); // positivo = entrata, negativo = uscita
            $table->string('description', 500)->nullable();
            $table->string('reference_type', 50)->nullable(); // invoice, etc.
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->date('transaction_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_portfolio_transactions');
    }
};
