<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado.']);
    exit;
}

$configFile = 'config_global.php';
$data = file_get_contents('php://input');

if (file_put_contents($configFile, $data)) {
    echo json_encode(['success' => true, 'message' => 'Configurações salvas com sucesso.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar configurações.']);
}
?>
