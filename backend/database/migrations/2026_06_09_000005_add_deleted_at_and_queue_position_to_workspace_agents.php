<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_agents', function (Blueprint $table) {
            $table->timestamp('deleted_at')->nullable()->after('completed_at');
            $table->unsignedInteger('queue_position')->nullable()->after('n8n_execution_id');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_agents', function (Blueprint $table) {
            $table->dropColumn(['deleted_at', 'queue_position']);
        });
    }
};
