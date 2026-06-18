<?php
/**
 * DEBUG ERROR - Mostra errore esatto
 * Visita: https://backclub.it/backend/debug-error.php
 */

// Abilita TUTTI gli errori
error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

try {
    echo "<h1>Test 1: Bootstrap Laravel</h1>";
    $app = require_once __DIR__ . '/bootstrap/app.php';
    echo "✅ Laravel bootstrapped<br><br>";
    
    echo "<h1>Test 2: Database Connection</h1>";
    $pdo = DB::connection()->getPdo();
    echo "✅ Database connected<br><br>";
    
    echo "<h1>Test 3: Query Users</h1>";
    $stmt = $pdo->query("SELECT id, name, email, role, is_active FROM users LIMIT 3");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "✅ Found " . count($users) . " users<br>";
    echo "<pre>" . print_r($users, true) . "</pre>";
    
    echo "<h1>Test 4: Controller Class Exists</h1>";
    if (class_exists('App\Http\Controllers\UserManagementController')) {
        echo "✅ UserManagementController class found<br><br>";
        
        echo "<h1>Test 5: Instantiate Controller</h1>";
        $controller = new App\Http\Controllers\UserManagementController();
        echo "✅ Controller instantiated<br><br>";
        
        echo "<h1>Test 6: Call Search Method</h1>";
        $request = Illuminate\Http\Request::create('/test', 'GET', []);
        $response = $controller->search($request);
        echo "✅ Search called successfully<br>";
        echo "<h3>Response:</h3>";
        echo "<pre>" . $response->getContent() . "</pre>";
    } else {
        echo "❌ UserManagementController NOT found<br>";
    }
    
} catch (Exception $e) {
    echo "<h1 style='color:red'>❌ ERROR</h1>";
    echo "<strong>Message:</strong> " . $e->getMessage() . "<br><br>";
    echo "<strong>File:</strong> " . $e->getFile() . " (line " . $e->getLine() . ")<br><br>";
    echo "<strong>Stack trace:</strong><br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
