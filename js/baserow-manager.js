// Your original code here, with additions for basebanco.site
// (The full code from your message, plus the fixes)

let config = {
    apiUrl: 'https://api.baserow.io',
    token: '',
    databaseId: '136515'
};
let tables = [];
let selectedTable = null;
let tableFields = [];
let currentRecords = [];
let currentPage = 1;
let totalRecords = 0;
let recordsPerPage = 20;
let editingRowId = null;
let searchTerm = '';

function normalizeApiUrl(apiUrl) {
    apiUrl = apiUrl.trim().replace(/\/+$/, '');
    
    const urlMap = {
        'api.baserow.io': 'https://api.baserow.io/api',
        'basebanco.site': 'http://basebanco.site/api',
        'app.baserow.io': 'https://app.baserow.io/api',
        'baserow.io': 'https://api.baserow.io/api'
    };

    for (let [key, value] of Object.entries(urlMap)) {
        if (apiUrl.includes(key)) {
            return value;
        }
    }
    
    if (!apiUrl.endsWith('/api')) {
        apiUrl += '/api';
    }
    return apiUrl;
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('dataContainer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-custom alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.main-content').insertBefore(alertDiv, document.querySelector('.main-content').firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showProgress(title, message) {
    document.getElementById('progressTitle').textContent = title;
    document.getElementById('progressMessage').textContent = message;
    document.getElementById('progressBar').style.width = '0%';
    new bootstrap.Modal(document.getElementById('progressModal')).show();
}

function updateProgress(percentage, message) {
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressMessage').textContent = message;
}

function hideProgress() {
    bootstrap.Modal.getInstance(document.getElementById('progressModal')).hide();
}

// Configuração
function toggleConfig() {
    const panel = document.getElementById('configPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function testConnection() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const token = document.getElementById('apiToken').value.trim();
    let databaseId = document.getElementById('databaseId').value.trim();

    // Forçar databaseId 128 para basebanco.site se não fornecido
    if (apiUrl.includes('basebanco.site') && !databaseId) {
        databaseId = '128';
        document.getElementById('databaseId').value = '128';
    }

    if (!apiUrl || !token) {
        showAlert('Por favor, preencha a URL da API e o token', 'warning');
        return;
    }

    if (!apiUrl.match(/^https?:\/\/.+/)) {
        showAlert('URL deve começar com http:// ou https://', 'warning');
        return;
    }

    showProgress('Testando Conexão', 'Verificando credenciais...');

    try {
        config = { apiUrl, token, databaseId: databaseId || '' };
        
        updateProgress(30, 'Testando acesso à API...');
        
        // Testar diferentes endpoints para verificar se a API está funcionando
        let apiWorking = false;
        const testEndpoints = apiUrl.includes('basebanco.site')
            ? ['database/tables/database/128/']
            : ['api/user/', 'user/', 'api/health/', 'health/'];
        
        for (const endpoint of testEndpoints) {
            try {
                await makeRequest(endpoint);
                apiWorking = true;
                updateProgress(50, 'API acessível! Carregando tabelas...');
                break;
            } catch (error) {
                continue;
            }
        }
        
        if (!apiWorking) {
            updateProgress(50, 'Continuando mesmo sem health check...');
        }

        // Carregar tabelas
        await loadTables();
        
        updateProgress(100, 'Conexão estabelecida!');
        
        hideProgress();
        
        if (tables.length > 0) {
            const tableNames = tables.map(t => t.name).join(', ');
            showAlert(`🎉 Conectado com sucesso ao ${new URL(apiUrl).hostname}!\n\n📋 ${tables.length} tabelas encontradas:\n${tableNames}`, 'success');
        } else {
            showAlert(`⚠️ Conectado ao ${new URL(apiUrl).hostname}, mas nenhuma tabela foi encontrada. Verifique o Database ID ou as permissões do token.`, 'warning');
        }
        
        toggleConfig();
    } catch (error) {
        hideProgress();
        console.error('Erro detalhado:', error);
        
        let errorMessage = error.message;
        const hostname = new URL(apiUrl).hostname;
        
        if (error.message.includes('401')) {
            errorMessage = `🔑 Token inválido para ${hostname}\n\n` +
                'Soluções:\n' +
                '• Verifique se o token está correto\n' +
                '• Gere um novo token no painel do Baserow\n' +
                '• Certifique-se que o token tem permissões de leitura';
        } else if (error.message.includes('404')) {
            errorMessage = `🔍 Endpoints não encontrados em ${hostname}\n\n` +
                'Soluções:\n' +
                '• Confirme se a URL está correta\n' +
                '• Tente adicionar ou remover /api/ na URL\n' +
                '• Verifique se o Database ID está correto\n' +
                '• Confirme se o site está online';
        } else if (error.message.includes('conexão') || error.message.includes('fetch')) {
            errorMessage = `🌐 Erro de conexão com ${hostname}\n\n` +
                'Soluções:\n' +
                '• Verifique se o site está online\n' +
                '• Confirme sua conexão com a internet\n' +
                '• Tente desabilitar bloqueadores de anúncios\n' +
                '• Verifique se há CORS configurado no servidor';
        }
        
        showAlert('Erro na conexão:\n' + errorMessage, 'danger');
    }
}

async function makeRequest(endpoint, options = {}) {
    const url = `${normalizeApiUrl(config.apiUrl)}/${endpoint.replace(/^\//, '')}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Token ${config.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.error || errorMessage;
            } catch (e) {
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
            }
            
            if (response.status === 401) {
                throw new Error('Token inválido ou sem permissões. Verifique o token nas configurações do Baserow.');
            } else if (response.status === 404) {
                throw new Error('Endpoint não encontrado. Verifique a URL da API e se o database ID está correto.');
            } else {
                throw new Error(errorMessage);
            }
        }

        return response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Erro de conexão. Verifique a URL da API e sua conexão com a internet.');
        }
        throw error;
    }
}

// Gerenciamento de tabelas
async function loadTables() {
    try {
        let tablesData;
        
        // Tentar múltiplos endpoints para máxima compatibilidade
        const endpoints = [
            'api/database/tables/all-tables/',           // Endpoint padrão do Baserow
            `api/database/tables/database/${config.databaseId || '136515'}/`,  // Com database específico
            'api/database/tables/',                      // Endpoint simples
            'database/tables/all-tables/',               // Variação sem api/
            `database/tables/database/${config.databaseId || '136515'}/`,      // Variação sem api/
            'database/tables/'                           // Mais simples ainda
        ];

        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Tentando endpoint: ${endpoint}`);
                tablesData = await makeRequest(endpoint);
                
                if (tablesData) {
                    console.log(`✅ Sucesso com endpoint: ${endpoint}`);
                    console.log('Dados recebidos:', tablesData);
                    break;
                }
            } catch (error) {
                console.log(`❌ Falhou endpoint ${endpoint}:`, error.message);
                lastError = error;
                continue;
            }
        }

        if (!tablesData) {
            throw lastError || new Error('Nenhum endpoint funcionou');
        }

        // Normalizar dados - aceitar diferentes formatos de resposta
        let tablesList = [];
        
        if (Array.isArray(tablesData)) {
            // Resposta é um array direto
            tablesList = tablesData;
        } else if (tablesData.results && Array.isArray(tablesData.results)) {
            // Resposta tem propriedade results
            tablesList = tablesData.results;
        } else if (tablesData.data && Array.isArray(tablesData.data)) {
            // Resposta tem propriedade data
            tablesList = tablesData.data;
        } else if (tablesData.tables && Array.isArray(tablesData.tables)) {
            // Resposta tem propriedade tables
            tablesList = tablesData.tables;
        }

        // Garantir que cada tabela tenha as propriedades necessárias
        tablesList = tablesList.map(table => ({
            id: table.id,
            name: table.name || `Tabela ${table.id}`,
            database_id: table.database_id || config.databaseId,
            order: table.order || 0
        }));

        tables = tablesList;
        console.log(`📋 Total de tabelas encontradas: ${tables.length}`);
        console.log('Tabelas:', tables);
        
        renderTables();
        
    } catch (error) {
        console.error('Erro completo:', error);
        throw new Error('Erro ao carregar tabelas: ' + error.message);
    }
}

