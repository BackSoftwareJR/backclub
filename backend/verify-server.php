<?php
/**
 * VERIFICA DEFINITIVA - Cosa c'è REALMENTE sul server
 * https://backclub.it/backend/verify-server.php
 */
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Server Verification</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #0f0; }
        .ok { color: #0f0; }
        .error { color: #f00; }
        .warning { color: #ff0; }
        pre { background: #000; padding: 10px; border: 1px solid #333; }
        h2 { border-bottom: 2px solid #0f0; padding-bottom: 5px; }
    </style>
</head>
<body>
<h1>🔍 VERIFICA SERVER</h1>

<?php
echo "<h2>1. File api.php</h2>";
$apiFile = __DIR__ . '/routes/api.php';
if (file_exists($apiFile)) {
    $size = filesize($apiFile);
    $modified = date('Y-m-d H:i:s', filemtime($apiFile));
    echo "<p class='ok'>✅ Esiste: $size bytes</p>";
    echo "<p class='ok'>✅ Modificato: $modified</p>";
    
    // Cerca la stringa "user-management" nel file
    $content = file_get_contents($apiFile);
    $count = substr_count($content, 'user-management');
    echo "<p class='ok'>✅ Occorrenze 'user-management': $count</p>";
    
    // Cerca dentro uscite-cocchi
    if (strpos($content, 'uscite-cocchi') !== false && strpos($content, 'user-management') !== false) {
        echo "<p class='ok'>✅ Routes dentro uscite-cocchi</p>";
    } else {
        echo "<p class='error'>❌ Routes NON dentro uscite-cocchi</p>";
    }
} else {
    echo "<p class='error'>❌ File NON trovato</p>";
}

echo "<h2>2. Controller UserManagementController</h2>";
$controllerFile = __DIR__ . '/app/Http/Controllers/UserManagementController.php';
if (file_exists($controllerFile)) {
    $size = filesize($controllerFile);
    $modified = date('Y-m-d H:i:s', filemtime($controllerFile));
    echo "<p class='ok'>✅ Esiste: $size bytes</p>";
    echo "<p class='ok'>✅ Modificato: $modified</p>";
} else {
    echo "<p class='error'>❌ File NON trovato</p>";
}

echo "<h2>3. Frontend dist/</h2>";
$indexFile = __DIR__ . '/../frontend/dist/index.html';
if (file_exists($indexFile)) {
    $modified = date('Y-m-d H:i:s', filemtime($indexFile));
    echo "<p class='ok'>✅ Esiste</p>";
    echo "<p class='ok'>✅ Modificato: $modified</p>";
    
    // Cerca il file JS più recente
    $jsFiles = glob(__DIR__ . '/../frontend/dist/assets/*.js');
    if ($jsFiles) {
        usort($jsFiles, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        $newest = $jsFiles[0];
        echo "<p class='ok'>✅ JS più recente: " . basename($newest) . "</p>";
        echo "<p class='ok'>✅ Modificato: " . date('Y-m-d H:i:s', filemtime($newest)) . "</p>";
    }
} else {
    echo "<p class='error'>❌ Frontend NON trovato</p>";
}

echo "<h2>4. Test Connessione Database</h2>";
try {
    require __DIR__ . '/vendor/autoload.php';
    $app = require_once __DIR__ . '/bootstrap/app.php';
    
    $pdo = new PDO(
        "mysql:host=" . env('DB_HOST') . ";dbname=" . env('DB_DATABASE'),
        env('DB_USERNAME'),
        env('DB_PASSWORD')
    );
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "<p class='ok'>✅ Database connesso</p>";
    echo "<p class='ok'>✅ Utenti nel DB: {$row['total']}</p>";
} catch (Exception $e) {
    echo "<p class='error'>❌ Errore DB: " . $e->getMessage() . "</p>";
}

echo "<h2>5. Test API Diretta</h2>";
echo "<p>Prova a chiamare (apri in nuova tab):</p>";
echo "<pre><a href='/api/uscite-cocchi/user-management/search' target='_blank'>/api/uscite-cocchi/user-management/search</a></pre>";

echo "<h2>6. Cache Status</h2>";
$cacheFiles = [
    'bootstrap/cache/routes.php' => 'Routes cache',
    'bootstrap/cache/config.php' => 'Config cache',
];

foreach ($cacheFiles as $file => $name) {
    $path = __DIR__ . '/' . $file;
    if (file_exists($path)) {
        $modified = date('Y-m-d H:i:s', filemtime($path));
        echo "<p class='warning'>⚠️  $name esiste (modificato: $modified)</p>";
        echo "<p class='warning'>   🔧 <a href='/backend/clear-cache.php'>Clear Cache</a></p>";
    } else {
        echo "<p class='ok'>✅ $name non esiste (OK)</p>";
    }
}

echo "<h2>📋 SOMMARIO</h2>";
echo "<pre>";
echo "Data/Ora server: " . date('Y-m-d H:i:s') . "\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Laravel: " . (class_exists('Illuminate\\Foundation\\Application') ? 'Loaded' : 'Not loaded') . "\n";
echo "</pre>";

echo "<h2>🚀 PROSSIMI PASSI</h2>";
echo "<ol>";
echo "<li>Se vedi ❌ su api.php → Ri-upload backend/routes/api.php</li>";
echo "<li>Se vedi ⚠️  cache → Clicca 'Clear Cache' sopra</li>";
echo "<li>Se tutto ✅ → Prova il link 'Test API Diretta'</li>";
echo "<li>Ricarica pagina frontend con CTRL+SHIFT+R (hard refresh)</li>";
echo "</ol>";
?>

</body>
</html>
