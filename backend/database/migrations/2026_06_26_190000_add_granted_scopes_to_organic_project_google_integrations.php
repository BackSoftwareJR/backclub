<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->table('organic_project_google_integrations', function (Blueprint $table) {
            // Stores the space-separated list of OAuth scopes actually granted by Google.
            // Used to detect tokens obtained with insufficient scopes (e.g. webmasters.readonly)
            // before attempting write operations like submitSitemap or deleteSitemap.
            $table->text('granted_scopes')->nullable()->after('connected_at');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->table('organic_project_google_integrations', function (Blueprint $table) {
            $table->dropColumn('granted_scopes');
        });
    }
};
