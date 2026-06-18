<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_agents', function (Blueprint $table) {
            if (!Schema::hasColumn('workspace_agents', 'exact_prompt')) {
                $table->boolean('exact_prompt')
                    ->default(false)
                    ->after('prompt')
                    ->comment('When true, skip Groq AI prompt enhancement in n8n');
            }
        });
    }

    public function down(): void
    {
        Schema::table('workspace_agents', function (Blueprint $table) {
            if (Schema::hasColumn('workspace_agents', 'exact_prompt')) {
                $table->dropColumn('exact_prompt');
            }
        });
    }
};
