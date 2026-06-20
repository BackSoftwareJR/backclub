<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_agents', function (Blueprint $table) {
            $table->string('flow_type', 20)->nullable()->after('exact_prompt')
                ->comment('minor | major | onboarding — classificazione flusso AI');
            $table->string('sub_agent_role', 50)->nullable()->after('flow_type')
                ->comment('consulente_aziendale | scrittore_creativo | ... — sotto-agente assegnato');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_agents', function (Blueprint $table) {
            $table->dropColumn(['flow_type', 'sub_agent_role']);
        });
    }
};
