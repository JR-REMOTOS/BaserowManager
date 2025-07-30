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
$stmt = $conn->prepare("SELECT id, password FROM users WHERE email = :username");
$stmt->execute([':username' => $username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    $hashed_password = $user['password'];

    // Verificar a senha
    if (password_verify($password, $hashed_password)) {
        // Iniciar sessão
        session_start();
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $username;
        echo json_encode(['success' => true, 'message' => 'Login bem-sucedido!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Senha inválida.']);
    }
} else {
    // Se o usuário não existe, vamos criá-lo
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (email, password) VALUES (:username, :password)");
    if ($stmt->execute([':username' => $username, ':password' => $hashed_password])) {
        // Iniciar sessão
        session_start();
        $_SESSION['user_id'] = $conn->lastInsertId();
        $_SESSION['user_email'] = $username;
        echo json_encode(['success' => true, 'message' => 'Usuário criado e login bem-sucedido!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Erro ao criar usuário.']);
    }
}
?>
