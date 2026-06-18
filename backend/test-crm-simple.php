<?php
// Test endpoint: /backend/test-crm-simple.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Read .env for database config
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    echo json_encode(['error' => '.env file not found']);
    exit;
}

$envContent = file_get_contents($envFile);
preg_match('/DB_HOST=(.*)/', $envContent, $host);
preg_match('/DB_DATABASE=(.*)/', $envContent, $database);
preg_match('/DB_USERNAME=(.*)/', $envContent, $username);
preg_match('/DB_PASSWORD=(.*)/', $envContent, $password);

$dbHost = trim($host[1] ?? 'localhost');
$dbName = trim($database[1] ?? '');
$dbUser = trim($username[1] ?? '');
$dbPass = trim($password[1] ?? '');

try {
    // Connect to database
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get CRM codes from uscite_cocchi table
    $stmt = $pdo->query("
        SELECT 
            crm_code,
            SUM(amount) as total_amount,
            SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
            SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
            COUNT(*) as count
        FROM uscite_cocchi
        WHERE crm_code IS NOT NULL
        GROUP BY crm_code
    ");

    $crmData = [];
    $crmNames = [
        'CASA_FAMIGLIA' => 'Casa Famiglia',
        'SITI_WEB' => 'Siti Web',
        'CRM_PM' => 'CRM Project Management',
        'GESTIONE_CLIENTI' => 'Gestione Clienti',
        'CRM_GESTIONALI' => 'CRM Gestionali',
        'DIGITALIZZAZIONE' => 'Digitalizzazione e Formazione',
        'RISORSE_UMANE' => 'Risorse Umane',
        'VIDEO_GRAFICA' => 'Video e Grafica',
        'SMART_WORKING' => 'Smart Working',
        'ADS_CENTER' => 'Ads Center',
        'SEGRETERIA' => 'Segreteria',
    ];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $code = $row['crm_code'];
        
        // Get next payment
        $nextStmt = $pdo->prepare("
            SELECT payment_date, amount 
            FROM uscite_cocchi 
            WHERE crm_code = ? AND status = 'pending' AND payment_date IS NOT NULL
            ORDER BY payment_date ASC
            LIMIT 1
        ");
        $nextStmt->execute([$code]);
        $nextPayment = $nextStmt->fetch(PDO::FETCH_ASSOC);

        $crmData[] = [
            'code' => $code,
            'name' => $crmNames[$code] ?? $code,
            'total_amount' => (float)$row['total_amount'],
            'pending_amount' => (float)$row['pending_amount'],
            'paid_amount' => (float)$row['paid_amount'],
            'count' => (int)$row['count'],
            'next_payment_date' => $nextPayment['payment_date'] ?? null,
            'next_payment_amount' => $nextPayment ? (float)$nextPayment['amount'] : null,
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $crmData,
        'source' => 'direct_database',
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage(),
    ], JSON_PRETTY_PRINT);
}
