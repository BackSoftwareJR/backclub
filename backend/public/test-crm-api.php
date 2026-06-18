<?php
// Test CRM API endpoint
header('Content-Type: application/json');

// Simulate authentication
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer test-token';

// Include Laravel bootstrap
require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

use Illuminate\Http\Request;

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Create a test request to /api/budget/crm
$request = Request::create('/api/budget/crm', 'GET');

try {
    $response = $kernel->handle($request);
    
    echo "Status: " . $response->getStatusCode() . "\n\n";
    echo "Response:\n";
    echo $response->getContent();
    
    $kernel->terminate($request, $response);
} catch (Exception $e) {
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}

