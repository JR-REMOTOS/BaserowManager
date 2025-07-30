<?php require_once 'check_session.php'; ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciador Baserow - Sistema Completo</title>
    
    <!-- Meta Tags -->
    <meta name="description" content="Gerenciador completo para bases de dados Baserow - Oficial e VPS">
    <meta name="author" content="Seu Nome">
    <meta name="keywords" content="baserow, database, api, gerenciador">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0idXJsKCNncmFkaWVudCkiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0id2hpdGUiIHg9IjYiIHk9IjYiPgo8cGF0aCBkPSJNMTAgMlw2IDZIOHYxMGgxMlY2aDJsLTQtNHptLTEgM2gtMnYxaDJ2LTF6bTAgMmgtMnYxaDJ2LTF6bTAgMmgtMnYxaDJ2LTF6Ii8+Cjwvc3ZnPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudCI+CjxzdG9wIHN0b3AtY29sb3I9IiM2NjdlZWEiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNzY0YmEyIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- Estilos customizados -->
    <link href="styles.css" rel="stylesheet">
    
    <!-- Estilos específicos do M3U -->
    <style>
        .m3u-section {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--border-radius-sm);
            margin-bottom: 15px;
            transition: var(--transition);
        }
        
        .m3u-section:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        
        .m3u-section.active {
            background: rgba(255, 255, 255, 0.25);
            border-color: rgba(255, 255, 255, 0.4);
        }
        
        .m3u-item-card {
            transition: transform 0.2s ease;
            border: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .m3u-item-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .item-logo-placeholder {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
        }
        
        .item-logo-placeholder::before {
            content: '\f03d';
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
        }
        
        .series-logo {
            border: 2px solid #e9ecef;
        }
        
        .m3u-stats .badge {
            font-size: 0.75rem;
        }
        
        .category-header {
            background: rgba(0,0,0,0.05);
            padding: 12px 15px;
            border-radius: 8px;
            border-left: 4px solid var(--bs-primary);
        }
        
        .series-header {
            border-left: 4px solid var(--bs-info);
        }
        
        .m3u-url-input {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            border-radius: var(--border-radius-sm);
        }
        
        .m3u-url-input:focus {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.6);
            box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.25);
            color: white;
        }
        
        .m3u-url-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }
        
        .nav-tabs .nav-link {
            border: none;
            border-radius: 8px 8px 0 0;
            margin-right: 5px;
        }
        
        .nav-tabs .nav-link.active {
            background: var(--bs-primary);
            color: white;
        }
        
        .tab-content {
            background: white;
            border-radius: 0 8px 8px 8px;
            padding: 20px;
            min-height: 400px;
        }
        
        @media (max-width: 768px) {
            .m3u-item-card .item-info h6 {
                font-size: 0.9rem;
            }
            
            .item-logo, .series-logo {
                width: 45px !important;
                height: 45px !important;
            }
            
            .item-logo-placeholder {
                width: 45px;
                height: 45px;
                font-size: 1.2rem;
            }
        }
    </style>
