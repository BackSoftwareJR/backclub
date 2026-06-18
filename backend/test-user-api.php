<?php
/**
 * TEST DIRETTO - user management
 * Visita: https://backclub.it/backend/test-user-api.php
 */

require __DIR__ . '/vendor/autoload.php';

header('Content-Type: application/json');

$app = require_once __DIR__ . '/bootstrap/app.php';

echo json_encode([
    'test' => 'User Management API Test',
    'results' => [
        // Test 1: Controller esiste?
        'controller_exists' => file_exists(__DIR__ . '/app/Http/Controllers/UserManagementController.php'),
        
        // Test 2: Routes file aggiornato?
        'routes_file_size' => filesize(__DIR__ . '/routes/api.php'),
        'routes_modified' => date('Y-m-d H:i:s', filemtime(__DIR__ . '/routes/api.php')),
        
        // Test 3: Prova query diretta
        'direct_query' => function() {
            try {
                $pdo = app('db')->connection()->getPdo();
                $stmt = $pdo->query("SELECT id, name, email, role, is_active FROM users LIMIT 3");
                return [
                    'success' => true,
                    'users' => $stmt->fetchAll(PDO::FETCH_ASSOC)
                ];
            } catch (Exception $e) {
                return [
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        },
        
        // Test 4: Routes caricate?
        'routes_loaded' => function() {
            try {
                $routes = app('router')->getRoutes();
                $userManagementRoutes = [];
                
                foreach ($routes as $route) {
                    $uri = $route->uri();
                    if (strpos($uri, 'user-management') !== false) {
                        $userManagementRoutes[] = [
                            'uri' => $uri,
                            'methods' => $route->methods(),
                        ];
                    }
                }
                
                return [
                    'found' => count($userManagementRoutes),
                    'routes' => $userManagementRoutes
                ];
            } catch (Exception $e) {
                return [
                    'error' => $e->getMessage()
                ];
            }
        }
    ],
    'suggestions' => [
        'Se routes_loaded.found = 0' => 'Routes NON caricate, problema cache',
        'Se controller_exists = false' => 'Controller non uploadato',
        'Se direct_query.success = true' => 'Database OK, problema solo routes'
    ]
], JSON_PRETTY_PRINT);

// Execute callables
$output = json_decode(ob_get_clean() ?: '{}', true);
if (isset($output['results'])) {
    foreach ($output['results'] as $key => $value) {
        if (is_callable($value)) {
            $output['results'][$key] = $value();
        }
    }
}
echo json_encode($output, JSON_PRETTY_PRINT);
