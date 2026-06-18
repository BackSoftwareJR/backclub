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
        Schema::table('lead_activities', function (Blueprint $table) {
            // Aggiungi campo JSON per salvare i dettagli completi dell'email
            $table->json('email_details')->nullable()->after('outcome')->comment('Dettagli completi email (subject, body, to, from, html, attachments)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_activities', function (Blueprint $table) {
            $table->dropColumn('email_details');
        });
    }
};
