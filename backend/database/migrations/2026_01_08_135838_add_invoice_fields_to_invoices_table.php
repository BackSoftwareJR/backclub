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
        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('type', ['invoice', 'credit_note'])->default('invoice')->after('status');
            $table->unsignedBigInteger('credit_note_for_invoice_id')->nullable()->after('type');
            $table->string('invoice_link', 500)->nullable()->after('document_path');
            $table->string('receipt_link', 500)->nullable()->after('invoice_link');
            $table->decimal('bollo_amount', 10, 2)->default(2.00)->after('total_cocchi');
            $table->decimal('amount_before_bollo', 10, 2)->nullable()->after('bollo_amount');
            $table->unsignedBigInteger('payment_plan_id')->nullable()->after('project_id');
            $table->integer('installment_number')->nullable()->after('payment_plan_id');
            
            $table->foreign('credit_note_for_invoice_id')->references('id')->on('invoices')->onDelete('set null');
            $table->index('payment_plan_id');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['credit_note_for_invoice_id']);
            $table->dropIndex(['payment_plan_id']);
            $table->dropIndex(['type']);
            $table->dropColumn([
                'type',
                'credit_note_for_invoice_id',
                'invoice_link',
                'receipt_link',
                'bollo_amount',
                'amount_before_bollo',
                'payment_plan_id',
                'installment_number'
            ]);
        });
    }
};
