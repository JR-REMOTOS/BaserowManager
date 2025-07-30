<?php
session_start();
require_once 'conexao.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

$baserow_api_url = $data['baserow_api_url'] ?? null;
$baserow_api_token = $data['baserow_api_token'] ?? null;
$baserow_database_id = $data['baserow_database_id'] ?? null;
$m3u_url = $data['m3u_url'] ?? null;
$m3u_username = $data['m3u_username'] ?? null;
$m3u_password = $data['m3u_password'] ?? null;

try {
    // Verificar se já existe uma configuração para este usuário
    $stmt = $conn->prepare("SELECT id FROM user_configs WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $user_id]);
    $existing_config = $stmt->fetch();

    if ($existing_config) {
        // Atualizar configuração existente
        $stmt = $conn->prepare("UPDATE user_configs SET
            baserow_api_url = :baserow_api_url,
            baserow_api_token = :baserow_api_token,
            baserow_database_id = :baserow_database_id,
            m3u_url = :m3u_url,
            m3u_username = :m3u_username,
            m3u_password = :m3u_password,
            updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id
        ");
    } else {
        // Inserir nova configuração
        $stmt = $conn->prepare("INSERT INTO user_configs
            (user_id, baserow_api_url, baserow_api_token, baserow_database_id, m3u_url, m3u_username, m3u_password)
            VALUES
            (:user_id, :baserow_api_url, :baserow_api_token, :baserow_database_id, :m3u_url, :m3u_username, :m3u_password)
        ");
    }

    $stmt->execute([
        ':user_id' => $user_id,
        ':baserow_api_url' => $baserow_api_url,
        ':baserow_api_token' => $baserow_api_token,
        ':baserow_database_id' => $baserow_database_id,
        ':m3u_url' => $m3u_url,
        ':m3u_username' => $m3u_username,
        ':m3u_password' => $m3u_password
    ]);

    echo json_encode(['success' => true, 'message' => 'Configurações salvas com sucesso.']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar configurações: ' . $e->getMessage()]);
}
?>
