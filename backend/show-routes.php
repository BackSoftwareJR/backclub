<?php
/**
 * Lista TUTTE le routes registrate in Laravel
 * https://backclub.it/backend/show-routes.php
 */
require __DIR__ . '/vendor/autoload.php';

header('Content-Type: text/html; charset=utf-8');

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

echo "<h1>Routes Registrate in Laravel</h1>";
echo "<style>body{font-family:monospace;padding:20px;background:#1a1a1a;color:#0f0;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #333;padding:8px;text-align:left;}.highlight{background:#330;color:#ff0;}</style>";

$routes = app('router')->getRoutes();
$userManagementRoutes = [];
$usciteRoutes = [];

echo "<h2>Cerca 'user-management':</h2>";
echo "<table><tr><th>Method</th><th>URI</th><th>Action</th></tr>";

foreach ($routes as $route) {
    $uri = $route->uri();
    $methods = implode('|', $route->methods());
    $action = $route->getActionName();
    
    // Routes user-management
    if (strpos($uri, 'user-management') !== false) {
        echo "<tr class='highlight'>";
        echo "<td>$methods</td>";
        echo "<td>$uri</td>";
        echo "<td>$action</td>";
        echo "</tr>";
        $userManagementRoutes[] = $uri;
    }
    
    // Routes uscite-cocchi (per confronto)
    if (strpos($uri, 'uscite-cocchi') !== false && strpos($uri, 'user-management') === false) {
        $usciteRoutes[] = $uri;
    }
}

echo "</table>";

echo "<h2>Statistiche:</h2>";
echo "<p>Routes user-management trovate: <strong>" . count($userManagementRoutes) . "</strong></p>";
echo "<p>Routes uscite-cocchi (altre): <strong>" . count($usciteRoutes) . "</strong></p>";

if (count($userManagementRoutes) === 0) {
    echo "<h2 style='color:red'>❌ PROBLEMA: Nessuna route user-management registrata!</h2>";
    echo "<p>Laravel ha caricato api.php ma le routes non sono dentro.</p>";
    echo "<p>Possibile causa: api.php sul server è diverso da quello locale</p>";
    
    echo "<h3>Prime 5 routes uscite-cocchi (per confronto):</h3>";
    echo "<ul>";
    foreach (array_slice($usciteRoutes, 0, 5) as $r) {
        echo "<li>$r</li>";
    }
    echo "</ul>";
} else {
    echo "<h2 style='color:#0f0'>✅ Routes user-management TROVATE!</h2>";
    echo "<p>Se vedi questo ma l'API non funziona, problema è autenticazione/middleware</p>";
}

echo "<h2>Test Veloce:</h2>";
echo "<p>Prova questi link:</p>";
foreach ($userManagementRoutes as $route) {
    echo "<p><a href='/$route' target='_blank'>/$route</a></p>";
}
