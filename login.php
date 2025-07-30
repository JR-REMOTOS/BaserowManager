<?php
require_once 'conexao.php';

header('Content-Type: application/json');

// Obter dados do POST
$data = json_decode(file_get_contents('php://input'), true);

$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Usuário e senha são obrigatórios.']);
    exit;
}

// Buscar usuário no banco de dados
$stmt = $conn->prepare("SELECT password FROM users WHERE email = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    $hashed_password = $user['password'];

    // Verificar a senha
    if (password_verify($password, $hashed_password)) {
        // Iniciar sessão ou gerar token JWT aqui, se necessário
        session_start();
        $_SESSION['user'] = $username;
        echo json_encode(['success' => true, 'message' => 'Login bem-sucedido!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Senha inválida.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Usuário não encontrado.']);
}

$stmt->close();
$conn->close();
?>
