<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_ai_briefs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crm_project_task_id');
            $table->json('brief_json');
            $table->string('context_hash', 64);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->foreign('crm_project_task_id', 'fk_task_brief_task')
                ->references('id')
                ->on('crm_project_tasks')
                ->onDelete('cascade');
            $table->index(['crm_project_task_id', 'context_hash'], 'idx_task_brief_task_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_ai_briefs');
    }
};
