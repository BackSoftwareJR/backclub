<?php

/**
 * CLEAR CACHE - Laravel
 * Visita: https://backclub.it/backend/clear-cache.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

echo "<h1>Laravel Cache Clear</h1>";

try {
    // Route cache
    echo "<h3>1. Clearing route cache...</h3>";
    $kernel->call('route:clear');
    echo "✅ Route cache cleared<br>";
    
    // Config cache
    echo "<h3>2. Clearing config cache...</h3>";
    $kernel->call('config:clear');
    echo "✅ Config cache cleared<br>";
    
    // General cache
    echo "<h3>3. Clearing application cache...</h3>";
    $kernel->call('cache:clear');
    echo "✅ Application cache cleared<br>";
    
    // View cache
    echo "<h3>4. Clearing view cache...</h3>";
    $kernel->call('view:clear');
    echo "✅ View cache cleared<br>";
    
    echo "<hr>";
    echo "<h2>✅ All caches cleared successfully!</h2>";
    echo "<p>Ora prova di nuovo: <a href='https://backclub.it/uscite-cocchi/users'>Users Page</a></p>";
    
} catch (Exception $e) {
    echo "<h2>❌ Error</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
