<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_orders', function (Blueprint $table) {
            $table->enum('order_source', ['dal_sito', 'referral', 'cliente_diretto'])->default('cliente_diretto')->after('client_id')->comment('Origine ordine: dal sito e-commerce, referral, o inserito manualmente');
            $table->json('project_info')->nullable()->after('items')->comment('JSON con info progetto: idee, ispirazioni, obiettivi, note cliente');
            $table->foreignId('quote_id')->nullable()->after('project_info')->constrained('quotes')->onDelete('set null')->comment('FK a quotes quando inviato a venditori');
            $table->boolean('sent_to_sellers')->default(false)->after('quote_id')->comment('Indica se è stato inviato ai venditori come preventivo');
            $table->foreignId('referral_user_id')->nullable()->after('sent_to_sellers')->constrained('users')->onDelete('set null')->comment('FK a users se ordine da referral');
            
            $table->index('order_source');
            $table->index('quote_id');
            $table->index('sent_to_sellers');
        });
    }

    public function down(): void
    {
        Schema::table('client_orders', function (Blueprint $table) {
            $table->dropForeign(['quote_id']);
            $table->dropForeign(['referral_user_id']);
            $table->dropColumn(['order_source', 'project_info', 'quote_id', 'sent_to_sellers', 'referral_user_id']);
        });
    }
};

