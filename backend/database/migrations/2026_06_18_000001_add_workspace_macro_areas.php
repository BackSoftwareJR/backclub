<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $types = [
            [
                'code' => 'developer',
                'name' => 'Frontend Dev',
                'description' => 'Workspace dedicato allo sviluppo frontend: progetti, branch, agenti AI e task su staging.',
                'color' => '#3B82F6',
                'icon' => 'code-2',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'code' => 'organic_web',
                'name' => 'Organic Web',
                'description' => 'SEO, contenuti web, posizionamento organico e ottimizzazione siti.',
                'color' => '#34C759',
                'icon' => 'globe',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'code' => 'social_media',
                'name' => 'Social Media',
                'description' => 'Pianificazione contenuti, calendario editoriale e gestione social.',
                'color' => '#FF2D55',
                'icon' => 'share-2',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'code' => 'video_grafica',
                'name' => 'Video e Grafica',
                'description' => 'Produzione video, grafica, motion design e asset multimediali.',
                'color' => '#FF9F0A',
                'icon' => 'video',
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'code' => 'intelligence_marketing',
                'name' => 'Intelligence Marketing',
                'description' => 'Analisi dati, insight di mercato e strategie marketing data-driven.',
                'color' => '#5856D6',
                'icon' => 'brain',
                'sort_order' => 5,
                'is_active' => true,
            ],
        ];

        foreach ($types as $type) {
            DB::table('workspace_types')->updateOrInsert(
                ['code' => $type['code']],
                array_merge($type, ['created_at' => $now, 'updated_at' => $now])
            );
        }

        DB::table('workspace_types')
            ->where('code', 'developer')
            ->update(['name' => 'Frontend Dev', 'updated_at' => $now]);
    }

    public function down(): void
    {
        DB::table('workspace_types')->whereIn('code', [
            'organic_web',
            'social_media',
            'video_grafica',
            'intelligence_marketing',
        ])->delete();
    }
};
