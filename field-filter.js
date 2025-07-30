/**
 * FIELD FILTER UTILITY - Utilitário para Filtrar Campos Somente Leitura
 * 
 * Este arquivo pode ser usado independentemente em qualquer projeto que
 * precise filtrar campos proibidos antes de enviar para APIs como Baserow
 * 
 * Uso:
 * import { filterForbiddenFields, isFieldForbidden } from './field-filter.js';
 * 
 * const cleanData = filterForbiddenFields(originalData);
 */

/**
 * 🛡️ LISTA ABRANGENTE DE CAMPOS PROIBIDOS
 * Campos que nunca devem ser enviados para APIs de banco de dados
 */
export const FORBIDDEN_FIELDS = new Set([
    // IDs e chaves primárias
    'id', 'ID', 'Id', '_id',
    
    // Campos de data automáticos (PRINCIPAIS CULPADOS)
    'data', 'Data', 'DATA',
    'date', 'Date', 'DATE',
    'created_on', 'Created_on', 'CREATED_ON',
    'updated_on', 'Updated_on', 'UPDATED_ON', 
    'created_at', 'Created_at', 'CREATED_AT',
    'updated_at', 'Updated_at', 'UPDATED_AT',
    'date_created', 'Date_created', 'DATE_CREATED',
    'date_updated', 'Date_updated', 'DATE_UPDATED',
    'timestamp', 'Timestamp', 'TIMESTAMP',
    'last_modified', 'Last_modified', 'LAST_MODIFIED',
    
    // Outros campos automáticos
    'created', 'Created', 'CREATED',
    'updated', 'Updated', 'UPDATED', 
    'modified', 'Modified', 'MODIFIED',
    'createdAt', 'updatedAt', 'modifiedAt',
    
    // Campos de sistema
    '__v', '_rev', 'etag', 'version'
]);

/**
 * 🔍 Verificar se um campo é proibido
 * @param {string} fieldName - Nome do campo
 * @returns {boolean} - True se o campo for proibido
 */
export function isFieldForbidden(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') {
        return false;
    }
    
    // Verificação direta na lista
    if (FORBIDDEN_FIELDS.has(fieldName)) {
        return true;
    }
    
    // Verificação por padrões
    const name = fieldName.toLowerCase();
    const forbiddenPatterns = [
        /^id$/i,           // Campo 'id' exato
        /^_id$/i,          // Campo '_id' (MongoDB)
        /created/i,        // Qualquer coisa com 'created'
        /updated/i,        // Qualquer coisa com 'updated'
        /_on$/i,           // Campos terminados em '_on'
        /_at$/i,           // Campos terminados em '_at' 
        /^data$/i,         // Campo 'data' exato
        /^date$/i,         // Campo 'date' exato
        /timestamp/i,      // Qualquer coisa com 'timestamp'
        /modified/i,       // Qualquer coisa com 'modified'
        /^__/i,            // Campos começados com '__'
        /version/i         // Campos de versão
    ];
    
    return forbiddenPatterns.some(pattern => pattern.test(name));
}

/**
 * 🛡️ Filtrar campos proibidos de um objeto
 * @param {object} data - Dados originais
 * @param {object} options - Opções de configuração
 * @returns {object} - Dados filtrados
 */
