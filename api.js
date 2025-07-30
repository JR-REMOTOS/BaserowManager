import { BASEROW_CONFIGS, DEFAULT_CONFIG } from './config.js';

class BaserowAPI {
    constructor() {
        this.currentSite = 'oficial'; // Site padrão
        this.config = null;
        this.token = '';
        this.isConnected = false;
        this.retryCount = 0;
        this.readOnlyFields = new Set(['id', 'created_on', 'updated_on']); // Campos somente leitura
    }

    // Configurar site atual
    setSite(siteName) {
        if (!BASEROW_CONFIGS[siteName]) {
            throw new Error(`Site '${siteName}' não encontrado nas configurações`);
        }
        this.currentSite = siteName;
        this.config = BASEROW_CONFIGS[siteName];
        this.isConnected = false;
        return this;
    }

    // Configurar token
    setToken(token) {
        this.token = token.trim();
        return this;
    }

    // Obter configuração atual
    getCurrentConfig() {
        return {
            site: this.currentSite,
            config: this.config,
            token: this.token ? '***' + this.token.slice(-4) : '',
            isConnected: this.isConnected
        };
    }

    // Filtrar campos somente leitura
    filterReadOnlyFields(data) {
        if (!data || typeof data !== 'object') return data;
        
        const filteredData = {};
        for (const [key, value] of Object.entries(data)) {
            const fieldKey = key.toLowerCase();
            const isReadOnly = this.readOnlyFields.has(fieldKey) || 
                              fieldKey.includes('created') || 
                              fieldKey.includes('updated') ||
                              fieldKey.endsWith('_on') ||
                              fieldKey.endsWith('_at');
            
            if (!isReadOnly) {
                filteredData[key] = value;
            } else {
                console.log(`[API] Campo somente leitura removido: ${key}`);
            }
        }
        return filteredData;
    }

    // Fazer requisição HTTP
    async makeRequest(endpoint, options = {}) {
        if (!this.config) {
            throw new Error('Nenhum site configurado. Use setSite() primeiro.');
        }

        if (!this.token) {
            throw new Error('Token não configurado. Use setToken() primeiro.');
        }

        const url = `${this.config.apiUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
        
        const defaultOptions = {
            headers: {
                'Authorization': `Token ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: DEFAULT_CONFIG.requestTimeout
        };

        const requestOptions = { ...defaultOptions, ...options };

        // Filtrar campos somente leitura do body se for POST/PATCH
        if (requestOptions.body && (requestOptions.method === 'POST' || requestOptions.method === 'PATCH')) {
            try {
                const bodyData = JSON.parse(requestOptions.body);
                const filteredData = this.filterReadOnlyFields(bodyData);
                requestOptions.body = JSON.stringify(filteredData);
                console.log('[API] Dados filtrados enviados:', filteredData);
            } catch (e) {
                console.warn('[API] Não foi possível filtrar body:', e.message);
            }
        }

