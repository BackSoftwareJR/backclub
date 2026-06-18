<?php

namespace Database\Seeders;

use App\Models\WorkspaceType;
use Illuminate\Database\Seeder;

class WorkspaceTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        WorkspaceType::updateOrCreate(
            ['code' => 'developer'],
            [
                'name' => 'Developer',
                'description' => 'Workspace dedicato ai developer: progetti, branch, agenti AI e task su staging.',
                'color' => '#3B82F6',
                'icon' => 'code-2',
                'sort_order' => 1,
                'is_active' => true,
            ]
        );
    }
}