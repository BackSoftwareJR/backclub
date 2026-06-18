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
        // Tabella payment_plans
        Schema::create('payment_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contract_id')->nullable()->comment('FK a contracts');
            $table->unsignedBigInteger('quote_id')->nullable()->comment('FK a quotes');
            $table->unsignedBigInteger('project_id')->nullable()->comment('FK a projects');
            $table->unsignedBigInteger('client_id')->comment('FK a clients');
            $table->enum('status', ['pending', 'active', 'suspended', 'completed', 'cancelled'])->default('pending');
            $table->decimal('total_amount', 10, 2);
            $table->string('currency', 3)->default('EUR');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('contract_id');
            $table->index('quote_id');
            $table->index('project_id');
            $table->index('client_id');
            $table->index('status');
        });

        // Tabella payment_plan_installments
        Schema::create('payment_plan_installments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payment_plan_id');
            $table->integer('installment_number');
            $table->date('due_date');
            $table->decimal('amount', 10, 2);
            $table->string('description', 255)->nullable();
            $table->unsignedBigInteger('invoice_id')->nullable()->comment('FK a invoices quando emessa');
            $table->enum('status', ['pending', 'invoiced', 'paid', 'overdue', 'cancelled'])->default('pending');
            $table->enum('payment_type', ['installment', 'renewal', 'reimbursement', 'one_time'])->default('installment');
            $table->enum('payment_schedule_type', ['30_40_30', '30_60_days', 'installments', 'tantum', 'custom'])->nullable();
            $table->string('color_code', 7)->nullable()->comment('Colore per visualizzazione calendario');
            $table->timestamps();
            
            $table->foreign('payment_plan_id')->references('id')->on('payment_plans')->onDelete('cascade');
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('set null');
            $table->index('payment_plan_id');
            $table->index('due_date');
            $table->index('status');
        });

        // Tabella payment_plan_renewals
        Schema::create('payment_plan_renewals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payment_plan_id');
            $table->enum('renewal_type', ['fixed', 'variable'])->comment('Fissa o variabile');
            $table->enum('frequency', ['monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly', 'one_time']);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->integer('months_count')->comment('Per quanti mesi');
            $table->decimal('fixed_amount', 10, 2)->nullable()->comment('Se fixed');
            $table->json('variable_amounts')->nullable()->comment('Array di importi se variable: [{amount, label}]');
            $table->string('current_month_formula', 100)->nullable()->comment('Formula applicata questo mese (per variable)');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->foreign('payment_plan_id')->references('id')->on('payment_plans')->onDelete('cascade');
            $table->index('payment_plan_id');
            $table->index('is_active');
        });

        // Tabella invoice_reserve_allocations
        Schema::create('invoice_reserve_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id');
            $table->unsignedBigInteger('serbatoio_id')->comment('FK a serbatoi');
            $table->decimal('amount', 10, 2);
            $table->decimal('percentage', 5, 2)->nullable()->comment('Percentuale del totale');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('serbatoio_id')->references('id')->on('serbatoi');
            $table->index('invoice_id');
            $table->index('serbatoio_id');
        });

        // Tabella invoice_bollo_transactions
        Schema::create('invoice_bollo_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id');
            $table->unsignedBigInteger('serbatoio_id')->default(9)->comment('Riserva Bollo');
            $table->decimal('amount', 10, 2)->default(2.00);
            $table->date('transaction_date');
            $table->timestamps();
            
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('serbatoio_id')->references('id')->on('serbatoi');
            $table->index('invoice_id');
        });

        // Aggiungi foreign key per payment_plan_id in invoices
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreign('payment_plan_id')->references('id')->on('payment_plans')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['payment_plan_id']);
        });

        Schema::dropIfExists('invoice_bollo_transactions');
        Schema::dropIfExists('invoice_reserve_allocations');
        Schema::dropIfExists('payment_plan_renewals');
        Schema::dropIfExists('payment_plan_installments');
        Schema::dropIfExists('payment_plans');
    }
};
