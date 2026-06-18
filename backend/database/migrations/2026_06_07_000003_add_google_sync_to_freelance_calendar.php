<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('freelance_calendar_events', function (Blueprint $table) {
            if (!Schema::hasColumn('freelance_calendar_events', 'google_event_id')) {
                $table->string('google_event_id', 255)->nullable()->after('call_notes');
            }
            if (!Schema::hasColumn('freelance_calendar_events', 'google_meet_link')) {
                $table->string('google_meet_link', 500)->nullable()->after('google_event_id');
            }
            if (!Schema::hasColumn('freelance_calendar_events', 'sync_status')) {
                $table->enum('sync_status', ['pending', 'synced', 'failed', 'skipped'])->default('pending')->after('google_meet_link');
            }
            if (!Schema::hasColumn('freelance_calendar_events', 'sync_error')) {
                $table->text('sync_error')->nullable()->after('sync_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('freelance_calendar_events', function (Blueprint $table) {
            $columns = ['google_event_id', 'google_meet_link', 'sync_status', 'sync_error'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('freelance_calendar_events', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
