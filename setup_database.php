<?php
require_once 'conexao.php';

try {
    // Adicionar coluna 'id' à tabela 'users' se não existir
    $conn->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )");

    // Criar a tabela 'user_configs' se não existir
    $conn->exec("CREATE TABLE IF NOT EXISTS user_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        baserow_api_url TEXT,
        baserow_api_token TEXT,
        baserow_database_id TEXT,
        m3u_url TEXT,
        m3u_username TEXT,
        m3u_password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    echo "Tabelas 'users' e 'user_configs' criadas com sucesso ou já existem.";

} catch (PDOException $e) {
    echo "Erro ao configurar o banco de dados: " . $e->getMessage();
}
?>
