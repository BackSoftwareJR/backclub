<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->table('organic_gsc_url_details', function (Blueprint $table) {
            $table->json('inspection_result')->nullable()->after('errors_json');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->table('organic_gsc_url_details', function (Blueprint $table) {
            $table->dropColumn('inspection_result');
        });
    }
};
