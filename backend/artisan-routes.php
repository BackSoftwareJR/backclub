<?php
/**
 * FINALE - forza route:list via Artisan
 * https://backclub.it/backend/artisan-routes.php
 */
require __DIR__ . '/vendor/autoload.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Artisan route:list</h1>";
echo "<style>body{font-family:monospace;padding:20px;background:#1a1a1a;color:#0f0;}pre{background:#000;padding:10px;border:1px solid #333;}</style>";

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

// Esegui route:list
ob_start();
$exitCode = $kernel->call('route:list', ['--path' => 'uscite-cocchi']);
$output = ob_get_clean();

echo "<h2>Routes uscite-cocchi/*:</h2>";
echo "<pre>" . htmlspecialchars($output) . "</pre>";

echo "<h2>Test diretto endpoint:</h2>";
echo "<p>Se le routes ci sono sopra, prova:</p>";
echo "<p><a href='https://backclub.it/api/uscite-cocchi/user-management/search?q=' target='_blank'>https://backclub.it/api/uscite-cocchi/user-management/search</a></p>";

// Prova anche senza Artisan - chiama direttamente
echo "<h2>Test API AJAX:</h2>";
echo "<button onclick=\"testAPI()\">Test API Search</button>";
echo "<pre id='result'></pre>";
echo "<script>
function testAPI() {
    fetch('/api/uscite-cocchi/user-management/search')
        .then(r => r.json())
        .then(data => {
            document.getElementById('result').textContent = JSON.stringify(data, null, 2);
        })
        .catch(e => {
            document.getElementById('result').textContent = 'ERROR: ' + e.message;
        });
}
</script>";
