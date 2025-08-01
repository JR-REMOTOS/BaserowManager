<?php
header('Content-Type: application/json');

$configFile = 'config_global.php';
$config = [];

if (file_exists($configFile) && filesize($configFile) > 0) {
    $config = json_decode(file_get_contents($configFile), true);
}

echo json_encode(['success' => true, 'data' => $config]);
?>