function renderTables() {
    const container = document.getElementById('tablesContainer');
    if (tables.length === 0) {
        container.innerHTML = '<div class="text-white-50 text-center p-3">Nenhuma tabela encontrada</div>';
        return;
    }

    container.innerHTML = tables.map(table => `
        <div class="table-item p-3 text-white" onclick="selectTable(${table.id})">
            <div class="fw-bold">${table.name}</div>
            <small class="text-white-50">ID: ${table.id}</small>
        </div>
    `).join('');
}

async function selectTable(tableId) {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    selectedTable = table;
    editingRowId = null;
    currentPage = 1;
    searchTerm = '';

    // Atualizar UI
    document.querySelectorAll('.table-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.table-item').classList.add('active');

    document.getElementById('selectedTableName').innerHTML = `
        <i class="fas fa-table me-2"></i>${table.name}
    `;
    document.getElementById('tableHeader').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('searchInput').value = '';

    hideRecordForm();
    await loadTableData();
}

async function loadTableData() {
    showLoading();
    try {
        // Carregar campos da tabela
        const fieldsData = await makeRequest(`api/database/fields/table/${selectedTable.id}/`);
        tableFields = fieldsData.results || fieldsData || [];

        // Carregar dados
        await fetchRecords();
    } catch (error) {
        hideLoading();
        showAlert('Erro ao carregar dados da tabela: ' + error.message, 'danger');
    }
}

