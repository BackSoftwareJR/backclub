<?php
/**
 * Test script per verificare che PHPMailer sia caricato correttamente
 * 
 * IMPORTANTE: Elimina questo file dopo il test per motivi di sicurezza!
 * 
 * Visita: https://backclub.it/backend/test-phpmailer.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=utf-8');

echo '<!DOCTYPE html>
<html>
<head>
    <title>Test PHPMailer</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .success { color: #10b981; background: #d1fae5; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .error { color: #ef4444; background: #fee2e2; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .info { color: #3b82f6; background: #dbeafe; padding: 10px; border-radius: 4px; margin: 10px 0; }
        pre { background: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto; }
        h1 { color: #1f2937; }
        h2 { color: #4b5563; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Test PHPMailer Installation</h1>';

// Test 1: Verifica percorso vendor/autoload.php
echo '<h2>1. Verifica vendor/autoload.php</h2>';
$vendorAutoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($vendorAutoload)) {
    echo '<div class="success">✅ vendor/autoload.php trovato</div>';
    echo '<div class="info">Percorso: ' . htmlspecialchars($vendorAutoload) . '</div>';
    
    // Prova a caricare autoload
    try {
        require_once $vendorAutoload;
        echo '<div class="success">✅ vendor/autoload.php caricato con successo</div>';
    } catch (\Exception $e) {
        echo '<div class="error">❌ Errore nel caricamento: ' . htmlspecialchars($e->getMessage()) . '</div>';
    }
} else {
    echo '<div class="error">❌ vendor/autoload.php NON trovato</div>';
    echo '<div class="info">Percorso cercato: ' . htmlspecialchars($vendorAutoload) . '</div>';
}

// Test 2: Verifica cartella PHPMailer
echo '<h2>2. Verifica cartella PHPMailer</h2>';
$phpmailerPath = __DIR__ . '/../vendor/phpmailer/phpmailer';
$phpmailerSrc = $phpmailerPath . '/src';
$phpmailerFile = $phpmailerSrc . '/PHPMailer.php';

if (is_dir($phpmailerPath)) {
    echo '<div class="success">✅ Cartella vendor/phpmailer/phpmailer trovata</div>';
    echo '<div class="info">Percorso: ' . htmlspecialchars($phpmailerPath) . '</div>';
    
    if (is_dir($phpmailerSrc)) {
        echo '<div class="success">✅ Cartella src/ trovata</div>';
        
        if (file_exists($phpmailerFile)) {
            echo '<div class="success">✅ File PHPMailer.php trovato</div>';
            echo '<div class="info">Percorso: ' . htmlspecialchars($phpmailerFile) . '</div>';
            echo '<div class="info">Dimensione: ' . filesize($phpmailerFile) . ' bytes</div>';
        } else {
            echo '<div class="error">❌ File PHPMailer.php NON trovato</div>';
        }
        
        // Lista file nella cartella src
        $files = glob($phpmailerSrc . '/*.php');
        if (count($files) > 0) {
            echo '<div class="info">File trovati in src/: ' . count($files) . '</div>';
            echo '<pre>';
            foreach (array_slice($files, 0, 10) as $file) {
                echo basename($file) . "\n";
            }
            if (count($files) > 10) {
                echo "... e altri " . (count($files) - 10) . " file\n";
            }
            echo '</pre>';
        }
    } else {
        echo '<div class="error">❌ Cartella src/ NON trovata</div>';
    }
} else {
    echo '<div class="error">❌ Cartella vendor/phpmailer/phpmailer NON trovata</div>';
    echo '<div class="info">Percorso cercato: ' . htmlspecialchars($phpmailerPath) . '</div>';
}

// Test 3: Verifica classe PHPMailer
echo '<h2>3. Verifica classe PHPMailer</h2>';
if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    echo '<div class="success">✅ Classe PHPMailer\\PHPMailer\\PHPMailer disponibile</div>';
    
    try {
        $mailer = new \PHPMailer\PHPMailer\PHPMailer(true);
        echo '<div class="success">✅ Istanza PHPMailer creata con successo</div>';
        echo '<div class="info">Versione: ' . $mailer::VERSION . '</div>';
    } catch (\Exception $e) {
        echo '<div class="error">❌ Errore nella creazione istanza: ' . htmlspecialchars($e->getMessage()) . '</div>';
    }
} else {
    echo '<div class="error">❌ Classe PHPMailer\\PHPMailer\\PHPMailer NON disponibile</div>';
    
    // Prova a caricare manualmente
    echo '<h3>4. Tentativo caricamento manuale</h3>';
    if (file_exists($phpmailerFile)) {
        try {
            require_once $phpmailerFile;
            require_once $phpmailerSrc . '/SMTP.php';
            require_once $phpmailerSrc . '/Exception.php';
            
            if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
                echo '<div class="success">✅ PHPMailer caricato manualmente con successo!</div>';
            } else {
                echo '<div class="error">❌ Caricamento manuale fallito</div>';
            }
        } catch (\Exception $e) {
            echo '<div class="error">❌ Errore nel caricamento manuale: ' . htmlspecialchars($e->getMessage()) . '</div>';
        }
    } else {
        echo '<div class="error">❌ Impossibile caricare manualmente: file non trovato</div>';
    }
}

// Test 4: Verifica MailService
echo '<h2>5. Verifica MailService</h2>';
$mailServicePath = __DIR__ . '/../app/Services/MailService.php';
if (file_exists($mailServicePath)) {
    echo '<div class="success">✅ MailService.php trovato</div>';
    
    try {
        require_once $mailServicePath;
        if (class_exists('App\Services\MailService')) {
            echo '<div class="success">✅ Classe MailService disponibile</div>';
            
            // Prova a istanziare (potrebbe fallire se PHPMailer non è disponibile)
            try {
                $mailService = new \App\Services\MailService();
                echo '<div class="success">✅ MailService istanziato con successo!</div>';
            } catch (\Exception $e) {
                echo '<div class="error">❌ Errore nell\'istanziazione MailService: ' . htmlspecialchars($e->getMessage()) . '</div>';
            }
        } else {
            echo '<div class="error">❌ Classe MailService NON disponibile</div>';
        }
    } catch (\Exception $e) {
        echo '<div class="error">❌ Errore nel caricamento MailService: ' . htmlspecialchars($e->getMessage()) . '</div>';
    }
} else {
    echo '<div class="error">❌ MailService.php NON trovato</div>';
}

// Riepilogo
echo '<h2>📋 Riepilogo</h2>';
$allOk = class_exists('PHPMailer\PHPMailer\PHPMailer') && 
         file_exists($phpmailerFile) && 
         file_exists($vendorAutoload);

if ($allOk) {
    echo '<div class="success" style="font-size: 18px; font-weight: bold;">
        ✅ PHPMailer è installato correttamente!<br>
        Puoi eliminare questo file di test.
    </div>';
} else {
    echo '<div class="error" style="font-size: 18px; font-weight: bold;">
        ❌ PHPMailer NON è installato correttamente!<br>
        Carica la cartella vendor/phpmailer/ sul server.
    </div>';
}

echo '</div></body></html>';

