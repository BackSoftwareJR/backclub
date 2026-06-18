<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('price_list_items', function (Blueprint $table) {
            if (!Schema::hasColumn('price_list_items', 'technical_sheet_url')) {
                $table->string('technical_sheet_url', 500)->nullable()->after('landing_page_url')->comment('URL scheda tecnica');
            }
            if (!Schema::hasColumn('price_list_items', 'informative_document_path')) {
                $table->string('informative_document_path', 500)->nullable()->after('technical_sheet_url')->comment('Path documento informativo PDF');
            }
        });
    }

    public function down(): void
    {
        Schema::table('price_list_items', function (Blueprint $table) {
            if (Schema::hasColumn('price_list_items', 'technical_sheet_url')) {
                $table->dropColumn('technical_sheet_url');
            }
            if (Schema::hasColumn('price_list_items', 'informative_document_path')) {
                $table->dropColumn('informative_document_path');
            }
        });
    }
};
