<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE serbatoio_transactions MODIFY COLUMN type ENUM(
            'auto_income',
            'manual_transfer_in',
            'manual_transfer_out',
            'expense',
            'adjustment',
            'invoice_bollo',
            'invoice_payment'
        ) NOT NULL");
    }

    public function down(): void
    {
        // Opzionale: rimuovere i nuovi valori richiederebbe di aggiornare/eliminare le righe esistenti
        DB::statement("ALTER TABLE serbatoio_transactions MODIFY COLUMN type ENUM(
            'auto_income',
            'manual_transfer_in',
            'manual_transfer_out',
            'expense',
            'adjustment'
        ) NOT NULL");
    }
};
