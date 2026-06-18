<?php
/**
 * TEST DIRETTO CONTROLLER - Bypassa routing Laravel
 * Visita: https://backclub.it/backend/test-direct-call.php
 */

require __DIR__ . '/vendor/autoload.php';

header('Content-Type: application/json');

$app = require_once __DIR__ . '/bootstrap/app.php';

try {
    // Instanzia direttamente il controller
    $controller = new App\Http\Controllers\UserManagementController();
    
    // Crea una request fake
    $request = Illuminate\Http\Request::create('/test', 'GET', [
        'q' => '',  // cerca tutti
        'per_page' => 10
    ]);
    
    // Chiama il metodo search DIRETTAMENTE
    $response = $controller->search($request);
    
    // Output la risposta
    echo $response->getContent();
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
