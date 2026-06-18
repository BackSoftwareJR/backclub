<?php
/**
 * TEST SUPER SEMPLICE - Solo PDO, no Laravel
 * Visita: https://backclub.it/backend/test-simple.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Leggi config database da .env
$envFile = __DIR__ . '/.env';
$config = [];

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        $config[trim($key)] = trim($value);
    }
}

try {
    // Connessione PDO diretta
    $host = $config['DB_HOST'] ?? 'localhost';
    $db = $config['DB_DATABASE'] ?? '';
    $user = $config['DB_USERNAME'] ?? '';
    $pass = $config['DB_PASSWORD'] ?? '';
    
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // Query users diretta
    $query = $_GET['q'] ?? '';
    $sql = "SELECT id, name, email, role, is_active FROM users";
    
    if ($query) {
        $sql .= " WHERE name LIKE :query OR email LIKE :query";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['query' => "%$query%"]);
    } else {
        $sql .= " LIMIT 10";
        $stmt = $pdo->query($sql);
    }
    
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format output
    $result = [
        'success' => true,
        'data' => array_map(function($u) {
            return [
                'id' => (int)$u['id'],
                'name' => $u['name'],
                'email' => $u['email'],
                'role' => $u['role'],
                'is_active' => (int)$u['is_active'],
                'total_hours' => 0,
                'total_payments' => 0,
                'active_projects' => 0
            ];
        }, $users),
        'pagination' => [
            'total' => count($users),
            'per_page' => 10,
            'current_page' => 1
        ]
    ];
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
