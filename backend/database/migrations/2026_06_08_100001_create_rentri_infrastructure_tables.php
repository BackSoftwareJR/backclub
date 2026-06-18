<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rentri_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('codice_fiscale', 16);
            $table->string('num_iscr_sito', 30);
            $table->string('denominazione');
            $table->enum('ambiente', ['demo', 'production'])->default('demo');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_health_check_at')->nullable();
            $table->enum('last_health_check_status', ['ok', 'error', 'unconfigured'])->nullable();
            $table->text('last_health_check_message')->nullable();
            $table->json('settings')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['client_id', 'num_iscr_sito']);
            $table->index('codice_fiscale');
            $table->index('is_active');
        });

        Schema::create('rentri_api_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rentri_configuration_id')->nullable()->constrained('rentri_configurations')->nullOnDelete();
            $table->uuid('correlation_id');
            $table->string('method', 10);
            $table->string('endpoint', 500);
            $table->json('request_headers')->nullable();
            $table->longText('request_body')->nullable();
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->json('response_headers')->nullable();
            $table->longText('response_body')->nullable();
            $table->unsignedInteger('duration_ms')->default(0);
            $table->text('error_message')->nullable();
            $table->uuid('rentri_transazione_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index('correlation_id');
            $table->index('rentri_transazione_id');
            $table->index('created_at');
            $table->index(['rentri_configuration_id', 'created_at']);
        });

        Schema::create('cer_codes', function (Blueprint $table) {
            $table->string('code', 12)->primary();
            $table->string('description');
            $table->boolean('is_pericoloso')->default(false);
            $table->string('categoria', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->index('is_pericoloso');
            $table->index('is_active');
        });

        Schema::create('rentri_fir_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rentri_configuration_id')->constrained('rentri_configurations')->cascadeOnDelete();
            $table->string('codice_blocco', 20);
            $table->string('num_iscr_sito', 30);
            $table->string('stato', 30)->nullable();
            $table->unsignedInteger('fir_disponibili')->default(0);
            $table->unsignedInteger('fir_utilizzati')->default(0);
            $table->json('raw_data')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['rentri_configuration_id', 'codice_blocco']);
            $table->index('num_iscr_sito');
        });

        Schema::create('autodemolizione_vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rentri_configuration_id')->constrained('rentri_configurations')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('targa', 15)->nullable();
            $table->string('vin', 17)->nullable();
            $table->string('marca', 50)->nullable();
            $table->string('modello', 80)->nullable();
            $table->unsignedSmallInteger('anno_immatricolazione')->nullable();
            $table->date('data_ingresso')->nullable();
            $table->date('data_demolizione')->nullable();
            $table->decimal('peso_kg', 10, 2)->nullable();
            $table->string('cer_code_default', 12)->nullable();
            $table->enum('stato', ['in_cantiere', 'in_demolizione', 'demolito', 'fir_emesso', 'completato'])->default('in_cantiere');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('targa');
            $table->index('vin');
            $table->index('stato');
            $table->index(['rentri_configuration_id', 'stato']);
        });

        Schema::create('rentri_firs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rentri_configuration_id')->constrained('rentri_configurations')->cascadeOnDelete();
            $table->foreignId('rentri_fir_block_id')->nullable()->constrained('rentri_fir_blocks')->nullOnDelete();
            $table->foreignId('autodemolizione_vehicle_id')->nullable()->constrained('autodemolizione_vehicles')->nullOnDelete();
            $table->string('codice_blocco', 20)->nullable();
            $table->unsignedInteger('progressivo')->nullable();
            $table->string('numero_fir', 30)->nullable()->unique();
            $table->enum('stato', ['bozza', 'vidimazione_in_corso', 'vidimato', 'trasmesso', 'validato', 'annullato'])->default('bozza');
            $table->enum('tipo_fir', ['cartaceo', 'digitale'])->default('cartaceo');
            $table->boolean('is_pericoloso')->default(false);
            $table->date('data_emissione')->nullable();
            $table->uuid('rentri_transazione_id')->nullable();
            $table->longText('xml_vidimato')->nullable();
            $table->longText('xfir_payload')->nullable();
            $table->string('produttore_num_iscr', 30);
            $table->string('trasportatore_num_iscr', 30)->nullable();
            $table->string('destinatario_num_iscr', 30)->nullable();
            $table->decimal('peso_kg', 12, 3)->nullable();
            $table->decimal('quantita', 12, 3)->nullable();
            $table->string('unita_misura', 10)->default('kg');
            $table->string('cer_code', 12);
            $table->string('descrizione_rifiuto', 500)->nullable();
            $table->string('targa_veicolo', 15)->nullable();
            $table->string('vin', 17)->nullable();
            $table->json('raw_vidimazione')->nullable();
            $table->json('raw_trasmissione')->nullable();
            $table->json('raw_validazione')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('cer_code')->references('code')->on('cer_codes');
            $table->index('stato');
            $table->index('rentri_transazione_id');
            $table->index(['rentri_configuration_id', 'stato']);
            $table->index('targa_veicolo');
        });

        Schema::table('autodemolizione_vehicles', function (Blueprint $table) {
            $table->foreignId('rentri_fir_id')->nullable()->after('notes')->constrained('rentri_firs')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('autodemolizione_vehicles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rentri_fir_id');
        });

        Schema::dropIfExists('rentri_firs');
        Schema::dropIfExists('autodemolizione_vehicles');
        Schema::dropIfExists('rentri_fir_blocks');
        Schema::dropIfExists('cer_codes');
        Schema::dropIfExists('rentri_api_logs');
        Schema::dropIfExists('rentri_configurations');
    }
};
