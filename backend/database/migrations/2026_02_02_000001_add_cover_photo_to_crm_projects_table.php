<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiunge il campo cover_photo alla tabella crm_projects per la foto copertina del progetto.
     */
    public function up(): void
    {
        Schema::table('crm_projects', function (Blueprint $table) {
            $table->string('cover_photo', 500)->nullable()->after('settings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('crm_projects', function (Blueprint $table) {
            $table->dropColumn('cover_photo');
        });
    }
};
