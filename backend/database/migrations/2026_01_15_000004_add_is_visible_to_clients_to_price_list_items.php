<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('price_list_items', function (Blueprint $table) {
            if (!Schema::hasColumn('price_list_items', 'is_visible_to_clients')) {
                $table->boolean('is_visible_to_clients')->default(false)->after('is_active')->comment('Visibile ai clienti nell\'e-commerce');
            }
        });
    }

    public function down(): void
    {
        Schema::table('price_list_items', function (Blueprint $table) {
            if (Schema::hasColumn('price_list_items', 'is_visible_to_clients')) {
                $table->dropColumn('is_visible_to_clients');
            }
        });
    }
};

