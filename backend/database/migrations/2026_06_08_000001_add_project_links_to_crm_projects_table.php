<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_projects', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_projects', 'github_url')) {
                $table->string('github_url', 500)->nullable()->after('cover_photo');
            }
            if (!Schema::hasColumn('crm_projects', 'website_url')) {
                $table->string('website_url', 500)->nullable()->after('github_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_projects', function (Blueprint $table) {
            if (Schema::hasColumn('crm_projects', 'website_url')) {
                $table->dropColumn('website_url');
            }
            if (Schema::hasColumn('crm_projects', 'github_url')) {
                $table->dropColumn('github_url');
            }
        });
    }
};
