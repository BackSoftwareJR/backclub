<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('focus_tasks', function (Blueprint $table) {
            $table->date('week_plan_date')->nullable()->after('due_date');
            $table->index(['user_id', 'week_plan_date']);
        });
    }

    public function down(): void
    {
        Schema::table('focus_tasks', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'week_plan_date']);
            $table->dropColumn('week_plan_date');
        });
    }
};