        try {
            console.log(`[API] ${requestOptions.method || 'GET'} ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);

            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                await this.handleErrorResponse(response);
            }

            const data = await response.json();
            this.retryCount = 0; // Reset retry count on success
            return data;

        } catch (error) {
            return this.handleRequestError(error, endpoint, options);
        }
    }

    // Tratar resposta de erro
    async handleErrorResponse(response) {
        let errorMessage = `HTTP ${response.status}`;
        let errorDetail = '';
        
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorData.error || errorData.description || '';
            
            // Tratar erros específicos de campos
            if (errorData.error && typeof errorData.error === 'object') {
                const fieldErrors = [];
                for (const [field, messages] of Object.entries(errorData.error)) {
                    if (Array.isArray(messages)) {
                        fieldErrors.push(`${field}: ${messages.join(', ')}`);
                    } else {
                        fieldErrors.push(`${field}: ${messages}`);
                    }
                }
                if (fieldErrors.length > 0) {
                    errorDetail = fieldErrors.join('; ');
                }
            }
            
            errorMessage = errorDetail || errorMessage;
        } catch (e) {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
        }

        // Mensagens específicas por código de erro
        const errorMessages = {
            400: `Dados inválidos: ${errorDetail || 'Verifique os campos enviados'}`,
            401: 'Token inválido ou sem permissões. Verifique suas credenciais.',
            403: 'Acesso negado. Verifique as permissões do token.',
            404: 'Recurso não encontrado. Verifique a URL da API e IDs das tabelas.',
            405: 'Método não permitido. Verificando endpoints alternativos...',
            413: 'Arquivo muito grande. Reduza o tamanho do arquivo.',
            422: `Dados não processáveis: ${errorDetail || 'Verifique o formato dos dados'}`,
            429: 'Muitas requisições. Aguarde alguns segundos.',
            500: 'Erro interno do servidor. Tente novamente mais tarde.',
            502: 'Servidor indisponível. O Baserow pode estar reiniciando.',
            503: 'Serviço indisponível. Tente novamente mais tarde.'
        };

        const specificMessage = errorMessages[response.status];
        if (specificMessage) {
            throw new Error(specificMessage);
        }

        throw new Error(errorMessage);
    }

    // Tratar erro de requisição
    async handleRequestError(error, endpoint, options) {
        console.error('[API] Erro na requisição:', error);

        if (error.name === 'AbortError') {
            throw new Error('Tempo limite da requisição excedido. Verifique sua conexão.');
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Erro de conexão. Verifique a URL da API e sua conexão com a internet.');
        }

        // Retry logic
        if (this.retryCount < DEFAULT_CONFIG.maxRetries && this.shouldRetry(error)) {
            this.retryCount++;
            console.log(`[API] Tentativa ${this.retryCount}/${DEFAULT_CONFIG.maxRetries} em 2s...`);
            await this.delay(2000);
            return this.makeRequest(endpoint, options);
        }

        throw error;
    }

    // Verificar se deve tentar novamente
    shouldRetry(error) {
        // Não retry para erros 4xx (client errors) exceto 429 (rate limit)
        if (error.message.includes('400') ||
            error.message.includes('401') || 
            error.message.includes('403') || 
            error.message.includes('404') ||
            error.message.includes('422')) {
            return false;
        }
        
        return error.message.includes('conexão') || 
               error.message.includes('network') ||
               error.message.includes('timeout') ||
               error.message.includes('429'); // Rate limit
    }

    // Delay para retry
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Verificar se a API está acessível (método simples)
    async pingAPI() {
        try {
            // Tenta uma requisição simples para verificar se a API responde
            const response = await fetch(this.config.apiUrl, {
                method: 'HEAD', // Método mais leve
                headers: {
                    'Authorization': `Token ${this.token}`
                }
            });
            return response.status < 500; // Qualquer resposta < 500 indica que a API está funcionando
        } catch (error) {
            console.log('[API] Ping falhou:', error.message);
            return false;
        }
    }

    // Testar conexão
    async testConnection() {
        try {
            // Testa diretamente carregando as tabelas
            console.log('[API] Testando conexão carregando tabelas...');
            await this.loadTables();
            this.isConnected = true;
            return { success: true, message: 'Conexão estabelecida com sucesso!' };
        } catch (error) {
            console.log('[API] Erro no teste de tabelas, tentando endpoint alternativo...');
            
            // Tenta endpoint alternativo baseado no site
            try {
                let testEndpoint;
                if (this.config.apiUrl.includes('api.baserow.io')) {
                    // Para o site oficial, tenta um endpoint que sabemos que funciona
                    testEndpoint = 'api/database/tables/all-tables/';
                } else {
                    // Para o VPS, tenta outro endpoint
                    testEndpoint = `api/database/tables/database/${this.config.databaseId}/`;
                }
                
                await this.makeRequest(testEndpoint);
                this.isConnected = true;
                return { success: true, message: 'Conexão estabelecida! API funcionando.' };
            } catch (altError) {
                this.isConnected = false;
                return { success: false, error: `Falha na conexão: ${error.message}` };
            }
        }
    }

    // Carregar tabelas
    async loadTables() {
        const endpoints = [
            'api/database/tables/all-tables/',
            `api/database/tables/database/${this.config.databaseId}/`
        ];

        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                console.log(`[API] Tentando endpoint: ${endpoint}`);
                const data = await this.makeRequest(endpoint);
                
                let tablesList = Array.isArray(data) ? data : (data.results || []);
                
                console.log(`[API] Resposta do endpoint ${endpoint}:`, data);
                
                // Se não encontrou tabelas na resposta, usar as configuradas
                if (tablesList.length === 0) {
                    console.log('[API] Nenhuma tabela retornada, usando configurações do site');
                    tablesList = Object.entries(this.config.tables).map(([key, table]) => ({
                        id: table.id,
                        name: table.name,
                        database_id: this.config.databaseId,
                        key: key
                    }));
                }

                console.log(`[API] ${tablesList.length} tabelas carregadas com sucesso`);
                return tablesList;
            } catch (error) {
                console.log(`[API] Falhou endpoint ${endpoint}:`, error.message);
                lastError = error;
                continue;
            }
        }

        // Se chegou aqui, todos os endpoints falharam
        console.log('[API] Todos os endpoints falharam, usando configurações como fallback');
        
        // Como último recurso, retorna as tabelas das configurações
        const fallbackTables = Object.entries(this.config.tables).map(([key, table]) => ({
            id: table.id,
            name: table.name,
            database_id: this.config.databaseId,
            key: key
        }));

        if (fallbackTables.length > 0) {
            console.log(`[API] Usando ${fallbackTables.length} tabelas das configurações como fallback`);
            return fallbackTables;
        }

        throw new Error(`Não foi possível carregar tabelas. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
    }

    // Carregar campos de uma tabela
    async loadTableFields(tableId) {
        try {
            const data = await this.makeRequest(`api/database/fields/table/${tableId}/`);
            const fields = data.results || data || [];
            
            // Marcar campos somente leitura
            fields.forEach(field => {
                const fieldName = field.name.toLowerCase();
                if (this.readOnlyFields.has(fieldName) || 
                    fieldName.includes('created') || 
                    fieldName.includes('updated') ||
                    fieldName.endsWith('_on') ||
                    fieldName.endsWith('_at') ||
                    field.read_only) {
                    field.read_only = true;
                }
            });
            
            return fields;
        } catch (error) {
            console.warn(`[API] Erro ao carregar campos da tabela ${tableId}:`, error.message);
            return [];
        }
    }

    // Buscar registros de uma tabela
    async fetchRecords(tableId, params = {}) {
        const defaultParams = {
            user_field_names: 'true',
            page: 1,
            size: DEFAULT_CONFIG.recordsPerPage
        };

        const queryParams = { ...defaultParams, ...params };
        const queryString = new URLSearchParams(queryParams).toString();
        
        return await this.makeRequest(`api/database/rows/table/${tableId}/?${queryString}`);
    }

    // Obter um registro específico
    async getRecord(tableId, rowId) {
        return await this.makeRequest(`api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`);
    }

    // Criar registro
    async createRecord(tableId, data) {
        // Filtrar dados antes de enviar
        const filteredData = this.filterReadOnlyFields(data);
        console.log('[API] Criando registro com dados filtrados:', filteredData);
        
        return await this.makeRequest(`api/database/rows/table/${tableId}/?user_field_names=true`, {
            method: 'POST',
            body: JSON.stringify(filteredData)
        });
    }

    // Atualizar registro
    async updateRecord(tableId, rowId, data) {
        // Filtrar dados antes de enviar
        const filteredData = this.filterReadOnlyFields(data);
        console.log('[API] Atualizando registro com dados filtrados:', filteredData);
        
        return await this.makeRequest(`api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`, {
            method: 'PATCH',
            body: JSON.stringify(filteredData)
        });
    }

    // Excluir registro
    async deleteRecord(tableId, rowId) {
        return await this.makeRequest(`api/database/rows/table/${tableId}/${rowId}/`, {
            method: 'DELETE'
        });
    }

    // Excluir todos os registros
    async deleteAllRecords(tableId, onProgress = null) {
        // Buscar todos os IDs
        let allIds = [];
        let page = 1;
        
        while (true) {
            const data = await this.fetchRecords(tableId, { page, size: 200 });
            if (!data.results || data.results.length === 0) break;
            
            allIds.push(...data.results.map(row => row.id));
            if (data.results.length < 200) break;
            page++;
        }

        if (allIds.length === 0) {
            return { deleted: 0, total: 0 };
        }

        // Excluir em lotes
        const batchSize = 50;
        let deleted = 0;
        
        for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            const percentage = Math.round(((i + batch.length) / allIds.length) * 100);
            
            if (onProgress) {
                onProgress(percentage, deleted + batch.length, allIds.length);
            }
            
            await Promise.all(batch.map(id => 
                this.deleteRecord(tableId, id).catch(err => {
                    console.error(`[API] Erro ao excluir ID ${id}:`, err);
                })
            ));
            
            deleted += batch.length;
        }

        return { deleted, total: allIds.length };
    }

    // Upload de arquivo
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        return await this.makeRequest('api/user-files/upload-file/', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${this.token}`
                // Não incluir Content-Type para FormData
            },
            body: formData
        });
    }

    // Upload de arquivo via URL
    async uploadFileFromUrl(url) {
        return await this.makeRequest('api/user-files/upload-via-url/', {
            method: 'POST',
            body: JSON.stringify({ url })
        });
    }
}

 export default BaserowAPI;