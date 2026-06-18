<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('agenda_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->comment('Utente proprietario');
            $table->enum('type', ['memo', 'reminder', 'checklist', 'event'])->comment('Tipo elemento agenda');
            $table->string('title', 255)->nullable()->comment('Titolo (opzionale per memo)');
            $table->text('content')->nullable()->comment('Contenuto testo (per memo)');
            
            // Date/Time fields
            $table->date('date')->nullable()->comment('Data (per reminder, checklist, event)');
            $table->time('time')->nullable()->comment('Ora (per reminder, event)');
            $table->datetime('reminder_datetime')->nullable()->comment('Data/ora promemoria');
            $table->boolean('all_day')->default(false)->comment('Tutto il giorno (per event)');
            $table->datetime('end_datetime')->nullable()->comment('Data/ora fine (per event)');
            
            // Checklist fields
            $table->json('checklist_items')->nullable()->comment('Array di {id, text, completed} per checklist');
            
            // Event fields
            $table->string('location', 255)->nullable()->comment('Luogo (per event)');
            $table->json('participants')->nullable()->comment('Array di user IDs (per event)');
            $table->text('description')->nullable()->comment('Descrizione dettagliata (per event)');
            
            // Status and metadata
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->boolean('is_pinned')->default(false)->comment('Appuntato in alto');
            $table->string('color', 7)->nullable()->comment('Colore personalizzato');
            $table->integer('priority')->default(0)->comment('Priorità (0=normale, 1=alta, 2=urgente)');
            $table->json('tags')->nullable()->comment('Array di tag');
            $table->text('notes')->nullable()->comment('Note aggiuntive');
            
            // Relations
            $table->unsignedBigInteger('related_client_id')->nullable()->comment('FK a clients');
            $table->unsignedBigInteger('related_project_id')->nullable()->comment('FK a projects');
            $table->unsignedBigInteger('related_invoice_id')->nullable()->comment('FK a invoices');
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('user_id');
            $table->index('type');
            $table->index('date');
            $table->index('reminder_datetime');
            $table->index('status');
            $table->index('is_pinned');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agenda_items');
    }
};