async function fetchRecords(page = 1) {
    try {
        let endpoint = `api/database/rows/table/${selectedTable.id}/?user_field_names=true&page=${page}&size=${recordsPerPage}`;
        if (searchTerm) {
            endpoint += `&search=${encodeURIComponent(searchTerm)}`;
        }

        const data = await makeRequest(endpoint);
        currentRecords = data.results || [];
        totalRecords = data.count || 0;
        currentPage = page;

        renderTable();
        renderPagination();
        updateRecordCount();
        hideLoading();
    } catch (error) {
        hideLoading();
        showAlert('Erro ao buscar registros: ' + error.message, 'danger');
    }
}

function renderTable() {
    const headersContainer = document.getElementById('tableHeaders');
    const bodyContainer = document.getElementById('tableBody');

    // Renderizar cabeçalhos
    headersContainer.innerHTML = tableFields.map(field => 
        `<th class="text-white">${field.name}</th>`
    ).join('') + '<th class="text-white text-end">Ações</th>';

    // Renderizar dados
    if (currentRecords.length === 0) {
        bodyContainer.innerHTML = `
            <tr>
                <td colspan="${tableFields.length + 1}" class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-2">Nenhum registro encontrado</p>
                    ${searchTerm ? 
                        '<small class="text-muted">Tente ajustar sua pesquisa</small>' : 
                        '<small class="text-muted">Esta tabela não possui registros ainda</small>'
                    }
                </td>
            </tr>
        `;
    } else {
        bodyContainer.innerHTML = currentRecords.map(record => {
            const cells = tableFields.map(field => {
                let value = record[field.name];
                
                // Tratar diferentes tipos de campo baseado na documentação
                if (field.type === 'number') {
                    value = value || 0;
                } else if (field.name.toLowerCase().includes('capa') || field.name.toLowerCase().includes('imagem')) {
                    if (value && value.startsWith('http')) {
                        value = `<img src="${value}" class="record-image" alt="Imagem" style="max-width: 60px; max-height: 60px; border-radius: 4px;">`;
                    } else {
                        value = '<i class="fas fa-image text-muted"></i>';
                    }
                } else if (field.name.toLowerCase() === 'email') {
                    value = value ? `<a href="mailto:${value}" class="text-decoration-none">${value}</a>` : '-';
                } else if (field.name.toLowerCase().includes('link') || field.name.toLowerCase().includes('url')) {
                    if (value && value.startsWith('http')) {
                        value = `<a href="${value}" target="_blank" class="text-decoration-none" title="${value}">
                            <i class="fas fa-external-link-alt"></i> Link
                        </a>`;
                    } else {
                        value = value || '-';
                    }
                } else if (field.name.toLowerCase().includes('data') || field.name.toLowerCase().includes('pagamento')) {
                    if (value) {
                        const date = new Date(value);
                        value = date.toLocaleDateString('pt-BR');
                    } else {
                        value = '-';
                    }
                } else {
                    value = value || '-';
                    if (typeof value === 'string' && value.length > 50) {
                        value = `<span title="${value}">${value.substring(0, 50)}...</span>`;
                    }
                }
                
                return `<td>${value}</td>`;
            }).join('');

            return `
                <tr class="align-middle">
                    ${cells}
                    <td class="text-end">
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary" onclick="editRecord(${record.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteRecord(${record.id})" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('dataContainer').style.display = 'block';
}

function renderPagination() {
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(1)">Primeira</a>
        </li>
    `;

    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1})">Anterior</a>
        </li>
    `;

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
            </li>
        `;
    }

    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1})">Próxima</a>
        </li>
    `;

    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${totalPages})">Última</a>
        </li>
    `;

    pagination.innerHTML = html;
}

