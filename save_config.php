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
$conteudos_table_id = $data['conteudos_table_id'] ?? null;
$categorias_table_id = $data['categorias_table_id'] ?? null;
$episodios_table_id = $data['episodios_table_id'] ?? null;
$banners_table_id = $data['banners_table_id'] ?? null;
$usuarios_table_id = $data['usuarios_table_id'] ?? null;
$canais_table_id = $data['canais_table_id'] ?? null;
$pagamentos_table_id = $data['pagamentos_table_id'] ?? null;
$planos_table_id = $data['planos_table_id'] ?? null;
$tv_categoria_table_id = $data['tv_categoria_table_id'] ?? null;
$mapping_conteudos = isset($data['mapping_conteudos']) ? json_encode($data['mapping_conteudos']) : null;
$mapping_episodios = isset($data['mapping_episodios']) ? json_encode($data['mapping_episodios']) : null;
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
            conteudos_table_id = :conteudos_table_id,
            categorias_table_id = :categorias_table_id,
            episodios_table_id = :episodios_table_id,
            banners_table_id = :banners_table_id,
            usuarios_table_id = :usuarios_table_id,
            canais_table_id = :canais_table_id,
            pagamentos_table_id = :pagamentos_table_id,
            planos_table_id = :planos_table_id,
            tv_categoria_table_id = :tv_categoria_table_id,
            mapping_conteudos = :mapping_conteudos,
            mapping_episodios = :mapping_episodios,
            m3u_url = :m3u_url,
            m3u_username = :m3u_username,
            m3u_password = :m3u_password,
            updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id
        ");
    } else {
        // Inserir nova configuração
        $stmt = $conn->prepare("INSERT INTO user_configs
            (user_id, baserow_api_url, baserow_api_token, conteudos_table_id, categorias_table_id, episodios_table_id, banners_table_id, usuarios_table_id, canais_table_id, pagamentos_table_id, planos_table_id, tv_categoria_table_id, mapping_conteudos, mapping_episodios, m3u_url, m3u_username, m3u_password)
            VALUES
            (:user_id, :baserow_api_url, :baserow_api_token, :conteudos_table_id, :categorias_table_id, :episodios_table_id, :banners_table_id, :usuarios_table_id, :canais_table_id, :pagamentos_table_id, :planos_table_id, :tv_categoria_table_id, :mapping_conteudos, :mapping_episodios, :m3u_url, :m3u_username, :m3u_password)
        ");
    }

    $stmt->execute([
        ':user_id' => $user_id,
        ':baserow_api_url' => $baserow_api_url,
        ':baserow_api_token' => $baserow_api_token,
        ':conteudos_table_id' => $conteudos_table_id,
        ':categorias_table_id' => $categorias_table_id,
        ':episodios_table_id' => $episodios_table_id,
        ':banners_table_id' => $banners_table_id,
        ':usuarios_table_id' => $usuarios_table_id,
        ':canais_table_id' => $canais_table_id,
        ':pagamentos_table_id' => $pagamentos_table_id,
        ':planos_table_id' => $planos_table_id,
        ':tv_categoria_table_id' => $tv_categoria_table_id,
        ':mapping_conteudos' => $mapping_conteudos,
        ':mapping_episodios' => $mapping_episodios,
        ':m3u_url' => $m3u_url,
        ':m3u_username' => $m3u_username,
        ':m3u_password' => $m3u_password
    ]);

    echo json_encode(['success' => true, 'message' => 'Configurações salvas com sucesso.']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar configurações: ' . $e->getMessage()]);
}
?>
