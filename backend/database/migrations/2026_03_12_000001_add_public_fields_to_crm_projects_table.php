<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiunge i campi pubblici per la visibilità dei progetti CRM sul sito BackSoftware.
     */
    public function up(): void
    {
        Schema::table('crm_projects', function (Blueprint $table) {
            $table->boolean('is_public')->default(false)->after('cover_photo');
            $table->string('public_slug', 190)->nullable()->unique()->after('is_public');
            $table->string('public_title', 255)->nullable()->after('public_slug');
            $table->string('public_subtitle', 255)->nullable()->after('public_title');
            $table->text('public_short_description')->nullable()->after('public_subtitle');
            $table->longText('public_long_description')->nullable()->after('public_short_description');
            $table->string('public_category', 100)->nullable()->after('public_long_description');
            $table->string('public_status_label', 100)->nullable()->after('public_category');
            $table->string('public_hero_image_url', 500)->nullable()->after('public_status_label');
            $table->json('public_gallery')->nullable()->after('public_hero_image_url');
            $table->json('public_technologies')->nullable()->after('public_gallery');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('crm_projects', function (Blueprint $table) {
            $table->dropColumn([
                'is_public',
                'public_slug',
                'public_title',
                'public_subtitle',
                'public_short_description',
                'public_long_description',
                'public_category',
                'public_status_label',
                'public_hero_image_url',
                'public_gallery',
                'public_technologies',
            ]);
        });
    }
};