function goToPage(page) {
    if (page === currentPage) return;
    fetchRecords(page);
}

function updateRecordCount() {
    const start = ((currentPage - 1) * recordsPerPage) + 1;
    const end = Math.min(currentPage * recordsPerPage, totalRecords);
    document.getElementById('recordCount').textContent = `${totalRecords} registros encontrados`;
    document.getElementById('recordInfo').textContent = `Mostrando ${start} a ${end} de ${totalRecords} registros`;
}

let searchTimeout;
function searchRecords() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchTerm = document.getElementById('searchInput').value.trim();
        currentPage = 1;
        fetchRecords();
    }, 500);
}

function refreshTable() {
    if (selectedTable) {
        fetchRecords(currentPage);
    }
}

function showAddForm() {
    editingRowId = null;
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus-circle me-2"></i>Adicionar Novo Registro';
    renderForm();
    document.getElementById('recordForm').style.display = 'block';
}

async function editRecord(rowId) {
    try {
        const data = await makeRequest(`api/database/rows/table/${selectedTable.id}/${rowId}/?user_field_names=true`);
        editingRowId = rowId;
        document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Editar Registro';
        renderForm(data);
        document.getElementById('recordForm').style.display = 'block';
    } catch (error) {
        showAlert('Erro ao carregar registro: ' + error.message, 'danger');
    }
}