export function filterForbiddenFields(data, options = {}) {
    // Configurações padrão
    const config = {
        logRemoved: true,           // Logar campos removidos
        throwOnEmpty: false,        // Lançar erro se resultado vazio
        preserveArrays: true,       // Preservar arrays
        customForbidden: [],        // Campos proibidos adicionais
        ...options
    };
    
    // Validação de entrada
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        if (config.preserveArrays && Array.isArray(data)) {
            return data.map(item => filterForbiddenFields(item, config));
        }
        return data;
    }
    
    const cleanData = {};
    const removedFields = [];
    
    // Criar conjunto de campos proibidos (incluindo customizados)
    const allForbiddenFields = new Set([
        ...FORBIDDEN_FIELDS,
        ...config.customForbidden
    ]);
    
    // Processar cada campo
    for (const [key, value] of Object.entries(data)) {
        const isForbidden = allForbiddenFields.has(key) || isFieldForbidden(key);
        
        if (isForbidden) {
            removedFields.push({ field: key, value, reason: 'forbidden' });
            
            if (config.logRemoved) {
                console.log(`🚫 [FieldFilter] Campo proibido removido: ${key} = ${value}`);
            }
        } else {
            // Aplicar filtro recursivamente em objetos aninhados
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                cleanData[key] = filterForbiddenFields(value, config);
            } else if (config.preserveArrays && Array.isArray(value)) {
                cleanData[key] = value.map(item => 
                    typeof item === 'object' ? filterForbiddenFields(item, config) : item
                );
            } else {
                cleanData[key] = value;
            }
        }
    }
    
    // Log de resumo
    if (config.logRemoved && removedFields.length > 0) {
        console.log(`✅ [FieldFilter] ${removedFields.length} campos proibidos removidos:`, 
                   removedFields.map(r => r.field));
    }
    
    // Verificar se resultado está vazio
    if (config.throwOnEmpty && Object.keys(cleanData).length === 0) {
        throw new Error('Todos os campos foram removidos - nenhum campo válido encontrado');
    }
    
    return cleanData;
}

/**
 * 🔧 Preparar dados para API do Baserow especificamente
 * @param {object} data - Dados originais
 * @param {array} tableFields - Campos da tabela (opcional)
 * @returns {object} - Dados preparados
 */
export function prepareForBaserow(data, tableFields = []) {
    console.log('📝 [FieldFilter] Preparando dados para Baserow...');
    
    // Campos específicos do Baserow que são sempre proibidos
    const baserowForbidden = [
        'id', 'created_on', 'updated_on', 'order'
    ];
    
    // Filtrar campos proibidos
    const filteredData = filterForbiddenFields(data, {
        customForbidden: baserowForbidden,
        logRemoved: true,
        throwOnEmpty: false
    });
    
    // Se temos informações dos campos da tabela, validar compatibilidade
    if (tableFields && tableFields.length > 0) {
        const validFields = new Set(tableFields.map(f => f.name));
        const finalData = {};
        
        for (const [key, value] of Object.entries(filteredData)) {
            if (validFields.has(key)) {
                finalData[key] = value;
            } else {
                console.log(`⚠️ [FieldFilter] Campo não existe na tabela: ${key}`);
            }
        }
        
        console.log(`✅ [FieldFilter] Dados preparados para Baserow:`, finalData);
        return finalData;
    }
    
    console.log(`✅ [FieldFilter] Dados filtrados:`, filteredData);
    return filteredData;
}

/**
 * 🎯 Validar dados antes de enviar para API
 * @param {object} data - Dados para validar
 * @param {object} schema - Schema de validação (opcional)
 * @returns {object} - Resultado da validação
 */
export function validateApiData(data, schema = {}) {
    const errors = [];
    const warnings = [];
    
    // Verificar se há campos obrigatórios
    const requiredFields = schema.required || ['nome', 'name', 'title'];
    const dataKeys = Object.keys(data);
    
    for (const field of requiredFields) {
        if (!dataKeys.includes(field)) {
            errors.push(`Campo obrigatório ausente: ${field}`);
        }
    }
    
    // Verificar se há pelo menos alguns dados
    if (dataKeys.length === 0) {
        errors.push('Nenhum campo válido encontrado');
    }
    
    // Verificar campos suspeitos que podem ter escapado
    for (const key of dataKeys) {
        if (isFieldForbidden(key)) {
            warnings.push(`Campo suspeito detectado: ${key}`);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        fieldCount: dataKeys.length
    };
}

/**
 * 🔄 Interceptar requisições fetch automaticamente
 * @param {array} apiUrls - URLs da API para interceptar
 */
export function interceptFetchRequests(apiUrls = ['baserow.io', 'database/rows']) {
    console.log('🛡️ [FieldFilter] Ativando interceptação automática de requisições...');
    
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options = {}) {
        // Verificar se é uma requisição para APIs monitoradas
        const shouldIntercept = apiUrls.some(apiUrl => 
            typeof url === 'string' && url.includes(apiUrl)
        );
        
        if (shouldIntercept && (options.method === 'POST' || options.method === 'PATCH')) {
            try {
                if (options.body && typeof options.body === 'string') {
                    const originalData = JSON.parse(options.body);
                    console.log('🔍 [FieldFilter] Interceptando requisição:', options.method, url);
                    console.log('📥 [FieldFilter] Dados originais:', originalData);
                    
                    const filteredData = filterForbiddenFields(originalData);
                    options.body = JSON.stringify(filteredData);
                    
                    console.log('📤 [FieldFilter] Dados filtrados enviados:', filteredData);
                }
            } catch (error) {
                console.warn('⚠️ [FieldFilter] Erro ao filtrar dados da requisição:', error);
            }
        }
        
        return originalFetch.call(this, url, options);
    };
    
    console.log('✅ [FieldFilter] Interceptação ativada para:', apiUrls);
}

