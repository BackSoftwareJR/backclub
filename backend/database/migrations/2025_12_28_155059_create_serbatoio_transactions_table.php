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
        Schema::create('serbatoio_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('serbatoio_id')->constrained('serbatoi')->onDelete('cascade');
            $table->enum('type', ['auto_income', 'manual_transfer_in', 'manual_transfer_out', 'expense', 'adjustment']);
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_before', 15, 2)->default(0);
            $table->decimal('balance_after', 15, 2)->default(0);
            $table->foreignId('from_serbatoio_id')->nullable()->constrained('serbatoi')->onDelete('set null');
            $table->foreignId('to_serbatoio_id')->nullable()->constrained('serbatoi')->onDelete('set null');
            $table->text('reason')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index('serbatoio_id');
            $table->index('type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('serbatoio_transactions');
    }
};