</head>
<body>
    <!-- Loader inicial -->
    <div id="initialLoader" class="position-fixed w-100 h-100 d-flex justify-content-center align-items-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); z-index: 9999;">
        <div class="text-center text-white">
            <i class="fas fa-database fa-3x mb-3 spinner"></i>
            <h4>Carregando Baserow Manager</h4>
            <div class="spinner-border mt-3" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
        </div>
    </div>

    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <div class="col-md-3 sidebar p-0">
                <div class="p-4">
                    <!-- Cabeçalho -->
                    <div class="text-center mb-4">
                        <h3 class="text-white mb-2">
                            <i class="fas fa-database me-2"></i>
                            Baserow Manager
                        </h3>
                        <div id="siteInfo" class="text-center">
                            <small class="text-white-50">Selecione um site para começar</small>
                        </div>
                    </div>
                    
                    <!-- Configuração -->
                    <div class="mb-4">
                        <button class="btn btn-light w-100 btn-custom" onclick="app.toggleConfig()">
                            <i class="fas fa-cog me-2"></i>
                            Configurar Conexão
                        </button>
                    </div>

                    <!-- Botão de Sair -->
                    <div class="mb-4">
                        <button class="btn btn-danger w-100 btn-custom" id="logoutButton">
                            <i class="fas fa-sign-out-alt me-2"></i>
                            Sair
                        </button>
                    </div>

                    <!-- M3U Manager Section -->
                    <div class="mb-4">
                        <div class="m3u-section p-3" id="m3uSection">
                            <h6 class="text-white mb-3">
                                <i class="fas fa-list me-2"></i>
                                M3U Manager
                            </h6>
                            <!-- Formulário para Xtream Codes -->
                            <div id="xtreamForm" class="mb-3">
                                <h6 class="text-white mb-2">Conexão Xtream Codes</h6>
                                <div class="input-group mb-2">
                                    <input type="url" id="xtreamBaseUrl" class="form-control m3u-url-input" placeholder="URL do Xtream Codes (ex: http://xtreamcode.ex)">
                                </div>
                                <div class="input-group mb-2">
                                    <input type="text" id="xtreamUsername" class="form-control m3u-url-input" placeholder="Usuário">
                                </div>
                                <div class="input-group mb-2">
                                    <input type="password" id="xtreamPassword" class="form-control m3u-url-input" placeholder="Senha">
                                    <button class="btn btn-outline-light btn-sm" type="button" id="xtreamPasswordToggle">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <div class="input-group mb-2">
                                    <input type="text" id="xtreamConnectionName" class="form-control m3u-url-input" placeholder="Nome da conexão">
                                </div>
                                <button class="btn btn-primary btn-custom w-100" type="button" id="loadXtreamBtn" title="Força a atualização da lista a partir do servidor, limpando os dados salvos localmente.">
                                    <i class="fas fa-sync-alt me-2"></i>Forçar Atualização da Lista
                                </button>
                            </div>
                            <div id="m3uLoading" class="text-center mt-2" style="display: none;">
                                <small class="text-white-50">
                                    <i class="fas fa-spinner fa-spin me-1"></i>
                                    Processando lista...
                                </small>
                            </div>
                        </div>
                    </div>

                    <!-- Lista de Tabelas -->
                    <div id="tablesList">
                        <h5 class="text-white mb-3">
                            <i class="fas fa-table me-2"></i>
                            Tabelas Disponíveis
                        </h5>
                        <div id="tablesContainer">
                            <div class="text-white-50 text-center p-3">
                                Configure a conexão primeiro
                            </div>
                        </div>
                    </div>

                    <!-- Estatísticas -->
                    <div class="mt-4 pt-4 border-top border-white-25">
                        <div class="text-white-50 small text-center">
                            <div id="connectionStatus" class="mb-2">
                                <i class="fas fa-circle text-danger me-1"></i>
                                Desconectado
                            </div>
                            <div class="row text-center">
                                <div class="col-6">
                                    <div class="fw-bold" id="tableCount">0</div>
                                    <div class="small">Tabelas</div>
                                </div>
                                <div class="col-6">
                                    <div class="fw-bold" id="recordCount">0</div>
                                    <div class="small">Registros</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Conteúdo Principal -->
            <div class="col-md-9 main-content">
                <!-- Alertas serão inseridos aqui dinamicamente -->
                
                <!-- Painel de Configuração -->
                <div id="configPanel" class="config-panel" style="display: none;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4><i class="fas fa-plug me-2"></i>Configuração da Conexão</h4>
                        <button type="button" class="btn-close btn-close-white" onclick="app.toggleConfig()"></button>
                    </div>
                    
                    <div class="config-info alert alert-info mb-4">
                        <!-- Informações do site serão inseridas aqui -->
                    </div>
                    
                    <form id="configForm" class="position-relative">
                        <div class="row">
                            <div class="col-md-12 mb-3">
                                <label class="form-label">URL da API Baserow</label>
                                <input type="url" class="form-control" id="apiUrl" placeholder="https://api.baserow.io" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12 mb-3">
                                <label class="form-label">Token da API</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="apiToken" required placeholder="Seu token de acesso do Baserow">
                                    <button type="button" class="btn btn-outline-light" onclick="app.toggleTokenVisibility()">
                                        <i class="fas fa-eye" id="tokenEye"></i>
                                    </button>
                                </div>
                                <div class="form-text text-white-50">
                                    <i class="fas fa-lightbulb"></i> 
                                    Para obter o token: Baserow → Settings → API tokens → Create token
                                </div>
                            </div>
                        </div>
                        <hr class="my-4">
                        <h5 class="mb-3">IDs das Tabelas</h5>
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Tabela de Conteúdos</label>
                                <input type="text" class="form-control" id="conteudosTableId" placeholder="ID da Tabela">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Tabela de Categorias</label>
                                <input type="text" class="form-control" id="categoriasTableId" placeholder="ID da Tabela">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Tabela de Banners</label>
                                <input type="text" class="form-control" id="bannersTableId" placeholder="ID da Tabela">
                            </div>
                        </div>
                        <div class="d-flex gap-2 flex-wrap">
                            <button type="button" class="btn btn-light btn-custom" onclick="app.testConnection()">
                                <i class="fas fa-plug me-2"></i>Testar Conexão
                            </button>
                            <button type="button" class="btn btn-outline-light btn-custom" onclick="app.quickTest()">
                                <i class="fas fa-bolt me-2"></i>Teste Rápido
                            </button>
                            <button type="button" class="btn btn-outline-light btn-custom" onclick="app.openBaserowDocs()">
                                <i class="fas fa-question-circle me-2"></i>Ajuda
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Conteúdo M3U -->
                <div id="m3uContent" style="display: none;">
                    <!-- Conteúdo da lista M3U será renderizado aqui -->
                </div>

                <!-- Cabeçalho da Tabela Selecionada -->
                <div id="tableHeader" style="display: none;">
                    <div class="card border-0 shadow-sm mb-4 shadow-hover">
                        <div class="card-header table-header">
                            <div class="d-flex justify-content-between align-items-center flex-wrap">
                                <div class="mb-2 mb-md-0">
                                    <h4 class="mb-0" id="selectedTableName">
                                        <i class="fas fa-table me-2"></i>
                                        Tabela Selecionada
                                    </h4>
                                    <small id="recordCount">0 registros encontrados</small>
                                </div>
                                <div class="d-flex gap-2 flex-wrap">
                                    <button class="btn btn-success btn-custom" onclick="app.showAddForm()">
                                        <i class="fas fa-plus me-2"></i>Adicionar
                                    </button>
                                    <button class="btn btn-info btn-custom" onclick="app.refreshTable()">
                                        <i class="fas fa-sync-alt me-2"></i>Atualizar
                                    </button>
                                    <button class="btn btn-danger btn-custom" onclick="app.confirmDeleteAll()">
                                        <i class="fas fa-trash-alt me-2"></i>Excluir Todos
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="d-flex gap-3 flex-wrap">
                                <div class="flex-grow-1">
                                    <input type="text" class="form-control" id="searchInput" placeholder="🔍 Pesquisar registros..." onkeyup="app.searchRecords()">
                                </div>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-outline-primary btn-custom" onclick="app.refreshTable()" title="Atualizar">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button class="btn btn-outline-secondary btn-custom" onclick="app.exportData()" title="Exportar">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Formulário de Adição/Edição -->
                <div id="recordForm" class="record-form" style="display: none;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 id="formTitle" class="mb-0">
                            <i class="fas fa-plus-circle me-2"></i>
                            Adicionar Novo Registro
                        </h5>
                        <button type="button" class="btn-close" onclick="app.hideRecordForm()"></button>
                    </div>
                    
                    <form id="dataForm" novalidate>
                        <div id="formFields" class="row"></div>
                        <div class="d-flex gap-2 mt-4 flex-wrap">
                            <button type="button" class="btn btn-success btn-custom" onclick="app.saveRecord()">
                                <i class="fas fa-save me-2"></i>Salvar
                            </button>
                            <button type="button" class="btn btn-secondary btn-custom" onclick="app.hideRecordForm()">
                                <i class="fas fa-times me-2"></i>Cancelar
                            </button>
                            <button type="button" class="btn btn-outline-warning btn-custom" onclick="app.clearForm()">
                                <i class="fas fa-eraser me-2"></i>Limpar
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Loading -->
                <div id="loading" class="loading" style="display: none;">
                    <div class="text-center">
                        <i class="fas fa-spinner spinner fa-3x text-primary mb-3"></i>
                        <h5 class="text-muted">Carregando dados...</h5>
                        <p class="text-muted">Aguarde enquanto processamos sua solicitação</p>
                    </div>
                </div>

                <!-- Tabela de Dados -->
                <div id="dataContainer" style="display: none;">
                    <div class="data-table">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-header">
                                    <tr id="tableHeaders"></tr>
                                </thead>
                                <tbody id="tableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Paginação -->
                    <div class="d-flex justify-content-between align-items-center mt-4 flex-wrap">
                        <div class="text-muted mb-2 mb-md-0">
                            <span id="recordInfo">Mostrando registros</span>
                        </div>
                        <nav>
                            <ul class="pagination pagination-custom mb-0" id="pagination"></ul>
                        </nav>
                    </div>
                </div>

                <!-- Estado Vazio -->
                <div id="emptyState" class="empty-state">
                    <i class="fas fa-database fa-5x text-muted mb-4"></i>
                    <h4 class="text-muted">Bem-vindo ao Baserow Manager</h4>
                    <p class="text-muted mb-4">
                        Conecte-se ao seu Baserow e gerencie seus dados facilmente
                    </p>
                    <div class="row justify-content-center">
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Como começar:</h6>
                                    <ol class="text-start">
                                        <li>Selecione o site Baserow (Oficial ou VPS)</li>
                                        <li>Configure sua conexão com o token da API</li>
                                        <li>Escolha uma tabela para visualizar e gerenciar dados</li>
                                        <li><strong>Novo:</strong> Use o M3U Manager para importar listas M3U</li>
                                    </ol>
                                    <button class="btn btn-primary btn-custom mt-2" onclick="app.toggleConfig()">
                                        <i class="fas fa-rocket me-2"></i>Começar Agora
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de Progresso -->
    <div class="modal fade" id="progressModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header border-0">
                    <h5 class="modal-title" id="progressTitle">Processando...</h5>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <div class="progress progress-custom">
                            <div class="progress-bar progress-bar-custom" id="progressBar" style="width: 0%" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                    <p id="progressMessage" class="text-center mb-0">Aguarde...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de Confirmação -->
    <div class="modal fade" id="confirmModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="confirmTitle">Confirmar Ação</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p id="confirmMessage">Tem certeza que deseja realizar esta ação?</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-danger" id="confirmButton">Confirmar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="mt-5 py-4 text-center text-muted border-top">
        <div class="container">
            <p class="mb-2">
                <strong>Baserow Manager</strong> - Gerencie seus dados com facilidade
            </p>
            <p class="small mb-0">
                Suporte aos sites: Baserow Oficial e VPS Personalizado + M3U Import
            </p>
            <div class="mt-2">
                <span class="badge bg-primary me-2">Versão 2.1</span>
                <span class="badge bg-success me-2">Multi-Site</span>
                <span class="badge bg-info me-2">API REST</span>
                <span class="badge bg-warning">M3U Import</span>
            </div>
        </div>
    </footer>

    <!-- Scripts -->
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Scripts da aplicação (módulos ES6) -->
    <script type="module" src="main.js"></script>
    
    <!-- Script para remover loader inicial -->
    <script>
        // Remover loader após carregamento completo
        window.addEventListener('load', function() {
            setTimeout(function() {
                const loader = document.getElementById('initialLoader');
                if (loader) {
                    loader.style.opacity = '0';
                    loader.style.transition = 'opacity 0.5s ease-out';
                    setTimeout(() => loader.remove(), 500);
                }
            }, 1000);
        });

        // Fallback para browsers sem suporte a módulos ES6
        if (!window.customElements) {
            document.write('<script src="https://polyfill.io/v3/polyfill.min.js?features=es6,es2015,es2017"><\/script>');
        }

        // Função global para compatibilidade com event handlers inline
        window.app = window.app || {
            selectTable: function() { console.warn('App ainda não carregado'); },
            toggleConfig: function() { console.warn('App ainda não carregado'); },
            testConnection: function() { console.warn('App ainda não carregado'); },
            quickTest: function() { console.warn('App ainda não carregado'); },
            updateApiUrl: function() { console.warn('App ainda não carregado'); },
            toggleTokenVisibility: function() { console.warn('App ainda não carregado'); },
            openBaserowDocs: function() { console.warn('App ainda não carregado'); },
            showAddForm: function() { console.warn('App ainda não carregado'); },
            editRecord: function() { console.warn('App ainda não carregado'); },
            deleteRecord: function() { console.warn('App ainda não carregado'); },
            saveRecord: function() { console.warn('App ainda não carregado'); },
            hideRecordForm: function() { console.warn('App ainda não carregado'); },
            confirmDeleteAll: function() { console.warn('App ainda não carregado'); },
            refreshTable: function() { console.warn('App ainda não carregado'); },
            searchRecords: function() { console.warn('App ainda não carregado'); },
            goToPage: function() { console.warn('App ainda não carregado'); }
        };
    </script>

    <!-- Service Worker para cache (opcional) -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                // navigator.serviceWorker.register('sw.js');
            });
        }
    </script>
</body>
</html>