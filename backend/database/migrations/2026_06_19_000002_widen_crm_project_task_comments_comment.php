<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Raw SQL avoids doctrine/dbal, which is not in this project's dependencies.
        DB::statement('ALTER TABLE crm_project_task_comments MODIFY comment LONGTEXT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE crm_project_task_comments MODIFY comment VARCHAR(5000) NULL');
    }
};
