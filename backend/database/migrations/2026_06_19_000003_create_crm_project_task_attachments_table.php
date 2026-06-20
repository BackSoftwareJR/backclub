<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_project_task_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crm_project_task_id');
            $table->unsignedBigInteger('user_id');
            $table->string('file_path');
            $table->string('file_name');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type')->nullable();
            $table->timestamps();

            $table->foreign('crm_project_task_id', 'fk_task_att_task')
                ->references('id')
                ->on('crm_project_tasks')
                ->onDelete('cascade');
            $table->foreign('user_id', 'fk_task_att_user')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
            $table->index(['crm_project_task_id', 'created_at'], 'idx_task_att_task_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_project_task_attachments');
    }
};
