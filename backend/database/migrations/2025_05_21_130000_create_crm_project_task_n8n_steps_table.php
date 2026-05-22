<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_project_task_n8n_steps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crm_project_task_id');
            $table->string('step_key', 100)->nullable();
            $table->unsignedInteger('step_index')->default(0);
            $table->string('status', 20)->default('running');
            $table->string('title', 255)->nullable();
            $table->text('message')->nullable();
            $table->string('actor_type', 20)->default('agent');
            $table->string('actor_name', 120)->nullable();
            $table->json('payload')->nullable();
            $table->unsignedTinyInteger('progress')->nullable();
            $table->boolean('is_final')->default(false);
            $table->timestamps();

            $table->foreign('crm_project_task_id')
                ->references('id')
                ->on('crm_project_tasks')
                ->onDelete('cascade');

            $table->index(['crm_project_task_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_project_task_n8n_steps');
    }
};
