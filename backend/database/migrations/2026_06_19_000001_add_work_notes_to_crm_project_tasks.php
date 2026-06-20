<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            $table->longText('work_notes')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            $table->dropColumn('work_notes');
        });
    }
};
