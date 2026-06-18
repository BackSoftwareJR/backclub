<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_project_pm_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_project_id')->constrained('crm_projects')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('message')->nullable();
            $table->enum('message_type', ['text', 'image', 'file', 'system'])->default('text');
            $table->string('media_path', 500)->nullable();
            $table->string('media_name', 255)->nullable();
            $table->bigInteger('media_size')->nullable();
            $table->string('media_type', 100)->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            
            $table->index('crm_project_id');
            $table->index('user_id');
            $table->index('created_at');
            $table->index('is_read');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_project_pm_chat_messages');
    }
};

