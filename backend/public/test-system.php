<?php
/**
 * PAGINA DI TEST SISTEMA - BackClub
 * 
 * ⚠️ ATTENZIONE: Rimuovere questa pagina in produzione!
 * 
 * Verifica:
 * - Connessione database
 * - Hash password
 * - Configurazione Laravel
 * - Utenti esistenti
 * - API endpoints
 */

// Mostra TUTTI gli errori per debug
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Stile minimale Apple-style
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BackClub - Test Sistema</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(to bottom right, #f9fafb, #f3f4f6);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #6b7280;
            font-size: 14px;
        }
        
        .warning {
            background: #fef3c7;
            border: 2px solid #fbbf24;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .warning-icon {
            font-size: 24px;
        }
        
        .warning-text {
            flex: 1;
        }
        
        .warning-text strong {
            display: block;
            color: #92400e;
            font-size: 16px;
            margin-bottom: 5px;
        }
        
        .warning-text p {
            color: #78350f;
            font-size: 14px;
        }
        
        .test-section {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .test-section h2 {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f3f4f6;
        }
        
        .test-item {
            display: flex;
            align-items: center;
            padding: 15px;
            background: #f9fafb;
            border-radius: 12px;
            margin-bottom: 10px;
        }
        
        .test-item:last-child {
            margin-bottom: 0;
        }
        
        .status {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            margin-right: 15px;
            flex-shrink: 0;
        }
        
        .status.success {
            background: #10b981;
            color: white;
        }
        
        .status.error {
            background: #ef4444;
            color: white;
        }
        
        .status.warning {
            background: #f59e0b;
            color: white;
        }
        
        .test-content {
            flex: 1;
        }
        
        .test-label {
            font-weight: 600;
            color: #111827;
            margin-bottom: 5px;
        }
        
        .test-detail {
            font-size: 13px;
            color: #6b7280;
            font-family: 'Monaco', 'Courier New', monospace;
        }
        
        .code-block {
            background: #1f2937;
            color: #10b981;
            padding: 15px;
            border-radius: 12px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            overflow-x: auto;
            margin-top: 10px;
        }
        
        .users-table {
            width: 100%;
            margin-top: 15px;
            border-collapse: separate;
            border-spacing: 0;
        }
        
        .users-table th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            font-size: 13px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .users-table th:first-child {
            border-top-left-radius: 8px;
        }
        
        .users-table th:last-child {
            border-top-right-radius: 8px;
        }
        
        .users-table td {
            padding: 12px;
            font-size: 13px;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .users-table tr:last-child td {
            border-bottom: none;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .badge.admin {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .badge.freelance {
            background: #dcfce7;
            color: #15803d;
        }
        
        .badge.client {
            background: #fef3c7;
            color: #92400e;
        }
        
        .badge.active {
            background: #d1fae5;
            color: #065f46;
        }
        
        .badge.inactive {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: linear-gradient(to bottom, #3b82f6, #2563eb);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-label {
            display: block;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .form-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            font-family: inherit;
            transition: border-color 0.2s;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #3b82f6;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🔧 BackClub - Test Sistema</h1>
            <p>Verifica connessioni database, configurazioni e funzionalità</p>
        </div>
        
        <!-- Warning -->
        <div class="warning">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
                <strong>Attenzione - Solo per Testing</strong>
                <p>Questa pagina deve essere rimossa prima del deploy in produzione. Contiene informazioni sensibili.</p>
            </div>
        </div>

<?php

// Inizializza risultati test
$results = [
    'php_version' => PHP_VERSION,
    'php_extensions' => [],
    'laravel_loaded' => false,
    'laravel_version' => 'N/A',
    'laravel_error' => null,
    'db_connected' => false,
    'db_name' => 'N/A',
    'db_error' => null,
    'users_count' => 0,
    'users' => [],
    'errors' => []
];

// Verifica estensioni PHP necessarie
$requiredExtensions = ['pdo', 'pdo_mysql', 'mbstring', 'openssl', 'tokenizer', 'xml', 'ctype', 'json'];
foreach ($requiredExtensions as $ext) {
    $results['php_extensions'][$ext] = extension_loaded($ext);
}

// Test 1: Verifica che i file Laravel esistano
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
$appPath = __DIR__ . '/../bootstrap/app.php';

if (!file_exists($autoloadPath)) {
    $results['errors'][] = "File vendor/autoload.php non trovato. Eseguire: composer install";
} elseif (!file_exists($appPath)) {
    $results['errors'][] = "File bootstrap/app.php non trovato";
} else {
    // Test 2: Prova a caricare Laravel
    try {
        require_once $autoloadPath;
        
        try {
            $app = require_once $appPath;
            $results['laravel_loaded'] = true;
            
            try {
                // Ottieni versione Laravel
                $results['laravel_version'] = $app->version();
            } catch (Exception $e) {
                $results['laravel_version'] = 'Versione non disponibile';
            }
            
            // Test 3: Bootstrap Laravel
            try {
                $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
                $kernel->bootstrap();
                
                // Test 4: Connessione Database
                try {
                    $pdo = DB::connection()->getPdo();
                    $results['db_connected'] = true;
                    $results['db_name'] = DB::connection()->getDatabaseName();
                    
                    // Test 5: Query utenti
                    try {
                        $users = DB::table('users')->get();
                        $results['users_count'] = $users->count();
                        $results['users'] = $users;
                    } catch (Exception $e) {
                        $results['errors'][] = "Query utenti fallita: " . $e->getMessage();
                    }
                    
                } catch (Exception $e) {
                    $results['db_connected'] = false;
                    $results['db_error'] = $e->getMessage();
                    $results['errors'][] = "Database Error: " . $e->getMessage();
                }
                
            } catch (Exception $e) {
                $results['errors'][] = "Bootstrap Error: " . $e->getMessage();
            }
            
        } catch (Exception $e) {
            $results['laravel_loaded'] = false;
            $results['laravel_error'] = $e->getMessage();
            $results['errors'][] = "Laravel App Error: " . $e->getMessage();
        }
        
    } catch (Exception $e) {
        $results['errors'][] = "Autoload Error: " . $e->getMessage();
    }
}

?>

        <!-- Test PHP -->
        <div class="test-section">
            <h2>🐘 Informazioni PHP</h2>
            <div class="test-item">
                <div class="status success">✓</div>
                <div class="test-content">
                    <div class="test-label">Versione PHP</div>
                    <div class="test-detail"><?php echo $results['php_version']; ?></div>
                </div>
            </div>
            <div class="test-item">
                <div class="status <?php echo version_compare(PHP_VERSION, '8.1.0', '>=') ? 'success' : 'warning'; ?>">
                    <?php echo version_compare(PHP_VERSION, '8.1.0', '>=') ? '✓' : '⚠'; ?>
                </div>
                <div class="test-content">
                    <div class="test-label">Compatibilità Laravel</div>
                    <div class="test-detail">
                        <?php echo version_compare(PHP_VERSION, '8.1.0', '>=') ? 'OK - Laravel 11 supportato' : 'Attenzione - Laravel 11 richiede PHP 8.1+'; ?>
                    </div>
                </div>
            </div>
            
            <!-- Estensioni PHP -->
            <div class="test-item">
                <div class="status <?php echo !in_array(false, $results['php_extensions'], true) ? 'success' : 'error'; ?>">
                    <?php echo !in_array(false, $results['php_extensions'], true) ? '✓' : '✗'; ?>
                </div>
                <div class="test-content">
                    <div class="test-label">Estensioni PHP</div>
                    <div class="test-detail">
                        <?php 
                        foreach ($results['php_extensions'] as $ext => $loaded) {
                            $icon = $loaded ? '✓' : '✗';
                            $color = $loaded ? '#10b981' : '#ef4444';
                            echo "<span style='color: $color; margin-right: 10px;'>$icon $ext</span>";
                        }
                        ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Test Laravel -->
        <div class="test-section">
            <h2>🚀 Laravel Framework</h2>
            <div class="test-item">
                <div class="status <?php echo $results['laravel_loaded'] ? 'success' : 'error'; ?>">
                    <?php echo $results['laravel_loaded'] ? '✓' : '✗'; ?>
                </div>
                <div class="test-content">
                    <div class="test-label">Framework Laravel</div>
                    <div class="test-detail">
                        <?php 
                        if ($results['laravel_loaded']) {
                            echo 'Laravel caricato correttamente - v' . $results['laravel_version'];
                        } else {
                            echo 'Errore nel caricamento di Laravel';
                            if ($results['laravel_error']) {
                                echo '<br><span style="color: #ef4444;">Errore: ' . htmlspecialchars($results['laravel_error']) . '</span>';
                            }
                        }
                        ?>
                    </div>
                </div>
            </div>
            
            <?php if ($results['laravel_loaded']): ?>
            <?php 
            try {
                $env = config('app.env');
                $debug = config('app.debug');
                $appUrl = config('app.url');
            ?>
            <div class="test-item">
                <div class="status success">✓</div>
                <div class="test-content">
                    <div class="test-label">Environment</div>
                    <div class="test-detail"><?php echo $env; ?></div>
                </div>
            </div>
            <div class="test-item">
                <div class="status <?php echo $debug ? 'warning' : 'success'; ?>">
                    <?php echo $debug ? '⚠' : '✓'; ?>
                </div>
                <div class="test-content">
                    <div class="test-label">Debug Mode</div>
                    <div class="test-detail">
                        <?php echo $debug ? 'ATTIVO (disattivare in produzione!)' : 'Disattivato (OK)'; ?>
                    </div>
                </div>
            </div>
            <div class="test-item">
                <div class="status success">✓</div>
                <div class="test-content">
                    <div class="test-label">APP_URL</div>
                    <div class="test-detail"><?php echo $appUrl; ?></div>
                </div>
            </div>
            <?php } catch (Exception $e) { ?>
            <div class="test-item">
                <div class="status error">✗</div>
                <div class="test-content">
                    <div class="test-label">Configurazione Laravel</div>
                    <div class="test-detail" style="color: #ef4444;">
                        Errore lettura config: <?php echo htmlspecialchars($e->getMessage()); ?>
                    </div>
                </div>
            </div>
            <?php } ?>
            <?php endif; ?>
        </div>

        <!-- Test Database -->
        <div class="test-section">
            <h2>🗄️ Database MySQL</h2>
            <div class="test-item">
                <div class="status <?php echo $results['db_connected'] ? 'success' : 'error'; ?>">
                    <?php echo $results['db_connected'] ? '✓' : '✗'; ?>
                </div>
                <div class="test-content">
                    <div class="test-label">Connessione Database</div>
                    <div class="test-detail">
                        <?php 
                        if ($results['db_connected']) {
                            echo 'Connesso a: ' . $results['db_name'];
                        } else {
                            echo 'Errore di connessione';
                            if ($results['db_error']) {
                                echo '<br><span style="color: #ef4444;">Errore: ' . htmlspecialchars($results['db_error']) . '</span>';
                            }
                        }
                        ?>
                    </div>
                </div>
            </div>
            
            <?php if ($results['db_connected']): ?>
            <div class="test-item">
                <div class="status success">✓</div>
                <div class="test-content">
                    <div class="test-label">Utenti Registrati</div>
                    <div class="test-detail"><?php echo $results['users_count']; ?> utenti trovati nel database</div>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <!-- Tabella Utenti -->
        <?php if ($results['db_connected'] && $results['users_count'] > 0): ?>
        <div class="test-section">
            <h2>👥 Utenti nel Database</h2>
            <table class="users-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Ruolo</th>
                        <th>Stato</th>
                        <th>Creato</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($results['users'] as $user): ?>
                    <tr>
                        <td><strong>#<?php echo $user->id; ?></strong></td>
                        <td><?php echo htmlspecialchars($user->name); ?></td>
                        <td><?php echo htmlspecialchars($user->email); ?></td>
                        <td>
                            <span class="badge <?php echo $user->role; ?>">
                                <?php echo strtoupper($user->role); ?>
                            </span>
                        </td>
                        <td>
                            <span class="badge <?php echo $user->is_active ? 'active' : 'inactive'; ?>">
                                <?php echo $user->is_active ? 'Attivo' : 'Disattivato'; ?>
                            </span>
                        </td>
                        <td><?php echo date('d/m/Y H:i', strtotime($user->created_at)); ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>

        <!-- Test Password Hash -->
        <div class="test-section">
            <h2>🔐 Test Hash Password</h2>
            <p style="color: #6b7280; margin-bottom: 20px; font-size: 14px;">
                Testa la funzionalità di hash password bcrypt usata per il login
            </p>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label class="form-label">Password da testare</label>
                    <input type="text" name="test_password" class="form-input" placeholder="Inserisci una password" value="<?php echo isset($_POST['test_password']) ? htmlspecialchars($_POST['test_password']) : ''; ?>">
                </div>
                
                <?php if ($results['laravel_loaded'] && isset($_POST['test_password']) && !empty($_POST['test_password'])): ?>
                <?php 
                $testPassword = $_POST['test_password'];
                $hashedPassword = Hash::make($testPassword);
                $isValid = Hash::check($testPassword, $hashedPassword);
                ?>
                
                <div class="test-item" style="margin-top: 15px;">
                    <div class="status success">✓</div>
                    <div class="test-content">
                        <div class="test-label">Password in chiaro</div>
                        <div class="test-detail"><?php echo htmlspecialchars($testPassword); ?></div>
                    </div>
                </div>
                
                <div class="test-item">
                    <div class="status success">✓</div>
                    <div class="test-content">
                        <div class="test-label">Hash Bcrypt generato</div>
                        <div class="code-block"><?php echo $hashedPassword; ?></div>
                    </div>
                </div>
                
                <div class="test-item">
                    <div class="status <?php echo $isValid ? 'success' : 'error'; ?>">
                        <?php echo $isValid ? '✓' : '✗'; ?>
                    </div>
                    <div class="test-content">
                        <div class="test-label">Verifica Hash</div>
                        <div class="test-detail"><?php echo $isValid ? 'Hash valido - La password corrisponde' : 'Hash non valido'; ?></div>
                    </div>
                </div>
                <?php endif; ?>
                
                <button type="submit" class="btn" style="margin-top: 15px;">Genera Hash Password</button>
            </form>
        </div>

        <!-- Test Login Simulato -->
        <?php if ($results['db_connected'] && $results['users_count'] > 0): ?>
        <div class="test-section">
            <h2>🔑 Test Login (Simulato)</h2>
            <p style="color: #6b7280; margin-bottom: 20px; font-size: 14px;">
                Testa la verifica delle credenziali senza effettuare il login reale
            </p>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="login_email" class="form-input" placeholder="email@esempio.it" value="<?php echo isset($_POST['login_email']) ? htmlspecialchars($_POST['login_email']) : ''; ?>">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="login_password" class="form-input" placeholder="Password">
                </div>
                
                <?php if (isset($_POST['login_email']) && isset($_POST['login_password'])): ?>
                <?php
                $loginEmail = $_POST['login_email'];
                $loginPassword = $_POST['login_password'];
                
                $user = DB::table('users')->where('email', $loginEmail)->first();
                
                if ($user):
                    $passwordMatch = Hash::check($loginPassword, $user->password);
                    $isActive = $user->is_active == 1;
                    ?>
                    
                    <div class="test-item" style="margin-top: 15px;">
                        <div class="status success">✓</div>
                        <div class="test-content">
                            <div class="test-label">Utente trovato</div>
                            <div class="test-detail"><?php echo htmlspecialchars($user->name); ?> (<?php echo $user->role; ?>)</div>
                        </div>
                    </div>
                    
                    <div class="test-item">
                        <div class="status <?php echo $passwordMatch ? 'success' : 'error'; ?>">
                            <?php echo $passwordMatch ? '✓' : '✗'; ?>
                        </div>
                        <div class="test-content">
                            <div class="test-label">Verifica Password</div>
                            <div class="test-detail"><?php echo $passwordMatch ? 'Password corretta ✓' : 'Password errata ✗'; ?></div>
                        </div>
                    </div>
                    
                    <div class="test-item">
                        <div class="status <?php echo $isActive ? 'success' : 'warning'; ?>">
                            <?php echo $isActive ? '✓' : '⚠'; ?>
                        </div>
                        <div class="test-content">
                            <div class="test-label">Stato Account</div>
                            <div class="test-detail"><?php echo $isActive ? 'Account attivo' : 'Account disattivato'; ?></div>
                        </div>
                    </div>
                    
                    <?php if ($passwordMatch && $isActive): ?>
                    <div class="test-item" style="background: #d1fae5; border: 2px solid #10b981;">
                        <div class="status success">✓</div>
                        <div class="test-content">
                            <div class="test-label" style="color: #065f46;">✅ Login riuscirebbe</div>
                            <div class="test-detail" style="color: #047857;">
                                Credenziali valide - Il login backend funzionerebbe correttamente
                            </div>
                        </div>
                    </div>
                    <?php else: ?>
                    <div class="test-item" style="background: #fee2e2; border: 2px solid #ef4444;">
                        <div class="status error">✗</div>
                        <div class="test-content">
                            <div class="test-label" style="color: #991b1b;">❌ Login fallirebbe</div>
                            <div class="test-detail" style="color: #b91c1c;">
                                <?php 
                                if (!$passwordMatch) echo 'Password errata';
                                else if (!$isActive) echo 'Account disattivato';
                                ?>
                            </div>
                        </div>
                    </div>
                    <?php endif; ?>
                    
                <?php else: ?>
                    <div class="test-item" style="margin-top: 15px; background: #fee2e2; border: 2px solid #ef4444;">
                        <div class="status error">✗</div>
                        <div class="test-content">
                            <div class="test-label" style="color: #991b1b;">Utente non trovato</div>
                            <div class="test-detail" style="color: #b91c1c;">
                                Nessun utente con email: <?php echo htmlspecialchars($loginEmail); ?>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
                <?php endif; ?>
                
                <button type="submit" class="btn" style="margin-top: 15px;">Testa Credenziali</button>
            </form>
        </div>
        <?php endif; ?>

        <!-- Errori -->
        <?php if (!empty($results['errors'])): ?>
        <div class="test-section" style="background: #fee2e2; border: 2px solid #ef4444;">
            <h2 style="color: #991b1b;">❌ Errori Riscontrati</h2>
            <?php foreach ($results['errors'] as $error): ?>
            <div class="test-item" style="background: white;">
                <div class="status error">✗</div>
                <div class="test-content">
                    <div class="test-detail" style="color: #dc2626;"><?php echo htmlspecialchars($error); ?></div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <!-- Footer -->
        <div style="text-align: center; padding: 30px; color: #9ca3af; font-size: 13px;">
            <p>BackClub Test System v1.0</p>
            <p style="margin-top: 5px;">⚠️ Rimuovere questa pagina prima del deploy in produzione</p>
        </div>
    </div>
</body>
</html>

