<?php
/**
 * API User Management - PUBBLIC per test
 * Bypassa sanctum per verificare funzionamento
 * https://backclub.it/api-public/user-management/search
 */

require __DIR__ . '/../backend/vendor/autoload.php';

$app = require_once __DIR__ . '/../backend/bootstrap/app.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $controller = new App\Http\Controllers\UserManagementController();
    
    $uri = $_SERVER['REQUEST_URI'];
    $method = $_SERVER['REQUEST_METHOD'];
   
    // Parse route
    if (preg_match('#/api-public/user-management/search#', $uri)) {
        $request = Illuminate\Http\Request::capture();
        $response = $controller->search($request);
        echo $response->getContent();
        
    } elseif (preg_match('#/api-public/user-management/(\d+)/detail#', $uri, $matches)) {
        $request = Illuminate\Http\Request::capture();
        $request->route()->setParameter('id', $matches[1]);
        $response = $controller->show($matches[1]);
        echo $response->getContent();
        
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Endpoint non trovato',
            'available' => [
                '/api-public/user-management/search',
                '/api-public/user-management/{id}/detail'
            ]
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
