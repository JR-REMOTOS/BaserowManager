import UIManager from './ui.js';
import BaserowAPI from './api.js';
import M3UManager from './m3u-manager.js';
import { BASEROW_CONFIGS, TABLE_ICONS } from './config.js';
import Utils, { ValidationUtils, FormatUtils, DOMUtils, DataUtils } from './utils.js';

/**
 * Classe principal da aplicação
 */
class BaserowManager {
    constructor() {
        this.ui = new UIManager();
        this.api = this.ui.api; // Usar a mesma instância da API
        this.currentTable = null;
        this.editingRowId = null;
        this.isInitialized = false;
        this.m3uManager = null; // Será inicializado após o DOM estar pronto
        this.currentView = 'baserow'; // 'baserow' ou 'm3u'
    }

    /**
     * Inicializar aplicação
     */
    async init() {
        if (this.isInitialized) return;

        try {
            console.log('[App] Inicializando aplicação...');
            this.updateLoaderMessage('Preparando a interface...');
            
            // Aguardar DOM estar pronto
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }

            // Inicializar interface
            this.ui.init();
            
            // Inicializar M3U Manager
            this.m3uManager = new M3UManager(this);
            
            // Configurar handlers globais
            this.setupGlobalHandlers();
            
            // Disponibilizar globalmente para uso nos event handlers inline
            window.app = this;
            
            // Configurar navegação entre views
            this.setupViewNavigation();
            
            // Carregar configurações do usuário
            this.updateLoaderMessage('Carregando configurações...');
            await this.loadUserConfig();

            // Carregar conteúdo M3U do banco de dados, se existir
            this.updateLoaderMessage('Carregando lista M3U salva...');
            await this.m3uManager.loadM3UContentFromDB();

            this.isInitialized = true;
            console.log('[App] Aplicação inicializada com sucesso');
            this.updateLoaderMessage('Pronto!');
            this.hideInitialLoader();
            
        } catch (error) {
            console.error('[App] Erro na inicialização:', error);
            this.ui.showAlert('Erro ao inicializar aplicação: ' + error.message, 'danger');
            this.hideInitialLoader(); // Ocultar o loader mesmo se houver erro
        }
    }

    /**
     * Atualiza a mensagem no loader inicial.
     * @param {string} message - A mensagem a ser exibida.
     */
    updateLoaderMessage(message) {
        const loaderMessage = document.getElementById('loaderMessage');
        if (loaderMessage) {
            loaderMessage.textContent = message;
        }
    }

    /**
     * Oculta e remove o loader inicial.
     */
    hideInitialLoader() {
        const loader = document.getElementById('initialLoader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => loader.remove(), 500);
        }
    }

    /**
     * Configurar navegação entre views
     */
    setupViewNavigation() {
        // Detectar quando M3U é carregado para mostrar conteúdo
        const originalRenderContent = this.m3uManager.renderContent.bind(this.m3uManager);
        this.m3uManager.renderContent = () => {
            originalRenderContent();
            this.switchToM3UView();
        };

        // Quando uma tabela é selecionada, voltar para view do Baserow
        const originalSelectTable = this.ui.selectTable.bind(this.ui);
        this.ui.selectTable = async (tableId, tableName) => {
            await originalSelectTable(tableId, tableName);
            this.switchToBaserowView();
        };
    }

    /**
     * Alternar para view do M3U
     */
    switchToM3UView() {
        this.currentView = 'm3u';
        
        // Ocultar elementos do Baserow
        const elementsToHide = [
            'tableHeader',
            'recordForm', 
            'dataContainer',
            'emptyState',
            'loading'
        ];
        
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
        
        // Mostrar conteúdo M3U
        const m3uContent = document.getElementById('m3uContent');
        if (m3uContent) {
            m3uContent.style.display = 'block';
        }
        
        // Destacar seção M3U na sidebar
        const m3uSection = document.getElementById('m3uSection');
        if (m3uSection) {
            m3uSection.classList.add('active');
        }
        
        // Remover destaque das tabelas
        document.querySelectorAll('.table-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    /**
     * Alternar para view do Baserow
     */
    switchToBaserowView() {
        this.currentView = 'baserow';
        
        // Ocultar conteúdo M3U
        const m3uContent = document.getElementById('m3uContent');
        if (m3uContent) {
            m3uContent.style.display = 'none';
        }
        
        // Remover destaque da seção M3U
        const m3uSection = document.getElementById('m3uSection');
        if (m3uSection) {
            m3uSection.classList.remove('active');
        }
    }

    /**
     * Configurar handlers globais
     */
    setupGlobalHandlers() {
        // Handler para erros não capturados
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[App] Promise rejeitada:', event.reason);
            this.ui.showAlert('Erro inesperado: ' + event.reason?.message || 'Erro desconhecido', 'warning');
            event.preventDefault();
        });

        // Handler para erros JavaScript
        window.addEventListener('error', (event) => {
            console.error('[App] Erro JavaScript:', event.error);
        });

        // Configurar tooltips do Bootstrap
        this.initBootstrapComponents();

        // Handler para clique na seção M3U
        document.addEventListener('click', (e) => {
            if (e.target.closest('#m3uSection') && !e.target.closest('input, button')) {
                this.focusOnM3U();
            }
        });

        // Handler para o botão de sair
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
            });
        }
    }

    /**
     * Focar na seção M3U
     */
    focusOnM3U() {
        const m3uUrl = document.getElementById('m3uUrl');
        if (m3uUrl) {
            m3uUrl.focus();
        }
        
        // Se já tem conteúdo M3U carregado, mostrar
        if (this.m3uManager && this.m3uManager.currentPlaylist) {
            this.switchToM3UView();
        }
    }

    /**
     * Inicializar componentes do Bootstrap
     */
    initBootstrapComponents() {
        // Tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Popovers
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });
    }

    /**
     * Selecionar tabela (exposta globalmente)
     */
    async selectTable(tableId, tableName) {
        try {
            await this.ui.selectTable(tableId, tableName);
            this.currentTable = { id: tableId, name: tableName };
        } catch (error) {
            console.error('[App] Erro ao selecionar tabela:', error);
            this.ui.showAlert('Erro ao selecionar tabela: ' + error.message, 'danger');
        }
    }

    /**
     * Mostrar formulário de adição
     */
    showAddForm() {
        if (!this.currentTable) {
            this.ui.showAlert('Selecione uma tabela primeiro', 'warning');
            return;
        }

        this.editingRowId = null;
        this.renderRecordForm('Adicionar Novo Registro', 'fas fa-plus-circle');
        this.switchToBaserowView(); // Garantir que estamos na view do Baserow
    }

    /**
     * Editar registro
     */
    async editRecord(rowId) {
        if (!this.currentTable) {
            this.ui.showAlert('Nenhuma tabela selecionada', 'warning');
            return;
        }

        try {
            this.ui.showLoading();
            const record = await this.api.getRecord(this.currentTable.id, rowId);
            this.editingRowId = rowId;
            this.renderRecordForm('Editar Registro', 'fas fa-edit', record);
            this.switchToBaserowView(); // Garantir que estamos na view do Baserow
            this.ui.hideLoading();
        } catch (error) {
            this.ui.hideLoading();
            console.error('[App] Erro ao carregar registro:', error);
            this.ui.showAlert('Erro ao carregar registro: ' + error.message, 'danger');
        }
    }

    /**
     * Renderizar formulário de registro
     */
    renderRecordForm(title, icon, data = {}) {
        const formTitle = document.getElementById('formTitle');
        const formFields = document.getElementById('formFields');
        const recordForm = document.getElementById('recordForm');

        if (!formTitle || !formFields || !recordForm) {
            console.error('[App] Elementos do formulário não encontrados');
            return;
        }

        // Atualizar título
        formTitle.innerHTML = `<i class="${icon} me-2"></i>${title}`;

        // Renderizar campos
        formFields.innerHTML = this.ui.tableFields
            .filter(field => field.name !== 'id' && !field.read_only)
            .map(field => this.renderFormField(field, data[field.name]))
            .join('');

        // Mostrar formulário
        recordForm.style.display = 'block';
        recordForm.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Renderizar campo do formulário
     */
    renderFormField(field, value = '') {
        const fieldName = field.name;
        const fieldId = `field_${fieldName.replace(/\s+/g, '_')}`;
        let input;

        // Determinar tipo de input baseado no nome e tipo do campo
        if (field.type === 'number') {
            input = `<input type="number" class="form-control" id="${fieldId}" value="${value || 0}" min="0">`;
        } else if (field.type === 'boolean') {
            input = `
                <select class="form-control" id="${fieldId}">
                    <option value="false" ${value === false ? 'selected' : ''}>Não</option>
                    <option value="true" ${value === true ? 'selected' : ''}>Sim</option>
                </select>
            `;
        } else if (field.type === 'date') {
            const dateValue = value ? new Date(value).toISOString().split('T')[0] : '';
            input = `<input type="date" class="form-control" id="${fieldId}" value="${dateValue}">`;
        } else if (field.type === 'long_text' || fieldName.toLowerCase().includes('sinopse')) {
            input = `<textarea class="form-control" id="${fieldId}" rows="3" placeholder="Digite ${fieldName.toLowerCase()}...">${value || ''}</textarea>`;
        } else if (fieldName.toLowerCase().includes('email')) {
            input = `<input type="email" class="form-control" id="${fieldId}" value="${value || ''}" placeholder="exemplo@email.com">`;
        } else if (fieldName.toLowerCase().includes('link') || fieldName.toLowerCase().includes('url')) {
            input = `<input type="url" class="form-control" id="${fieldId}" value="${value || ''}" placeholder="https://exemplo.com">`;
        } else if (fieldName.toLowerCase().includes('senha') || fieldName.toLowerCase().includes('password')) {
            input = `<input type="password" class="form-control" id="${fieldId}" value="${value || ''}" placeholder="Digite a senha">`;
        } else {
            input = `<input type="text" class="form-control" id="${fieldId}" value="${value || ''}" placeholder="Digite ${fieldName.toLowerCase()}...">`;
        }

        // Adicionar validação visual
        const isRequired = field.primary || fieldName.toLowerCase().includes('nome') || fieldName.toLowerCase().includes('email');
        const requiredMark = isRequired ? '<span class="text-danger">*</span>' : '';

        return `
            <div class="col-md-6 mb-3">
                <label class="form-label fw-bold" for="${fieldId}">
                    ${fieldName} ${requiredMark}
                </label>
                ${input}
                <div class="invalid-feedback" id="${fieldId}_error"></div>
            </div>
        `;
    }

    /**
     * Salvar registro
     */
    async saveRecord() {
        if (!this.currentTable) {
            this.ui.showAlert('Nenhuma tabela selecionada', 'warning');
            return;
        }

        try {
            // Coletar dados do formulário
            const formData = this.collectFormData();
            
            // Validar dados
            const validation = this.validateFormData(formData);
            if (!validation.valid) {
                this.showValidationErrors(validation.errors);
                return;
            }

            // Mostrar loading
            this.ui.showLoading();

            let result;
            if (this.editingRowId) {
                // Atualizar registro existente
                result = await this.api.updateRecord(this.currentTable.id, this.editingRowId, formData);
                this.ui.showAlert('Registro atualizado com sucesso!', 'success');
            } else {
                // Criar novo registro
                result = await this.api.createRecord(this.currentTable.id, formData);
                this.ui.showAlert('Registro criado com sucesso!', 'success');
            }

            // Ocultar formulário e recarregar dados
            this.hideRecordForm();
            await this.ui.fetchRecords(this.ui.currentPage);
            this.ui.hideLoading();

        } catch (error) {
            this.ui.hideLoading();
            console.error('[App] Erro ao salvar registro:', error);
            this.ui.showAlert('Erro ao salvar registro: ' + error.message, 'danger');
        }
    }

    /**
     * Coletar dados do formulário
     */
    collectFormData() {
        const formData = {};
        
        this.ui.tableFields
            .filter(field => field.name !== 'id' && !field.read_only)
            .forEach(field => {
                const fieldId = `field_${field.name.replace(/\s+/g, '_')}`;
                const element = document.getElementById(fieldId);
                
                if (element) {
                    let value = element.value;

                    // Converter tipos conforme necessário
                    if (field.type === 'boolean') {
                        value = value === 'true';
                    } else if (field.type === 'number' && value) {
                        value = parseFloat(value);
                    } else if (field.type === 'date' && value) {
                        value = new Date(value).toISOString();
                    }

                    formData[field.name] = value || null;
                }
            });

        return formData;
    }

    /**
     * Validar dados do formulário
     */
    validateFormData(formData) {
        const errors = {};
        let valid = true;

        Object.keys(formData).forEach(fieldName => {
            const value = formData[fieldName];
            const field = this.ui.tableFields.find(f => f.name === fieldName);
            
            if (!field) return;

            // Validações específicas por tipo de campo
            if (fieldName.toLowerCase().includes('email') && value) {
                const emailValidation = ValidationUtils.validateField(fieldName, value, 'email');
                if (!emailValidation.valid) {
                    errors[fieldName] = emailValidation.message;
                    valid = false;
                }
            }

            if ((fieldName.toLowerCase().includes('link') || fieldName.toLowerCase().includes('url')) && value) {
                const urlValidation = ValidationUtils.validateField(fieldName, value, 'url');
                if (!urlValidation.valid) {
                    errors[fieldName] = urlValidation.message;
                    valid = false;
                }
            }

            // Validação de campos obrigatórios
            const isRequired = field.primary || fieldName.toLowerCase().includes('nome');
            if (isRequired && (!value || value.toString().trim() === '')) {
                errors[fieldName] = 'Este campo é obrigatório';
                valid = false;
            }
        });

        return { valid, errors };
    }

    /**
     * Mostrar erros de validação
     */
    showValidationErrors(errors) {
        // Limpar erros anteriores
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');

        // Mostrar novos erros
        Object.keys(errors).forEach(fieldName => {
            const fieldId = `field_${fieldName.replace(/\s+/g, '_')}`;
            const element = document.getElementById(fieldId);
            const errorElement = document.getElementById(`${fieldId}_error`);

            if (element) {
                element.classList.add('is-invalid');
            }
            if (errorElement) {
                errorElement.textContent = errors[fieldName];
            }
        });

        this.ui.showAlert('Corrija os erros no formulário antes de continuar', 'warning');
    }

    /**
     * Excluir registro
     */
    async deleteRecord(rowId) {
        if (!this.currentTable) {
            this.ui.showAlert('Nenhuma tabela selecionada', 'warning');
            return;
        }

        if (!confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            this.ui.showLoading();
            await this.api.deleteRecord(this.currentTable.id, rowId);
            this.ui.showAlert('Registro excluído com sucesso!', 'success');
            await this.ui.fetchRecords(this.ui.currentPage);
            this.ui.hideLoading();
        } catch (error) {
            this.ui.hideLoading();
            console.error('[App] Erro ao excluir registro:', error);
            this.ui.showAlert('Erro ao excluir registro: ' + error.message, 'danger');
        }
    }

    /**
     * Confirmar exclusão de todos os registros
     */
    async confirmDeleteAll() {
        if (!this.currentTable) {
            this.ui.showAlert('Nenhuma tabela selecionada', 'warning');
            return;
        }

        const confirmation = prompt(
            `⚠️ ATENÇÃO: Esta ação irá excluir TODOS os ${this.ui.totalRecords} registros da tabela "${this.currentTable.name}".\n\n` +
            `Esta ação NÃO PODE ser desfeita!\n\n` +
            `Para confirmar, digite exatamente: EXCLUIR TUDO`
        );

        if (confirmation !== 'EXCLUIR TUDO') {
            this.ui.showAlert('Operação cancelada', 'info');
            return;
        }

        await this.deleteAllRecords();
    }

    /**
     * Excluir todos os registros
     */
    async deleteAllRecords() {
        try {
            this.ui.showProgress('Excluindo Registros', 'Preparando exclusão...');

            const result = await this.api.deleteAllRecords(
                this.currentTable.id,
                (percentage, deleted, total) => {
                    this.ui.updateProgress(percentage, `Excluído ${deleted} de ${total} registros...`);
                }
            );

            this.ui.hideProgress();

            if (result.deleted > 0) {
                this.ui.showAlert(`✅ ${result.deleted} registros excluídos com sucesso!`, 'success');
                await this.ui.fetchRecords(1);
            } else {
                this.ui.showAlert('Nenhum registro encontrado para exclusão', 'info');
            }

        } catch (error) {
            this.ui.hideProgress();
            console.error('[App] Erro na exclusão em massa:', error);
            this.ui.showAlert('Erro na exclusão: ' + error.message, 'danger');
        }
    }

    /**
     * Ocultar formulário de registro
     */
    hideRecordForm() {
        const recordForm = document.getElementById('recordForm');
        if (recordForm) {
            recordForm.style.display = 'none';
        }
        this.editingRowId = null;

        // Limpar erros de validação
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
    }

    /**
     * Limpar formulário
     */
    clearForm() {
        // Limpar todos os campos do formulário
        this.ui.tableFields
            .filter(field => field.name !== 'id' && !field.read_only)
            .forEach(field => {
                const fieldId = `field_${field.name.replace(/\s+/g, '_')}`;
                const element = document.getElementById(fieldId);
                
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = false;
                    } else if (element.type === 'number') {
                        element.value = 0;
                    } else {
                        element.value = '';
                    }
                }
            });

        // Limpar erros de validação
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        
        this.ui.showAlert('Formulário limpo', 'info');
    }

    /**
     * Exportar dados
     */
    exportData() {
        if (!this.currentTable || !this.ui.currentRecords.length) {
            this.ui.showAlert('Nenhum dado para exportar', 'warning');
            return;
        }

        try {
            // Preparar dados para export
            const headers = this.ui.tableFields.map(field => field.name);
            const csvContent = [
                headers.join(','),
                ...this.ui.currentRecords.map(record => 
                    headers.map(header => {
                        const value = record[header];
                        // Escapar vírgulas e aspas
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value || '';
                    }).join(',')
                )
            ].join('\n');

            // Criar e fazer download do arquivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${this.currentTable.name}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.ui.showAlert('Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('[App] Erro ao exportar dados:', error);
            this.ui.showAlert('Erro ao exportar dados: ' + error.message, 'danger');
        }
    }

    /**
     * Atualizar seletor de URL da API
     */
    updateApiUrl() {
        const select = document.getElementById('apiUrlSelect');
        const input = document.getElementById('apiUrl');
        
        if (select && input && select.value !== 'custom') {
            input.value = select.value;
        }
    }

    /**
     * Alternar visibilidade do token
     */
    toggleTokenVisibility() {
        const tokenInput = document.getElementById('apiToken');
        const eyeIcon = document.getElementById('tokenEye');
        
        if (tokenInput && eyeIcon) {
            if (tokenInput.type === 'password') {
                tokenInput.type = 'text';
                eyeIcon.className = 'fas fa-eye-slash';
            } else {
                tokenInput.type = 'password';
                eyeIcon.className = 'fas fa-eye';
            }
        }
    }

    /**
     * Abrir documentação do Baserow
     */
    openBaserowDocs() {
        const currentSite = this.api.currentSite;
        const urls = {
            oficial: 'https://baserow.io/docs/apis%2Frest-api',
            vps: '#' // URL da documentação do VPS se disponível
        };
        
        window.open(urls[currentSite] || urls.oficial, '_blank');
    }

    /**
     * Ir para página específica
     */
    goToPage(page) {
        if (page === this.ui.currentPage || !this.currentTable) return;
        this.ui.fetchRecords(page);
    }

    /**
     * Atualizar tabela atual
     */
    refreshTable() {
        if (this.currentTable) {
            this.ui.refreshTable();
        }
    }

    /**
     * Buscar registros
     */
    searchRecords() {
        this.ui.searchRecords();
    }

    /**
     * Aplica uma configuração à interface e à API.
     * @param {object} config - O objeto de configuração.
     */
    async applyConfig(config) {
        // Preencher campos do Baserow
        if (config.baserow_api_url) document.getElementById('apiUrl').value = config.baserow_api_url;
        if (config.baserow_api_token) document.getElementById('apiToken').value = config.baserow_api_token;
        if (config.conteudos_table_id) document.getElementById('conteudosTableId').value = config.conteudos_table_id;
        if (config.categorias_table_id) document.getElementById('categoriasTableId').value = config.categorias_table_id;
        if (config.episodios_table_id) document.getElementById('episodiosTableId').value = config.episodios_table_id;
        if (config.banners_table_id) document.getElementById('bannersTableId').value = config.banners_table_id;
        if (config.usuarios_table_id) document.getElementById('usuariosTableId').value = config.usuarios_table_id;
        if (config.canais_table_id) document.getElementById('canaisTableId').value = config.canais_table_id;
        if (config.pagamentos_table_id) document.getElementById('pagamentosTableId').value = config.pagamentos_table_id;
        if (config.planos_table_id) document.getElementById('planosTableId').value = config.planos_table_id;
        if (config.tv_categoria_table_id) document.getElementById('tvCategoriaTableId').value = config.tv_categoria_table_id;

        // Preencher campos do M3U
        if (config.m3u_url) document.getElementById('xtreamBaseUrl').value = config.m3u_url;
        if (config.m3u_username) document.getElementById('xtreamUsername').value = config.m3u_username;
        if (config.m3u_password) document.getElementById('xtreamPassword').value = config.m3u_password;
        
        this.ui.showAlert('Configurações carregadas.', 'info');
        
        const mappingConteudos = (typeof config.mapping_conteudos === 'string') ? JSON.parse(config.mapping_conteudos || '{}') : config.mapping_conteudos;
        const mappingEpisodios = (typeof config.mapping_episodios === 'string') ? JSON.parse(config.mapping_episodios || '{}') : config.mapping_episodios;

        const apiConfig = {
            apiUrl: config.baserow_api_url,
            token: config.baserow_api_token,
            conteudosTableId: config.conteudos_table_id,
            categoriasTableId: config.categorias_table_id,
            episodiosTableId: config.episodios_table_id,
            usuariosTableId: config.usuarios_table_id,
            bannersTableId: config.banners_table_id,
            canaisTableId: config.canais_table_id,
            pagamentosTableId: config.pagamentos_table_id,
            planosTableId: config.planos_table_id,
            tvCategoriaTableId: config.tv_categoria_table_id,
            mapping_conteudos: mappingConteudos || {},
            mapping_episodios: mappingEpisodios || {}
        };
        this.api.setConfig(apiConfig);

        // Preencher os dropdowns de mapeamento com os campos corretos
        if (apiConfig.conteudosTableId) {
            const fields = await this.api.loadTableFields(apiConfig.conteudosTableId);
            this.ui.populateMappingDropdowns(fields, 'conteudos', apiConfig.mapping_conteudos);
        }
        if (apiConfig.episodiosTableId) {
            const fields = await this.api.loadTableFields(apiConfig.episodiosTableId);
            this.ui.populateMappingDropdowns(fields, 'episodios', apiConfig.mapping_episodios);
        }
        
        // Habilitar botões de envio no M3U Manager agora que a configuração está pronta
        if(this.m3uManager) {
            this.m3uManager.updateSendButtonsState(true);
        }

        // Se tiver token, tenta fazer um teste de conexão silencioso para carregar as tabelas
        if (apiConfig.token) {
            const result = await this.api.testConnection();
            if (result.success) {
                this.ui.showAlert('Conexão automática estabelecida com sucesso!', 'success');
                const tables = this.api.loadTables();
                this.ui.renderTables(tables);
            } else {
                this.ui.showAlert('Falha na conexão automática. Verifique suas configurações.', 'warning');
            }
        }
    }

    /**
     * Carregar configurações do usuário, priorizando localStorage.
     */
    async loadUserConfig() {
        // 1. Tentar carregar do localStorage
        console.log('[App] Tentando carregar config. Conteúdo do localStorage:', localStorage.getItem('baserowConfig'));
        const localConfigStr = localStorage.getItem('baserowConfig');
        if (localConfigStr) {
            console.log('[App] Carregando configuração do localStorage.');
            try {
                const localConfig = JSON.parse(localConfigStr);
                await this.applyConfig(localConfig);
                return;
            } catch (error) {
                console.error('[App] Erro ao analisar configuração do localStorage:', error);
                localStorage.removeItem('baserowConfig');
            }
        }

        // 2. Fallback para carregar do servidor (load_config.php)
        console.log('[App] Nenhuma configuração local encontrada. Tentando carregar do servidor.');
        try {
            const response = await fetch('load_config.php');
            const result = await response.json();

            if (result.success && result.data && Object.keys(result.data).length > 1) {
                console.log('[App] Carregando configuração do servidor.');
                await this.applyConfig(result.data);
            } else {
                this.ui.showAlert('Bem-vindo! Por favor, configure sua conexão Baserow.', 'info');
                this.ui.toggleConfig();
            }
        } catch (error) {
            console.error('[App] Erro ao carregar configurações do servidor:', error);
            this.ui.showAlert('Não foi possível carregar as configurações do servidor.', 'warning');
            this.ui.toggleConfig();
        }
    }

    /**
     * Salva a configuração atual no localStorage do navegador.
     */
    saveConfigToLocalStorage() {
        console.log('[App] Salvando configuração no localStorage.');
        try {
            const mappingConteudos = {};
            document.querySelectorAll('#conteudosMappingContainer select').forEach(select => {
                if (select.value) {
                    mappingConteudos[select.name] = select.value;
                }
            });

            const mappingEpisodios = {};
            document.querySelectorAll('#episodiosMappingContainer select').forEach(select => {
                if (select.value) {
                    mappingEpisodios[select.name] = select.value;
                }
            });

            const config = {
                baserow_api_url: document.getElementById('apiUrl').value,
                baserow_api_token: document.getElementById('apiToken').value,
                conteudos_table_id: document.getElementById('conteudosTableId').value,
                categorias_table_id: document.getElementById('categoriasTableId').value,
                episodios_table_id: document.getElementById('episodiosTableId').value,
                banners_table_id: document.getElementById('bannersTableId').value,
                usuarios_table_id: document.getElementById('usuariosTableId').value,
                canais_table_id: document.getElementById('canaisTableId').value,
                pagamentos_table_id: document.getElementById('pagamentosTableId').value,
                planos_table_id: document.getElementById('planosTableId').value,
                tv_categoria_table_id: document.getElementById('tvCategoriaTableId').value,
                mapping_conteudos: mappingConteudos,
                mapping_episodios: mappingEpisodios,
                m3u_url: document.getElementById('xtreamBaseUrl').value,
                m3u_username: document.getElementById('xtreamUsername').value,
                m3u_password: document.getElementById('xtreamPassword').value
            };

            const configStr = JSON.stringify(config);
            localStorage.setItem('baserowConfig', configStr);
            console.log('[App] Configuração salva:', configStr);
            // Usar um alerta mais discreto para salvamentos automáticos
            this.ui.showAlert('Configuração salva localmente!', 'success', 2500); 
        } catch (error) {
            console.error('[App] Erro ao salvar configuração no localStorage:', error);
            this.ui.showAlert('Erro ao salvar configuração localmente.', 'danger');
        }
    }

    /**
     * Salvar configurações do usuário no servidor (opcional).
     */
    async saveUserConfig() {
        try {
            const mappingConteudos = {};
            document.querySelectorAll('[data-mapping="conteudos"] select').forEach(select => {
                if (select.value) {
                    mappingConteudos[select.name] = select.value;
                }
            });

            const mappingEpisodios = {};
            document.querySelectorAll('[data-mapping="episodios"] select').forEach(select => {
                if (select.value) {
                    mappingEpisodios[select.name] = select.value;
                }
            });

            const data = {
                baserow_api_url: document.getElementById('apiUrl').value,
                baserow_api_token: document.getElementById('apiToken').value,
                conteudos_table_id: document.getElementById('conteudosTableId').value,
                categorias_table_id: document.getElementById('categoriasTableId').value,
                episodios_table_id: document.getElementById('episodiosTableId').value,
                banners_table_id: document.getElementById('bannersTableId').value,
                usuarios_table_id: document.getElementById('usuariosTableId').value,
                canais_table_id: document.getElementById('canaisTableId').value,
                pagamentos_table_id: document.getElementById('pagamentosTableId').value,
                planos_table_id: document.getElementById('planosTableId').value,
                tv_categoria_table_id: document.getElementById('tvCategoriaTableId').value,
                mapping_conteudos: mappingConteudos,
                mapping_episodios: mappingEpisodios,
                m3u_url: document.getElementById('xtreamBaseUrl').value,
                m3u_username: document.getElementById('xtreamUsername').value,
                m3u_password: document.getElementById('xtreamPassword').value
            };

            const response = await fetch('save_config.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.ui.showAlert('Configurações salvas no servidor.', 'success');
            } else {
                this.ui.showAlert('Erro ao salvar configurações no servidor.', 'danger');
            }
        } catch (error) {
            console.error('[App] Erro ao salvar configurações do usuário:', error);
            this.ui.showAlert('Erro ao salvar configurações do usuário.', 'danger');
        }
    }

    // Aliases para métodos da UI (para compatibilidade)
    toggleConfig() { return this.ui.toggleConfig(); }
    testConnection() { return this.ui.testConnection(); }
    quickTest() { return this.ui.quickTest(); }
}

// Instância global da aplicação
const baserowManager = new BaserowManager();

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => baserowManager.init());
} else {
    baserowManager.init();
}

// Exportar para uso em módulos
export default baserowManager;

// Disponibilizar globalmente para compatibilidade com HTML inline
window.baserowManager = baserowManager;