function renderForm(data = {}) {
    const container = document.getElementById('formFields');
    container.innerHTML = tableFields.filter(field => field.name !== 'id').map(field => {
        const value = data[field.name] || '';
        let input;

        switch (field.type) {
            case 'number':
                input = `<input type="number" class="form-control" id="field_${field.name}" value="${value}">`;
                break;
            case 'boolean':
                input = `
                    <select class="form-control" id="field_${field.name}">
                        <option value="true" ${value === true ? 'selected' : ''}>Sim</option>
                        <option value="false" ${value === false ? 'selected' : ''}>Não</option>
                    </select>
                `;
                break;
            case 'long_text':
                input = `<textarea class="form-control" id="field_${field.name}" rows="3">${value}</textarea>`;
                break;
            default:
                input = `<input type="text" class="form-control" id="field_${field.name}" value="${value}">`;
        }

        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold">${field.name}</label>
                ${input}
            </div>
        `;
    }).join('');
}

async function saveRecord() {
    try {
        const formData = {};
        tableFields.filter(field => field.name !== 'id').forEach(field => {
            const element = document.getElementById(`field_${field.name}`);
            let value = element.value;

            if (field.type === 'boolean') {
                value = value === 'true';
            } else if (field.type === 'number' && value) {
                value = parseFloat(value);
            }

            formData[field.name] = value;
        });

        if (editingRowId) {
            // Atualizar registro existente
            await makeRequest(`api/database/rows/table/${selectedTable.id}/${editingRowId}/?user_field_names=true`, {
                method: 'PATCH',
                body: JSON.stringify(formData)
            });
            showAlert('Registro atualizado com sucesso!', 'success');
        } else {
            // Criar novo registro
            await makeRequest(`api/database/rows/table/${selectedTable.id}/?user_field_names=true`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            showAlert('Registro adicionado com sucesso!', 'success');
        }

        hideRecordForm();
        fetchRecords(currentPage);
    } catch (error) {
        showAlert('Erro ao salvar registro: ' + error.message, 'danger');
    }
}

async function deleteRecord(rowId) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
        await makeRequest(`api/database/rows/table/${selectedTable.id}/${rowId}/`, {
            method: 'DELETE'
        });
        showAlert('Registro excluído com sucesso!', 'success');
        fetchRecords(currentPage);
    } catch (error) {
        showAlert('Erro ao excluir registro: ' + error.message, 'danger');
    }
}

async function confirmDeleteAll() {
    const confirmation = prompt(`Para excluir TODOS os ${totalRecords} registros desta tabela, digite: EXCLUIR TUDO`);
    if (confirmation !== 'EXCLUIR TUDO') {
        showAlert('Operação cancelada', 'info');
        return;
    }

    await deleteAllRecords();
}

async function deleteAllRecords() {
    showProgress('Excluindo Registros', 'Buscando todos os registros...');

    try {
        let allIds = [];
        let page = 1;
        
        while (true) {
            const data = await makeRequest(`api/database/rows/table/${selectedTable.id}/?page=${page}&size=200`);
            if (!data.results || data.results.length === 0) break;
            
            allIds.push(...data.results.map(row => row.id));
            if (data.results.length < 200) break;
            page++;
        }

        if (allIds.length === 0) {
            hideProgress();
            showAlert('Tabela já está vazia', 'info');
            return;
        }

        const batchSize = 50;
        let deleted = 0;
        
        for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            const percentage = Math.round(((i + batch.length) / allIds.length) * 100);
            
            updateProgress(percentage, `Excluindo ${deleted + batch.length} de ${allIds.length} registros...`);
            
            await Promise.all(batch.map(id => 
                makeRequest(`api/database/rows/table/${selectedTable.id}/${id}/`, {
                    method: 'DELETE'
                }).catch(err => console.error(`Erro ao excluir ID ${id}:`, err))
            ));
            
            deleted += batch.length;
        }

        hideProgress();
        showAlert(`${deleted} registros excluídos com sucesso!`, 'success');
        fetchRecords(1);
    } catch (error) {
        hideProgress();
        showAlert('Erro na exclusão em massa: ' + error.message, 'danger');
    }
}

function hideRecordForm() {
    document.getElementById('recordForm').style.display = 'none';
    editingRowId = null;
}

function quickTest() {
    document.getElementById('apiUrl').value = 'https://api.baserow.io';
    document.getElementById('databaseId').value = '136515';
    
    const tokenField = document.getElementById('apiToken');
    tokenField.focus();
    tokenField.style.borderColor = '#ffc107';
    tokenField.style.boxShadow = '0 0 0 0.2rem rgba(255, 193, 7, 0.25)';
    
    showAlert('⚡ Dados preenchidos! Agora cole seu token da API e clique em "Testar Conexão"', 'info');
    
    setTimeout(() => {
        tokenField.style.borderColor = '';
        tokenField.style.boxShadow = '';
    }, 3000);
}

function updateApiUrl() {
    const select = document.getElementById('apiUrlSelect');
    const input = document.getElementById('apiUrl');
    if (select.value !== 'custom') {
        input.value = select.value;
    }
}

function toggleTokenVisibility() {
    const tokenInput = document.getElementById('apiToken');
    const eyeIcon = document.getElementById('tokenEye');
    
    if (tokenInput.type === 'password') {
        tokenInput.type = 'text';
        eyeIcon.className = 'fas fa-eye-slash';
    } else {
        tokenInput.type = 'password';
        eyeIcon.className = 'fas fa-eye';
    }
}

function openBaserowDocs() {
    window.open('https://baserow.io/docs/apis%2Frest-api', '_blank');
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchRecords();
        }
    });
    document.getElementById('emptyState').style.display = 'block';
});

// Melhorar a função de renderização de tabelas com informações específicas
function renderTables() {
    const container = document.getElementById('tablesContainer');
    if (tables.length === 0) {
        container.innerHTML = `
            <div class="text-white-50 text-center p-3">
                <i class="fas fa-exclamation-triangle mb-2"></i><br>
                Nenhuma tabela encontrada<br>
                <small>Verifique as permissões do token</small>
            </div>
        `;
        return;
    }

    // Definir ícones específicos para cada tabela
    const tableIcons = {
        'Banners': 'fas fa-image',
        'Categorias': 'fas fa-tags',
        'Conteúdos': 'fas fa-film',
        'Episódios': 'fas fa-play-circle',
        'Pagamentos': 'fas fa-money-bill',
        'Planos': 'fas fa-list',
        'Tv Categoria': 'fas fa-tv',
        'Usuários': 'fas fa-users'
    };

    container.innerHTML = tables.map(table => `
        <div class="table-item p-3 text-white" onclick="selectTable(${table.id})">
            <div class="fw-bold">
                <i class="${tableIcons[table.name] || 'fas fa-table'} me-2"></i>
                ${table.name}
            </div>
            <small class="text-white-50">
                ID: ${table.id}
                ${table.database_id ? ` • DB: ${table.database_id}` : ''}
            </small>
        </div>
    `).join('');
}
