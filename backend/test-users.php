<?php

/**
 * TEST FILE - User Management Routes
 * Visita: https://backclub.it/backend/test-users.php
 * 
 * Questo file testa direttamente il controller senza passare per le routes
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

// Test 1: Controller esiste?
echo "<h2>Test 1: Controller File</h2>";
$controllerPath = __DIR__ . '/app/Http/Controllers/UserManagementController.php';
if (file_exists($controllerPath)) {
    echo "✅ Controller file exists<br>";
} else {
    echo "❌ Controller file NOT found at: {$controllerPath}<br>";
}

// Test 2: Class esiste?
echo "<h2>Test 2: Controller Class</h2>";
try {
    $reflection = new ReflectionClass('App\Http\Controllers\UserManagementController');
    echo "✅ Controller class loaded successfully<br>";
    echo "Methods: " . count($reflection->getMethods()) . "<br>";
    
    // Lista metodi
    echo "<ul>";
    foreach ($reflection->getMethods() as $method) {
        if ($method->class === 'App\Http\Controllers\UserManagementController') {
            echo "<li>" . $method->name . "</li>";
        }
    }
    echo "</ul>";
} catch (Exception $e) {
    echo "❌ Error loading controller: " . $e->getMessage() . "<br>";
}

// Test 3: Routes registrate?
echo "<h2>Test 3: Routes</h2>";
try {
    $routes = app('router')->getRoutes();
    $userRoutes = [];
    
    foreach ($routes as $route) {
        $uri = $route->uri();
        if (strpos($uri, 'users/') !== false || strpos($uri, 'users') !== false) {
            $userRoutes[] = $route->uri();
        }
    }
    
    if (count($userRoutes) > 0) {
        echo "✅ Found " . count($userRoutes) . " user routes:<br>";
        echo "<ul>";
        foreach ($userRoutes as $route) {
            echo "<li>{$route}</li>";
        }
        echo "</ul>";
    } else {
        echo "❌ No user routes found<br>";
        echo "<strong>SOLUZIONE:</strong> Clear route cache con: php artisan route:clear<br>";
    }
} catch (Exception $e) {
    echo "❌ Error checking routes: " . $e->getMessage() . "<br>";
}

// Test 4: Database tables?
echo "<h2>Test 4: Database Tables</h2>";
try {
    $pdo = app('db')->connection()->getPdo();
    $stmt = $pdo->query("SHOW TABLES LIKE 'user_%'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($tables) > 0) {
        echo "✅ Found " . count($tables) . " user tables:<br>";
        echo "<ul>";
        foreach ($tables as $table) {
            echo "<li>{$table}</li>";
        }
        echo "</ul>";
    } else {
        echo "❌ No user_* tables found<br>";
        echo "<strong>SOLUZIONE:</strong> Esegui user_management_schema.sql<br>";
    }
} catch (Exception $e) {
    echo "❌ Error checking database: " . $e->getMessage() . "<br>";
}

// Test 5: Prova chiamata diretta
echo "<h2>Test 5: Direct Controller Call</h2>";
try {
    $controller = new App\Http\Controllers\UserManagementController();
    echo "✅ Controller instantiated successfully<br>";
    
    // Test search method
    $request = Illuminate\Http\Request::create('/api/users/search', 'GET', ['q' => 'test']);
    echo "Attempting to call search method...<br>";
    
    // Nota: questo potrebbe fallire per mancanza di autenticazione
    // $response = $controller->search($request);
    // echo "✅ Search method callable<br>";
    
} catch (Exception $e) {
    echo "⚠️ Controller instantiation note: " . $e->getMessage() . "<br>";
}

echo "<hr>";
echo "<h2>Riepilogo</h2>";
echo "<p>Se vedi tutti i ✅ sopra, il problema è la <strong>cache delle routes</strong>.</p>";
echo "<p><strong>Soluzione:</strong></p>";
echo "<ol>";
echo "<li>SSH: <code>php artisan route:clear && php artisan config:clear</code></li>";
echo "<li>Oppure crea file clear-cache.php e chiamalo via browser</li>";
echo "</ol>";
