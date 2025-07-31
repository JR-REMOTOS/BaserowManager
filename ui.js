import { BASEROW_CONFIGS, TABLE_ICONS, QUICK_TEST_URLS, FIELD_VALIDATIONS } from './config.js';
import BaserowAPI from './api.js';
import { APIUtils } from './utils.js';

class UIManager {
    constructor() {
        this.api = new BaserowAPI();
        this.selectedTable = null;
        this.tableFields = [];
        this.currentRecords = [];
        this.currentPage = 1;
        this.totalRecords = 0;
        this.recordsPerPage = 20;
        this.editingRowId = null;
        this.searchTerm = '';
        this.searchTimeout = null;
        this.isM3UActive = false;
    }

    // Inicializar interface
    init() {
        this.setupEventListeners();
        this.showEmptyState();
        this.setupM3UIntegration();
    }

    // Configurar integração com M3U
    setupM3UIntegration() {
        // Observer para detectar quando conteúdo M3U é mostrado
        const m3uContent = document.getElementById('m3uContent');
        if (m3uContent) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const isVisible = m3uContent.style.display !== 'none';
                        this.handleM3UVisibilityChange(isVisible);
                    }
                });
            });
            
            observer.observe(m3uContent, { 
                attributes: true, 
                attributeFilter: ['style'] 
            });
        }

        // Adicionar indicador visual quando M3U está ativo
        this.updateM3UIndicator();
    }

    // Tratar mudança de visibilidade do M3U
    handleM3UVisibilityChange(isVisible) {
        this.isM3UActive = isVisible;
        this.updateM3UIndicator();
        
        if (isVisible) {
            // Quando M3U está ativo, ocultar elementos do Baserow
            this.hideBaserowElements();
            this.showM3UHelper();
        } else {
            // Quando M3U está inativo, mostrar elementos do Baserow se apropriado
            this.showBaserowElements();
            this.hideM3UHelper();
        }
    }

    // Atualizar indicador visual do M3U
    updateM3UIndicator() {
        const m3uSection = document.getElementById('m3uSection');
        const indicator = document.querySelector('.m3u-active-indicator');
        
        if (this.isM3UActive) {
            if (m3uSection && !indicator) {
                const indicatorHtml = `
                    <div class="m3u-active-indicator">
                        <i class="fas fa-circle text-success me-1"></i>
                        <small class="text-white-50">M3U Ativo</small>
                    </div>
                `;
                m3uSection.insertAdjacentHTML('beforeend', indicatorHtml);
            }
        } else {
            if (indicator) {
                indicator.remove();
            }
        }
    }

    // Ocultar elementos do Baserow quando M3U está ativo
    hideBaserowElements() {
        const elements = ['tableHeader', 'recordForm', 'dataContainer'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    }

    // Mostrar elementos do Baserow
    showBaserowElements() {
        if (this.selectedTable) {
            const tableHeader = document.getElementById('tableHeader');
            if (tableHeader) tableHeader.style.display = 'block';
        }
        
        if (this.currentRecords.length > 0) {
            const dataContainer = document.getElementById('dataContainer');
            if (dataContainer) dataContainer.style.display = 'block';
        }
    }

    // Mostrar helper para M3U
    showM3UHelper() {
        const existingHelper = document.querySelector('.m3u-helper');
        if (existingHelper) return;

        const helper = document.createElement('div');
        helper.className = 'alert alert-info m3u-helper';
        helper.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-info-circle me-2"></i>
                <div>
                    <strong>M3U Manager Ativo</strong><br>
                    <small>Selecione uma tabela no Baserow para importar os dados da lista M3U</small>
                </div>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(helper, mainContent.firstChild);
        }
    }

    // Ocultar helper do M3U
    hideM3UHelper() {
        const helper = document.querySelector('.m3u-helper');
        if (helper) helper.remove();
    }

    // Configurar event listeners
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', () => this.handleSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchRecords();
            });
        }

        // Escape key to close forms
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideRecordForm();
                this.hideConfig();
            }
        });

        // M3U URL input - Enter para carregar
        const m3uUrl = document.getElementById('m3uUrl');
        if (m3uUrl) {
            m3uUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('loadM3UBtn')?.click();
                }
            });
        }
    }


    // Mostrar/ocultar configuração
    toggleConfig() {
        const panel = document.getElementById('configPanel');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                // Preencher mapeamentos quando o painel for aberto
                const config = window.app?.api.config;
                if (config && config.mapping_conteudos) {
                    const mapping = config.mapping_conteudos;
                     document.querySelectorAll('[data-mapping="conteudos"]').forEach(input => {
                        if (mapping[input.name]) {
                            input.value = mapping[input.name];
                        }
                    });
                }
            }
        }
    }

    hideConfig() {
        const panel = document.getElementById('configPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // Teste rápido
    quickTest() {
        // Esta função pode ser adaptada ou removida, já que não há mais "sites" pré-configurados.
        // Por enquanto, ela apenas focará no campo de token.
        
        // Destacar campo de token
        const tokenField = document.getElementById('apiToken');
        if (tokenField) {
            tokenField.focus();
            tokenField.style.borderColor = '#ffc107';
            tokenField.style.boxShadow = '0 0 0 0.2rem rgba(255, 193, 7, 0.25)';
            
            setTimeout(() => {
                tokenField.style.borderColor = '';
                tokenField.style.boxShadow = '';
            }, 3000);
        }

        this.showAlert('⚡ Configurações preenchidas! Cole seu token e clique em "Testar Conexão"', 'info');
    }

    async testConnection() {
        const mappingConteudos = {};
        document.querySelectorAll('[data-mapping="conteudos"]').forEach(input => {
            if (input.value) {
                mappingConteudos[input.name] = input.value;
            }
        });

        const config = {
            apiUrl: document.getElementById('apiUrl')?.value?.trim(),
            token: document.getElementById('apiToken')?.value?.trim(),
            conteudosTableId: document.getElementById('conteudosTableId')?.value?.trim(),
            categoriasTableId: document.getElementById('categoriasTableId')?.value?.trim(),
            episodiosTableId: document.getElementById('episodiosTableId')?.value?.trim(),
            usuariosTableId: document.getElementById('usuariosTableId')?.value?.trim(),
            bannersTableId: document.getElementById('bannersTableId')?.value?.trim(),
            canaisTableId: document.getElementById('canaisTableId')?.value?.trim(),
            pagamentosTableId: document.getElementById('pagamentosTableId')?.value?.trim(),
            planosTableId: document.getElementById('planosTableId')?.value?.trim(),
            tvCategoriaTableId: document.getElementById('tvCategoriaTableId')?.value?.trim(),
            mapping_conteudos: mappingConteudos
            // Adicionar mapping_episodios quando implementado
        };

        if (!config.apiUrl || !config.token) {
            this.showAlert('URL da API e Token são obrigatórios.', 'warning');
            return;
        }

        this.showProgress('Testando Conexão', 'Verificando credenciais e tabelas...');
        this.api.setConfig(config);

        const result = await this.api.testConnection();

        if (result.success) {
            this.updateProgress(100, 'Conexão estabelecida!');
            this.showAlert(result.message, 'success');

            const tables = this.api.loadTables();
            this.renderTables(tables);

            this.hideProgress();
            this.hideConfig();
            this.saveConfig();
        } else {
            this.hideProgress();
            this.showAlert(`Erro na conexão: ${result.error}`, 'danger');
        }
    }

    // Renderizar lista de tabelas
    renderTables(tables = []) {
        const container = document.getElementById('tablesContainer');
        if (!container) return;

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

        container.innerHTML = tables.map(table => {
            const iconClass = this.getTableIcon(table.name);
            const isM3UCompatible = this.isTableM3UCompatible(table);
            const m3uBadge = isM3UCompatible ? '<span class="badge bg-success ms-1">M3U</span>' : '';
            
            return `
                <div class="table-item p-3 text-white" onclick="app.selectTable(${table.id}, '${table.name}')" 
                     title="${isM3UCompatible ? 'Compatível com M3U Manager' : ''}" 
                     data-m3u-compatible="${isM3UCompatible}">
                    <div class="fw-bold">
                        <i class="${iconClass} me-2"></i>
                        ${table.name}
                        ${m3uBadge}
                    </div>
                    <small class="text-white-50">
                        ID: ${table.id}
                        ${table.database_id ? ` • DB: ${table.database_id}` : ''}
                    </small>
                </div>
            `;
        }).join('');

        // Destacar tabelas compatíveis com M3U se M3U estiver ativo
        if (this.isM3UActive) {
            this.highlightM3UCompatibleTables();
        }
    }

    // Verificar se tabela é compatível com M3U
    isTableM3UCompatible(table) {
        const tableName = table.name.toLowerCase();
        const compatibleNames = ['conteudo', 'conteúdo', 'filme', 'serie', 'canal', 'episodio', 'episódio'];
        return compatibleNames.some(name => tableName.includes(name));
    }

    // Destacar tabelas compatíveis com M3U
    highlightM3UCompatibleTables() {
        document.querySelectorAll('.table-item[data-m3u-compatible="true"]').forEach(item => {
            item.style.borderLeft = '4px solid #28a745';
        });
    }

    // Obter ícone da tabela
    getTableIcon(tableName) {
        const name = tableName.toLowerCase();
        for (const [key, icon] of Object.entries(TABLE_ICONS)) {
            if (name.includes(key)) {
                return icon;
            }
        }
        return 'fas fa-table';
    }

    // Limpar lista de tabelas
    clearTablesList() {
        const container = document.getElementById('tablesContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-white-50 text-center p-3">
                    Configure a conexão primeiro
                </div>
            `;
        }
    }

    // Selecionar tabela
    async selectTable(tableId, tableName) {
        this.selectedTable = { id: tableId, name: tableName };
        this.editingRowId = null;
        this.currentPage = 1;
        this.searchTerm = '';

        // Atualizar UI
        document.querySelectorAll('.table-item').forEach(item => item.classList.remove('active'));
        event.target.closest('.table-item')?.classList.add('active');

        const selectedTableName = document.getElementById('selectedTableName');
        if (selectedTableName) {
            selectedTableName.innerHTML = `
                <i class="${this.getTableIcon(tableName)} me-2"></i>${tableName}
            `;
        }

        // Se M3U está ativo, mostrar informação especial
        if (this.isM3UActive) {
            this.showM3UTableSelected(tableName);
        } else {
            const tableHeader = document.getElementById('tableHeader');
            if (tableHeader) {
                tableHeader.style.display = 'block';
            }

            const emptyState = document.getElementById('emptyState');
            if (emptyState) {
                emptyState.style.display = 'none';
            }
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        this.hideRecordForm();
        await this.loadTableData();
    }

    // Mostrar informação de tabela selecionada para M3U
    showM3UTableSelected(tableName) {
        const isCompatible = this.isTableM3UCompatible({ name: tableName });
        const alertType = isCompatible ? 'success' : 'warning';
        const message = isCompatible ? 
            `✅ Tabela "${tableName}" selecionada! Agora você pode importar dados M3U.` :
            `⚠️ Tabela "${tableName}" selecionada, mas pode não ser totalmente compatível com M3U.`;
        
        this.showAlert(message, alertType);
        
        // Mostrar helper específico
        this.hideM3UHelper();
        setTimeout(() => this.showM3UImportHelper(tableName, isCompatible), 1000);
    }

    // Mostrar helper para importação M3U
    showM3UImportHelper(tableName, isCompatible) {
        const existingHelper = document.querySelector('.m3u-import-helper');
        if (existingHelper) existingHelper.remove();

        const helper = document.createElement('div');
        helper.className = `alert alert-${isCompatible ? 'success' : 'warning'} m3u-import-helper`;
        helper.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${isCompatible ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                <div class="flex-grow-1">
                    <strong>Tabela "${tableName}" pronta para M3U!</strong><br>
                    <small>Use os botões + ou "Adicionar Selecionados" no M3U Manager para importar</small>
                </div>
                <button type="button" class="btn-close ms-2" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        const m3uContent = document.getElementById('m3uContent');
        if (m3uContent && m3uContent.style.display !== 'none') {
            m3uContent.insertBefore(helper, m3uContent.firstChild);
        }
    }

    // Carregar dados da tabela
    async loadTableData() {
        this.showLoading();
        try {
            // Carregar campos da tabela
            this.tableFields = await this.api.loadTableFields(this.selectedTable.id);

            // Carregar dados apenas se não estiver no modo M3U
            if (!this.isM3UActive) {
                await this.fetchRecords();
            } else {
                this.hideLoading();
            }
        } catch (error) {
            this.hideLoading();
            this.showAlert('Erro ao carregar dados: ' + error.message, 'danger');
        }
    }

    // Buscar registros
    async fetchRecords(page = 1) {
        try {
            const params = {
                page,
                size: this.recordsPerPage
            };

            if (this.searchTerm) {
                params.search = this.searchTerm;
            }

            const data = await this.api.fetchRecords(this.selectedTable.id, params);
            this.currentRecords = data.results || [];
            this.totalRecords = data.count || 0;
            this.currentPage = page;

            this.renderTable();
            this.renderPagination();
            this.updateRecordCount();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showAlert('Erro ao buscar registros: ' + error.message, 'danger');
        }
    }

    // Renderizar tabela
    renderTable() {
        const headersContainer = document.getElementById('tableHeaders');
        const bodyContainer = document.getElementById('tableBody');

        if (!headersContainer || !bodyContainer) return;

        // Renderizar cabeçalhos
        headersContainer.innerHTML = this.tableFields.map(field => 
            `<th class="text-white">${field.name}</th>`
        ).join('') + '<th class="text-white text-end">Ações</th>';

        // Renderizar dados
        if (this.currentRecords.length === 0) {
            bodyContainer.innerHTML = `
                <tr>
                    <td colspan="${this.tableFields.length + 1}" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <p class="text-muted mb-2">Nenhum registro encontrado</p>
                        ${this.searchTerm ? 
                            '<small class="text-muted">Tente ajustar sua pesquisa</small>' : 
                            '<small class="text-muted">Esta tabela não possui registros ainda</small>'
                        }
                    </td>
                </tr>
            `;
        } else {
            bodyContainer.innerHTML = this.currentRecords.map(record => {
                const cells = this.tableFields.map(field => {
                    const value = this.formatFieldValue(field, record[field.name]);
                    return `<td>${value}</td>`;
                }).join('');

                return `
                    <tr class="align-middle">
                        ${cells}
                        <td class="text-end">
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-primary" onclick="app.editRecord(${record.id})" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="app.deleteRecord(${record.id})" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        const dataContainer = document.getElementById('dataContainer');
        if (dataContainer) {
            dataContainer.style.display = 'block';
        }
    }

    // Formatar valor do campo
    formatFieldValue(field, value) {
        if (!value && value !== 0) return '-';

        const fieldName = field.name.toLowerCase();
        
        // Imagens
        if (fieldName.includes('capa') || fieldName.includes('imagem') || fieldName.includes('cover') || fieldName.includes('logo')) {
            if (typeof value === 'string' && value.startsWith('http')) {
                return `<img src="${value}" class="record-image" alt="Imagem" style="max-width: 60px; max-height: 60px; border-radius: 4px;" loading="lazy">`;
            } else {
                return '<i class="fas fa-image text-muted"></i>';
            }
        }

        // Email
        if (fieldName === 'email' && FIELD_VALIDATIONS.email.test(value)) {
            return `<a href="mailto:${value}" class="text-decoration-none">${value}</a>`;
        }

        // Links
        if ((fieldName.includes('link') || fieldName.includes('url')) && FIELD_VALIDATIONS.url.test(value)) {
            return `<a href="${value}" target="_blank" class="text-decoration-none" title="${value}">
                <i class="fas fa-external-link-alt"></i> Link
            </a>`;
        }

        // Datas
        if (fieldName.includes('data') || fieldName.includes('pagamento') || fieldName.includes('vencimento')) {
            if (value) {
                try {
                    const date = new Date(value);
                    return date.toLocaleDateString('pt-BR');
                } catch (e) {
                    return value;
                }
            }
        }

        // Texto longo
        if (typeof value === 'string' && value.length > 50) {
            return `<span title="${value}">${value.substring(0, 50)}...</span>`;
        }

        return value;
    }

    // Outras funções de UI...
    showLoading() {
        const loading = document.getElementById('loading');
        const dataContainer = document.getElementById('dataContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (loading) loading.style.display = 'flex';
        if (dataContainer) dataContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const dataContainer = document.getElementById('dataContainer');
        const tableHeader = document.getElementById('tableHeader');
        
        if (emptyState) emptyState.style.display = 'block';
        if (dataContainer) dataContainer.style.display = 'none';
        if (tableHeader) tableHeader.style.display = 'none';
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-custom alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(alertDiv, mainContent.firstChild);
        }
        
        setTimeout(() => alertDiv.remove(), 5000);
    }

    showProgress(title, message) {
        const modal = document.getElementById('progressModal');
        const titleEl = document.getElementById('progressTitle');
        const messageEl = document.getElementById('progressMessage');
        const barEl = document.getElementById('progressBar');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (barEl) barEl.style.width = '0%';
        
        if (modal) {
            new bootstrap.Modal(modal).show();
        }
    }

    updateProgress(percentage, message) {
        const barEl = document.getElementById('progressBar');
        const messageEl = document.getElementById('progressMessage');
        
        if (barEl) barEl.style.width = percentage + '%';
        if (messageEl) messageEl.textContent = message;
    }

    hideProgress() {
        const modal = document.getElementById('progressModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        }
    }

    // Funções de busca, paginação, CRUD, etc. continuam...
    handleSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchTerm = document.getElementById('searchInput')?.value?.trim() || '';
            this.currentPage = 1;
            this.fetchRecords();
        }, 500);
    }

    searchRecords() {
        this.handleSearch();
    }

    // Salvar configuração
    async saveConfig() {
        if (window.app && typeof window.app.saveUserConfig === 'function') {
            await window.app.saveUserConfig();
        } else {
            console.error("saveUserConfig function not found on global app object.");
        }
    }

    // Carregar configuração salva (agora tratado pelo main.js)
    async loadSavedConfig() {
        // Esta função foi movida para main.js (loadUserConfig)
        // e é chamada na inicialização do app.
    }

    // Implementar funções restantes de CRUD, paginação, etc.
    async editRecord(rowId) {
        console.log('Editar registro:', rowId);
    }

    async deleteRecord(rowId) {
        console.log('Excluir registro:', rowId);
    }

    showAddForm() {
        console.log('Mostrar formulário de adição');
    }

    hideRecordForm() {
        const form = document.getElementById('recordForm');
        if (form) form.style.display = 'none';
    }

    renderPagination() {
        console.log('Renderizar paginação');
    }

    updateRecordCount() {
        const recordCount = document.getElementById('recordCount');
        if (recordCount) {
            recordCount.textContent = `${this.totalRecords} registros encontrados`;
        }
        
        // Atualizar contador na sidebar
        const sidebarRecordCount = document.getElementById('recordCount');
        if (sidebarRecordCount) {
            sidebarRecordCount.textContent = this.totalRecords;
        }
    }

    refreshTable() {
        if (this.selectedTable) {
            this.fetchRecords(this.currentPage);
        }
    }
}

export default UIManager;