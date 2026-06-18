<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_project_tasks', 'exact_prompt')) {
                $table->boolean('exact_prompt')
                    ->default(false)
                    ->after('execution_mode')
                    ->comment('When true, skip Groq AI prompt enhancement in n8n');
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_project_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('crm_project_tasks', 'exact_prompt')) {
                $table->dropColumn('exact_prompt');
            }
        });
    }
};
