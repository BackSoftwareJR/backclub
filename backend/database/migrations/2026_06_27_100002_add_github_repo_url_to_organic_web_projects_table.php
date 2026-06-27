<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql_marketing';

    public function up(): void
    {
        Schema::connection('mysql_marketing')->table('organic_web_projects', function (Blueprint $table) {
            $table->string('github_repo_url', 512)->nullable()->comment('URL repository GitHub del progetto')->after('website_url');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql_marketing')->table('organic_web_projects', function (Blueprint $table) {
            $table->dropColumn('github_repo_url');
        });
    }
};
