<?php
/**
 * Mostra contenuto REALE api.php sul server
 * https://backclub.it/backend/check-api-file.php
 */
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Contenuto api.php sul Server</h1>";
echo "<style>body{font-family:monospace;padding:20px;background:#1a1a1a;color:#0f0;}pre{background:#000;padding:10px;border:1px solid #333;overflow-x:auto;}</style>";

$apiFile = __DIR__ . '/routes/api.php';

if (!file_exists($apiFile)) {
    echo "<p style='color:red'>❌ FILE NON ESISTE: $apiFile</p>";
    exit;
}

echo "<h2>Info File:</h2>";
echo "<p>Path: $apiFile</p>";
echo "<p>Size: " . filesize($apiFile) . " bytes</p>";
echo "<p>Modified: " . date('Y-m-d H:i:s', filemtime($apiFile)) . "</p>";

echo "<h2>Contenuto Righe 130-165 (zona user-management):</h2>";
$lines = file($apiFile);
$start = 129; // riga 130 (0-indexed)
$end = 164;   // riga 165

echo "<pre>";
for ($i = $start; $i <= $end && $i < count($lines); $i++) {
    $lineNum = $i + 1;
    $line = htmlspecialchars($lines[$i]);
    
    // Evidenzia user-management
    if (strpos($line, 'user-management') !== false) {
        echo "<span style='background:#330;color:#ff0;'>$lineNum: $line</span>";
    } else {
        echo "$lineNum: $line";
    }
}
echo "</pre>";

echo "<h2>Cerca 'user-management' nell'intero file:</h2>";
$content = file_get_contents($apiFile);
$positions = [];
$offset = 0;

while (($pos = strpos($content, 'user-management', $offset)) !== false) {
    // Trova numero riga
    $lineNum = substr_count($content, "\n", 0, $pos) + 1;
    $positions[] = "Riga $lineNum";
    $offset = $pos + 1;
}

if (empty($positions)) {
    echo "<p style='color:red'>❌ 'user-management' NON trovato nel file!</p>";
    echo "<p style='color:red'>Il file api.php sul server è VECCHIO!</p>";
} else {
    echo "<p style='color:#0f0'>✅ Trovato 'user-management' in: " . implode(', ', $positions) . "</p>";
}

echo "<h2>Cerca 'uscite-cocchi' nell'intero file:</h2>";
if (strpos($content, 'uscite-cocchi') !== false) {
    echo "<p style='color:#0f0'>✅ 'uscite-cocchi' trovato</p>";
} else {
    echo "<p style='color:red'>❌ 'uscite-cocchi' NON trovato</p>";
}

echo "<h2>🔧 Diagnosi:</h2>";
if (empty($positions)) {
    echo "<p style='color:#ff0;font-size:20px;'>⚠️ FILE api.php sul server NON è aggiornato!</p>";
    echo "<p>SOLUZIONE: Ri-upload backend/routes/api.php</p>";
}
