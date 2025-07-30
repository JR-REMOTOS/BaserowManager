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
    $stmt = $conn->prepare("SELECT raw_data FROM m3u_items WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $user_id]);

    $items = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Decodifica o JSON armazenado na coluna raw_data
        $items[] = json_decode($row['raw_data'], true);
    }

    if (!empty($items)) {
        echo json_encode(['success' => true, 'data' => $items]);
    } else {
        echo json_encode(['success' => true, 'data' => []]); // Nenhuma configuração encontrada
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro ao carregar conteúdo M3U: ' . $e->getMessage()]);
}
?>
