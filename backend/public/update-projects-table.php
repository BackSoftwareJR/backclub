<?php
// Temporary update script - DELETE AFTER USE

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

header('Content-Type: text/plain');

try {
    echo "=== UPDATING PROJECTS TABLE ===\n\n";
    
    // Check if projects table exists
    $tables = DB::select("SHOW TABLES LIKE 'projects'");
    
    if (empty($tables)) {
        echo "❌ Projects table does NOT exist. Creating it...\n\n";
        
        DB::statement("
            CREATE TABLE `projects` (
              `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
              `name` VARCHAR(255) NOT NULL,
              `description` TEXT NULL,
              `project_type_id` BIGINT UNSIGNED NULL,
              `client_id` BIGINT UNSIGNED NULL,
              `manager_id` BIGINT UNSIGNED NULL,
              `crm_department_id` BIGINT UNSIGNED NULL,
              `project_template` VARCHAR(255) NULL,
              `status` ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planning',
              `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
              `start_date` DATE NULL,
              `end_date` DATE NULL,
              `due_date` DATE NULL,
              `budget_cocchi` DECIMAL(15, 2) DEFAULT 0.00,
              `spent_cocchi` DECIMAL(15, 2) DEFAULT 0.00,
              `budget_allocated` DECIMAL(15, 2) DEFAULT 0.00,
              `budget_spent` DECIMAL(15, 2) DEFAULT 0.00,
              `contratto_url` VARCHAR(500) NULL,
              `link_foto_video` VARCHAR(500) NULL,
              `link_cartella_documenti` VARCHAR(500) NULL,
              `link_cartella_social` VARCHAR(500) NULL,
              `link_cartella_credenziali` VARCHAR(500) NULL,
              `created_at` TIMESTAMP NULL,
              `updated_at` TIMESTAMP NULL,
              INDEX `projects_status_index` (`status`),
              INDEX `projects_manager_id_index` (`manager_id`),
              INDEX `projects_client_id_index` (`client_id`),
              INDEX `projects_type_id_index` (`project_type_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        
        echo "✅ Projects table created!\n\n";
    } else {
        echo "✅ Projects table exists. Adding missing columns...\n\n";
        
        // Add columns if they don't exist
        $columnsToAdd = [
            "ADD COLUMN `project_type_id` BIGINT UNSIGNED NULL AFTER `id`",
            "ADD COLUMN `crm_department_id` BIGINT UNSIGNED NULL AFTER `client_id`",
            "ADD COLUMN `project_template` VARCHAR(255) NULL",
            "ADD COLUMN `contratto_url` VARCHAR(500) NULL",
            "ADD COLUMN `link_foto_video` VARCHAR(500) NULL",
            "ADD COLUMN `link_cartella_documenti` VARCHAR(500) NULL",
            "ADD COLUMN `link_cartella_social` VARCHAR(500) NULL",
            "ADD COLUMN `link_cartella_credenziali` VARCHAR(500) NULL",
            "ADD COLUMN `budget_allocated` DECIMAL(15, 2) DEFAULT 0.00",
            "ADD COLUMN `budget_spent` DECIMAL(15, 2) DEFAULT 0.00"
        ];
        
        foreach ($columnsToAdd as $col) {
            try {
                DB::statement("ALTER TABLE `projects` $col");
                echo "  ✅ Added column: $col\n";
            } catch (\Exception $e) {
                if (strpos($e->getMessage(), 'Duplicate column') !== false) {
                    echo "  ⏭️  Column already exists: $col\n";
                } else {
                    echo "  ⚠️  Error adding $col: " . $e->getMessage() . "\n";
                }
            }
        }
    }
    
    echo "\n=== CHECKING PROJECT COUNT ===\n";
    $count = DB::table('projects')->count();
    echo "Projects in database: $count\n";
    
    if ($count === 0) {
        echo "\n⚠️  No projects found. You can create some from the frontend!\n";
    }
    
    echo "\n✅ UPDATE COMPLETED!\n";
    echo "\n⚠️  DELETE THIS FILE: backend/public/update-projects-table.php\n";
    echo "Then delete: backend/public/setup-projects-db.php\n";
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "\nFull trace:\n";
    echo $e->getTraceAsString();
}

