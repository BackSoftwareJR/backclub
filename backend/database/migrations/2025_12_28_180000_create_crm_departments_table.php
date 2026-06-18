<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_departments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique()->comment('Codice univoco CRM');
            $table->string('name')->comment('Nome CRM');
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#0A84FF')->comment('Colore per UI');
            $table->string('icon', 50)->nullable()->comment('Nome icona Lucide');
            $table->decimal('budget_allocated', 15, 2)->default(0)->comment('Budget allocato in cocchi');
            $table->decimal('budget_spent', 15, 2)->default(0)->comment('Budget già speso');
            $table->boolean('is_active')->default(true);
            $table->foreignId('manager_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->index('code');
            $table->index('is_active');
        });

        // Insert 11 predefined CRM departments
        DB::table('crm_departments')->insert([
            ['code' => 'SEGRETERIA', 'name' => 'Segreteria', 'description' => 'Gestione amministrativa e organizzativa', 'color' => '#FF9500', 'icon' => 'FileText', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'CRM_PROJECT', 'name' => 'CRM Project Management', 'description' => 'Gestione di tutti i progetti aziendali', 'color' => '#0A84FF', 'icon' => 'Briefcase', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'CASA_FAMIGLIA', 'name' => 'Casa Famiglia', 'description' => 'Servizi casa famiglia e assistenza', 'color' => '#34C759', 'icon' => 'Home', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'CLIENTI', 'name' => 'Gestione Clienti', 'description' => 'CRM clienti e relazioni commerciali', 'color' => '#5856D6', 'icon' => 'Users', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SITI_WEB', 'name' => 'Siti Web', 'description' => 'Sviluppo e manutenzione siti web', 'color' => '#FF2D55', 'icon' => 'Globe', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'CRM_GESTIONALI', 'name' => 'CRM Gestionali', 'description' => 'Sistemi gestionali e software gestione', 'color' => '#AF52DE', 'icon' => 'Database', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'DIGITALIZZAZIONE', 'name' => 'Digitalizzazione e Formazione', 'description' => 'Processi digitali e corsi formazione', 'color' => '#00C7BE', 'icon' => 'BookOpen', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'RISORSE_UMANE', 'name' => 'Risorse Umane', 'description' => 'Gestione personale e HR', 'color' => '#FF6482', 'icon' => 'UserCheck', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'VIDEO_GRAFICA', 'name' => 'Video e Grafica', 'description' => 'Produzione contenuti multimediali', 'color' => '#FF9F0A', 'icon' => 'Video', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SMARTWORKING', 'name' => 'Smart Working', 'description' => 'Infrastruttura e tools lavoro remoto', 'color' => '#32ADE6', 'icon' => 'Wifi', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'ADS_CENTER', 'name' => 'Ads Center', 'description' => 'Campagne pubblicitarie e marketing', 'color' => '#30D158', 'icon' => 'BarChart3', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_departments');
    }
};
