<?php
<<<<<<< HEAD
=======
session_start();
>>>>>>> 21173c1 (Alterações falta Arrumar Mapeamento)
require_once 'conexao.php';

header('Content-Type: application/json');

<<<<<<< HEAD
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
=======
$response = ['success' => false, 'message' => 'Ocorreu um erro desconhecido.'];

try {
    $data = json_decode(file_get_contents('php://input'), true);

    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        $response['message'] = 'Usuário e senha são obrigatórios.';
        echo json_encode($response);
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
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $username;
            $response = ['success' => true, 'message' => 'Login bem-sucedido!'];
        } else {
            $response['message'] = 'Senha inválida.';
        }
    } else {
        // Se o usuário não existe, vamos criá-lo
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO users (email, password) VALUES (:username, :password)");
        if ($stmt->execute([':username' => $username, ':password' => $hashed_password])) {
            $_SESSION['user_id'] = $conn->lastInsertId();
            $_SESSION['user_email'] = $username;
            $response = ['success' => true, 'message' => 'Usuário criado e login bem-sucedido!'];
        } else {
            $response['message'] = 'Erro ao criar usuário.';
        }
    }
} catch (PDOException $e) {
    // Em modo de desenvolvimento, você pode querer logar o erro.
    // error_log($e->getMessage());
    $response['message'] = 'Erro no banco de dados. Por favor, tente novamente.';
} catch (Exception $e) {
    // error_log($e->getMessage());
    $response['message'] = 'Ocorreu um erro no servidor.';
}

echo json_encode($response);
>>>>>>> 21173c1 (Alterações falta Arrumar Mapeamento)
?>
