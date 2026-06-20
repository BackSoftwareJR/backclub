<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_project_task_comment_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crm_project_task_comment_id');
            $table->string('file_path');
            $table->string('file_name');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type')->nullable();
            $table->timestamps();

            $table->foreign('crm_project_task_comment_id', 'fk_task_cmt_att_comment')
                ->references('id')
                ->on('crm_project_task_comments')
                ->onDelete('cascade');
            $table->index('crm_project_task_comment_id', 'idx_task_cmt_att_comment');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_project_task_comment_attachments');
    }
};
