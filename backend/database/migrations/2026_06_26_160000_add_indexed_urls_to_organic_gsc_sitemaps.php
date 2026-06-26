<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->table('organic_gsc_sitemaps', function (Blueprint $table) {
            $table->unsignedInteger('indexed_urls')->default(0)->after('downloaded_urls');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->table('organic_gsc_sitemaps', function (Blueprint $table) {
            $table->dropColumn('indexed_urls');
        });
    }
};
