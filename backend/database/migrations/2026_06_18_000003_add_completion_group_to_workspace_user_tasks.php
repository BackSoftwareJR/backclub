<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_user_tasks', function (Blueprint $table) {
            // Identifies which "completion cycle" a task belongs to.
            // NULL = active/current cycle. A positive integer = archived in that snapshot.
            $table->unsignedBigInteger('completion_group_id')->nullable()->after('sort_order');
            $table->index('completion_group_id');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_user_tasks', function (Blueprint $table) {
            $table->dropIndex(['completion_group_id']);
            $table->dropColumn('completion_group_id');
        });
    }
};
