<?php
/**
 * Script per importare il template "Benissimo Campagna Spot" dal JSON
 * 
 * Uso: php import_benissimo_template.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\ProjectTemplate;
use App\Models\ProjectTemplateRole;
use App\Models\ProjectTemplateTask;
use Illuminate\Support\Facades\DB;

// Percorso al file JSON
$jsonPath = __DIR__ . '/../../benissimo_campagna_spot_tasks.json';

if (!file_exists($jsonPath)) {
    echo "❌ File JSON non trovato: $jsonPath\n";
    exit(1);
}

echo "📄 Lettura file JSON...\n";
$jsonContent = file_get_contents($jsonPath);
$data = json_decode($jsonContent, true);

if (!$data || !isset($data['project']) || !isset($data['tasks'])) {
    echo "❌ JSON non valido o formato non riconosciuto\n";
    exit(1);
}

$projectData = $data['project'];
$tasksData = $data['tasks'];

echo "✅ JSON caricato: " . count($tasksData) . " task trovate\n\n";

DB::beginTransaction();

try {
    // Crea il template
    echo "📝 Creazione template...\n";
    $template = ProjectTemplate::create([
        'code' => 'CF_BENISSIMO_SPOT',
        'name' => $projectData['name'] ?? 'Benissimo Campagna Spot',
        'description' => $projectData['description'] ?? 'Template completo per campagna spot casa famiglia',
        'icon' => 'Home',
        'color' => $projectData['color'] ?? '#FF9F43',
        'default_duration_days' => 90,
        'has_tasks' => true,
        'is_active' => true,
    ]);
    
    echo "✅ Template creato: {$template->name} (ID: {$template->id})\n\n";
    
    // Estrai i ruoli univoci dalle task
    echo "👥 Analisi ruoli...\n";
    $roles = [];
    foreach ($tasksData as $task) {
        if (!empty($task['assigned_to'])) {
            $roleCode = strtolower(str_replace([' ', '-'], '_', trim($task['assigned_to'])));
            $roleName = ucwords(trim($task['assigned_to']));
            
            if (!isset($roles[$roleCode])) {
                $roles[$roleCode] = $roleName;
            }
        }
    }
    
    // Crea i ruoli
    foreach ($roles as $roleCode => $roleName) {
        ProjectTemplateRole::create([
            'template_id' => $template->id,
            'role_code' => $roleCode,
            'role_name' => $roleName,
            'is_required' => in_array($roleCode, ['project_manager', 'web_developer']),
        ]);
        echo "  ✓ Ruolo: $roleName ($roleCode)\n";
    }
    
    echo "\n✅ " . count($roles) . " ruoli creati\n\n";
    
    // Calcola la data di inizio del progetto (dalla prima task)
    $startDate = null;
    foreach ($tasksData as $task) {
        if (!empty($task['start_date'])) {
            $startDate = new DateTime($task['start_date']);
            break;
        }
    }
    
    if (!$startDate) {
        // Usa il start_date del progetto se disponibile
        $startDate = !empty($projectData['start_date']) 
            ? new DateTime($projectData['start_date']) 
            : new DateTime();
    }
    
    echo "📅 Data inizio progetto di riferimento: " . $startDate->format('Y-m-d') . "\n\n";
    
    // Crea le task
    echo "📋 Creazione task...\n";
    $taskCount = 0;
    
    foreach ($tasksData as $index => $taskData) {
        if (empty($taskData['title'])) {
            continue; // Salta task senza titolo
        }
        
        // Calcola gli offset
        $taskStartDate = !empty($taskData['start_date']) 
            ? new DateTime($taskData['start_date']) 
            : clone $startDate;
        
        $taskDueDate = !empty($taskData['due_date']) 
            ? new DateTime($taskData['due_date']) 
            : clone $taskStartDate;
        $taskDueDate->modify('+7 days'); // Default 7 giorni se non specificata
        
        $startOffsetDays = $startDate->diff($taskStartDate)->days;
        $dueOffsetDays = $startDate->diff($taskDueDate)->days;
        
        // Determina il role_code
        $roleCode = null;
        if (!empty($taskData['assigned_to'])) {
            $roleCode = strtolower(str_replace([' ', '-'], '_', trim($taskData['assigned_to'])));
        }
        
        // Mappa la priorità
        $priority = 'medium';
        if (isset($taskData['priority'])) {
            $taskPriority = strtolower($taskData['priority']);
            if (in_array($taskPriority, ['low', 'medium', 'high', 'urgent'])) {
                $priority = $taskPriority;
            }
        }
        
        ProjectTemplateTask::create([
            'template_id' => $template->id,
            'role_code' => $roleCode,
            'title' => $taskData['title'],
            'description' => $taskData['description'] ?? null,
            'priority' => $priority,
            'start_offset_days' => $startOffsetDays,
            'due_offset_days' => $dueOffsetDays,
            'estimated_hours' => $taskData['estimated_hours'] ?? null,
            'order_index' => $index + 1,
            'dependencies' => null,
        ]);
        
        $taskCount++;
        echo "  ✓ Task " . ($index + 1) . ": {$taskData['title']} (offset: +$startOffsetDays → +$dueOffsetDays giorni)\n";
    }
    
    DB::commit();
    
    echo "\n";
    echo "╔══════════════════════════════════════════════════════╗\n";
    echo "║  ✅ IMPORTAZIONE COMPLETATA CON SUCCESSO!          ║\n";
    echo "╚══════════════════════════════════════════════════════╝\n";
    echo "\n";
    echo "📊 Riepilogo:\n";
    echo "  - Template: {$template->name}\n";
    echo "  - Ruoli: " . count($roles) . "\n";
    echo "  - Task: $taskCount\n";
    echo "  - Durata stimata: {$template->default_duration_days} giorni\n";
    echo "\n";
    echo "🎯 Il template è ora disponibile per creare nuovi progetti!\n\n";
    
} catch (Exception $e) {
    DB::rollBack();
    echo "\n❌ ERRORE durante l'importazione:\n";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

