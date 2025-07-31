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
        conteudos_table_id TEXT,
        categorias_table_id TEXT,
        episodios_table_id TEXT,
        banners_table_id TEXT,
        usuarios_table_id TEXT,
        canais_table_id TEXT,
        pagamentos_table_id TEXT,
        planos_table_id TEXT,
        tv_categoria_table_id TEXT,
        mapping_conteudos TEXT,
        mapping_episodios TEXT,
        m3u_url TEXT,
        m3u_username TEXT,
        m3u_password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    // Criar a tabela 'm3u_items' se não existir
    $conn->exec("CREATE TABLE IF NOT EXISTS m3u_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'movie', 'series', 'episode', 'channel'
        name TEXT,
        logo TEXT,
        url TEXT,
        -- Campos específicos para séries/episódios
        series_name TEXT,
        season INTEGER,
        episode INTEGER,
        -- Outros metadados
        category TEXT,
        raw_data TEXT, -- Para armazenar o objeto JSON completo do item
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    echo "Tabelas 'users', 'user_configs' e 'm3u_items' criadas com sucesso ou já existem.";

} catch (PDOException $e) {
    echo "Erro ao configurar o banco de dados: " . $e->getMessage();
}
?>
