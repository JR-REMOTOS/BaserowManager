<?php
session_start();
require_once 'conexao.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$items = json_decode(file_get_contents('php://input'), true);

if (empty($items) || !is_array($items)) {
    echo json_encode(['success' => false, 'message' => 'Nenhum item recebido.']);
    exit;
}

try {
    $conn->beginTransaction();

    // 1. Limpar itens antigos do usuário
    $stmt = $conn->prepare("DELETE FROM m3u_items WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $user_id]);

    // 2. Inserir novos itens
    $stmt = $conn->prepare(
        "INSERT INTO m3u_items (user_id, type, name, logo, url, series_name, season, episode, category, raw_data)
         VALUES (:user_id, :type, :name, :logo, :url, :series_name, :season, :episode, :category, :raw_data)"
    );

    foreach ($items as $item) {
        $stmt->execute([
            ':user_id' => $user_id,
            ':type' => $item['type'] ?? 'movie',
            ':name' => $item['name'] ?? null,
            ':logo' => $item['logo'] ?? null,
            ':url' => $item['url'] ?? null,
            ':series_name' => $item['seriesName'] ?? null,
            ':season' => $item['season'] ?? null,
            ':episode' => $item['episode'] ?? null,
            ':category' => $item['category'] ?? ($item['group'] ?? null),
            ':raw_data' => json_encode($item)
        ]);
    }

    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Conteúdo M3U salvo com sucesso.']);

} catch (PDOException $e) {
    $conn->rollBack();
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar conteúdo M3U: ' . $e->getMessage()]);
}
?>
