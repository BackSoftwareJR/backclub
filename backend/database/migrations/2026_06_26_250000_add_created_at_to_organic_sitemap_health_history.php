<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->table('organic_sitemap_health_history', function (Blueprint $table) {
            if (! Schema::connection('mysql_marketing')->hasColumn('organic_sitemap_health_history', 'created_at')) {
                $table->timestamp('created_at')->nullable()->after('recorded_at');
            }
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->table('organic_sitemap_health_history', function (Blueprint $table) {
            if (Schema::connection('mysql_marketing')->hasColumn('organic_sitemap_health_history', 'created_at')) {
                $table->dropColumn('created_at');
            }
        });
    }
};
