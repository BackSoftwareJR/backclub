<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection('mysql_marketing')->table('organic_project_google_integrations', function (Blueprint $table) {
            $table->string('gsc_property_url', 512)->nullable()->after('connected_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql_marketing')->table('organic_project_google_integrations', function (Blueprint $table) {
            $table->dropColumn('gsc_property_url');
        });
    }
};
