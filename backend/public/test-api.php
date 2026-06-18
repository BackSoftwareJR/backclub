<?php
/**
 * Test API Endpoint - Verifica CORS e Route
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

echo json_encode([
    'status' => 'OK',
    'message' => 'API endpoint raggiungibile',
    'timestamp' => date('Y-m-d H:i:s'),
    'server' => [
        'PHP_VERSION' => PHP_VERSION,
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
        'REQUEST_URI' => $_SERVER['REQUEST_URI'],
        'HTTP_ORIGIN' => $_SERVER['HTTP_ORIGIN'] ?? 'non presente',
    ],
    'next_steps' => [
        'Login API' => 'POST /api/login',
        'Register API' => 'POST /api/register',
        'Me API' => 'GET /api/me'
    ]
]);

