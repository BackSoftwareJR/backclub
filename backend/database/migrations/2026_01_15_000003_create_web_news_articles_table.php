<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('web_news_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title')->comment('Titolo articolo');
            $table->text('content')->comment('Contenuto completo articolo');
            $table->text('excerpt')->nullable()->comment('Estratto/riassunto');
            $table->string('image_url', 500)->nullable()->comment('URL immagine principale');
            $table->string('author')->comment('Autore articolo');
            $table->string('category', 100)->default('generale')->comment('Categoria notizia');
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable()->comment('Data pubblicazione');
            $table->json('tags')->nullable()->comment('Tag articolo');
            $table->integer('views_count')->default(0)->comment('Numero visualizzazioni');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index('is_published');
            $table->index('category');
            $table->index('published_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('web_news_articles');
    }
};