/**
 * 📊 Estatísticas do filtro
 */
export function getFilterStats() {
    return {
        totalForbiddenFields: FORBIDDEN_FIELDS.size,
        forbiddenFieldsList: Array.from(FORBIDDEN_FIELDS),
        version: '1.0.0',
        lastUpdate: '2025-07-29'
    };
}

/**
 * 🧪 Teste do sistema de filtros
 */
export function testFilter() {
    console.log('🧪 [FieldFilter] Executando teste do sistema...');
    
    const testData = {
        // Campos válidos
        nome: 'Teste',
        link: 'http://test.com',
        categoria: 'Teste',
        
        // Campos que devem ser removidos
        id: 123,
        data: '2025-07-29',
        created_on: '2025-07-29T10:00:00Z',
        updated_at: '2025-07-29T10:00:00Z'
    };
    
    console.log('📥 [FieldFilter] Dados de teste:', testData);
    
    const filtered = filterForbiddenFields(testData);
    
    console.log('📤 [FieldFilter] Dados filtrados:', filtered);
    
    const expectedValid = ['nome', 'link', 'categoria'];
    const expectedRemoved = ['id', 'data', 'created_on', 'updated_at'];
    
    const actualValid = Object.keys(filtered);
    const actualRemoved = Object.keys(testData).filter(k => !actualValid.includes(k));
    
    const testPassed = 
        expectedValid.every(field => actualValid.includes(field)) &&
        expectedRemoved.every(field => actualRemoved.includes(field));
    
    if (testPassed) {
        console.log('✅ [FieldFilter] Teste passou! Sistema funcionando corretamente.');
    } else {
        console.error('❌ [FieldFilter] Teste falhou!');
        console.log('🔍 Esperados válidos:', expectedValid);
        console.log('🔍 Atuais válidos:', actualValid);
        console.log('🔍 Esperados removidos:', expectedRemoved);
        console.log('🔍 Atuais removidos:', actualRemoved);
    }
    
    return testPassed;
}

// 🎯 EXPORTAÇÃO PADRÃO
export default {
    filterForbiddenFields,
    isFieldForbidden,
    prepareForBaserow,
    validateApiData,
    interceptFetchRequests,
    getFilterStats,
    testFilter,
    FORBIDDEN_FIELDS
};

// 🌐 DISPONIBILIZAR GLOBALMENTE PARA USO NO CONSOLE
if (typeof window !== 'undefined') {
    window.FieldFilter = {
        filter: filterForbiddenFields,
        isForbidden: isFieldForbidden,
        prepareForBaserow,
        validate: validateApiData,
        intercept: interceptFetchRequests,
        stats: getFilterStats,
        test: testFilter
    };
    
    console.log('🛡️ [FieldFilter] Utilitário disponível globalmente em window.FieldFilter');
}

// 📝 EXEMPLOS DE USO NO CONSOLE:
/*
// Filtrar dados simples
const data = { nome: 'Teste', id: 123, created_on: 'today' };
const clean = window.FieldFilter.filter(data);

// Testar o sistema
window.FieldFilter.test();

// Ver estatísticas
window.FieldFilter.stats();

// Interceptar requisições automaticamente
window.FieldFilter.intercept(['baserow.io']);

// Preparar especificamente para Baserow
const baserowData = window.FieldFilter.prepareForBaserow(data);
*/