<?php
session_start();
require_once 'conexao.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado.']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    $stmt = $conn->prepare("SELECT * FROM user_configs WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $user_id]);
    $config = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($config) {
        echo json_encode(['success' => true, 'data' => $config]);
    } else {
        echo json_encode(['success' => true, 'data' => []]); // Nenhuma configuração encontrada
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro ao carregar configurações: ' . $e->getMessage()]);
}
?>
