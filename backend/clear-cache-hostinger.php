<?php
/**
 * CLEAR CACHE - Hostinger (senza SSH)
 * Carica questo file nella root di /backend
 * Poi visitalo da browser: https://backclub.it/backend/clear-cache-hostinger.php
 * 
 * IMPORTANTE: Cancella questo file dopo l'uso per sicurezza!
 */

// Security: Solo per admin (cambia questa password!)
$PASSWORD = 'backclub2025'; // CAMBIA QUESTA PASSWORD!

if (!isset($_GET['pwd']) || $_GET['pwd'] !== $PASSWORD) {
    die('🔒 Accesso negato. Usa: ?pwd=tuapassword');
}

echo "<h1>🧹 Laravel Cache Cleaner - Hostinger</h1>";
echo "<hr>";

// Change to Laravel root
chdir(__DIR__);

$commands = [
    'Route Cache' => 'route:clear',
    'Config Cache' => 'config:clear',
    'Application Cache' => 'cache:clear',
    'View Cache' => 'view:clear',
];

echo "<h2>Esecuzione comandi Artisan:</h2>";
echo "<pre>";

foreach ($commands as $name => $command) {
    echo "\n🔄 Clearing $name...\n";
    
    try {
        // Method 1: exec artisan
        $output = [];
        $return_var = 0;
        exec("php artisan $command 2>&1", $output, $return_var);
        
        if ($return_var === 0) {
            echo "✅ $name cleared successfully!\n";
            echo implode("\n", $output) . "\n";
        } else {
            echo "⚠️ $name: " . implode("\n", $output) . "\n";
            
            // Method 2: Manual cache clearing (fallback)
            switch ($command) {
                case 'route:clear':
                    $routeCachePath = __DIR__ . '/bootstrap/cache/routes-v7.php';
                    if (file_exists($routeCachePath)) {
                        unlink($routeCachePath);
                        echo "✅ Route cache file deleted manually\n";
                    }
                    break;
                    
                case 'config:clear':
                    $configCachePath = __DIR__ . '/bootstrap/cache/config.php';
                    if (file_exists($configCachePath)) {
                        unlink($configCachePath);
                        echo "✅ Config cache file deleted manually\n";
                    }
                    break;
                    
                case 'cache:clear':
                    $cachePath = __DIR__ . '/storage/framework/cache';
                    if (is_dir($cachePath)) {
                        $files = glob($cachePath . '/*');
                        foreach ($files as $file) {
                            if (is_file($file)) {
                                unlink($file);
                            }
                        }
                        echo "✅ Application cache files deleted manually\n";
                    }
                    break;
                    
                case 'view:clear':
                    $viewCachePath = __DIR__ . '/storage/framework/views';
                    if (is_dir($viewCachePath)) {
                        $files = glob($viewCachePath . '/*.php');
                        foreach ($files as $file) {
                            if (basename($file) !== '.gitignore') {
                                unlink($file);
                            }
                        }
                        echo "✅ View cache files deleted manually\n";
                    }
                    break;
            }
        }
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
    }
}

echo "</pre>";

// List routes
echo "<hr>";
echo "<h2>📋 Verifica Routes Registrate:</h2>";
echo "<pre>";

try {
    exec("php artisan route:list --columns=method,uri,name 2>&1 | grep 'users/'", $routes);
    if (!empty($routes)) {
        echo "✅ Routes utenti trovate:\n\n";
        foreach ($routes as $route) {
            echo $route . "\n";
        }
    } else {
        echo "⚠️ Nessuna route 'users' trovata. Verifica che api.php sia stato caricato correttamente.\n";
    }
} catch (Exception $e) {
    echo "⚠️ Impossibile listare routes: " . $e->getMessage() . "\n";
}

echo "</pre>";

// Test API endpoint
echo "<hr>";
echo "<h2>🧪 Test API Endpoint:</h2>";
echo "<pre>";

$testUrl = "https://backclub.it/backend/public/api/users/1/detail";
echo "Testing: $testUrl\n\n";

$ch = curl_init($testUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 401) {
    echo "✅ API endpoint funziona! (401 = richiede autenticazione)\n";
} elseif ($httpCode === 404) {
    echo "❌ Route NON trovata (404)\n";
    echo "   Verifica che api.php contenga le routes users/*\n";
} else {
    echo "Status Code: $httpCode\n";
}

echo "</pre>";

echo "<hr>";
echo "<h2>✅ Cache Clearing Completato!</h2>";
echo "<p><strong>IMPORTANTE:</strong> Cancella questo file per sicurezza dopo l'uso!</p>";
echo "<p>Ora testa: <a href='https://backclub.it/users/1' target='_blank'>https://backclub.it/users/1</a></p>";
?>

