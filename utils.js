// Funções utilitárias para o projeto Baserow

/**
 * Validações de campo
 */
export const ValidationUtils = {
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    isValidUrl: (url) => {
        const urlRegex = /^https?:\/\/.+/;
        return urlRegex.test(url);
    },

    isValidNumber: (value) => {
        return !isNaN(value) && isFinite(value);
    },

    isValidDate: (dateString) => {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },

    validateField: (fieldName, value, fieldType = 'text') => {
        if (!value && value !== 0) return { valid: true, message: '' };

        switch (fieldType) {
            case 'email':
                return {
                    valid: ValidationUtils.isValidEmail(value),
                    message: 'Email inválido'
                };
            case 'url':
                return {
                    valid: ValidationUtils.isValidUrl(value),
                    message: 'URL deve começar com http:// ou https://'
                };
            case 'number':
                return {
                    valid: ValidationUtils.isValidNumber(value),
                    message: 'Deve ser um número válido'
                };
            case 'date':
                return {
                    valid: ValidationUtils.isValidDate(value),
                    message: 'Data inválida'
                };
            default:
                return { valid: true, message: '' };
        }
    }
};

/**
 * Utilitários de formatação
 */
export const FormatUtils = {
    formatDate: (dateString, locale = 'pt-BR') => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(locale);
        } catch (error) {
            return dateString;
        }
    },

    formatDateTime: (dateString, locale = 'pt-BR') => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleString(locale);
        } catch (error) {
            return dateString;
        }
    },

    formatNumber: (number, decimals = 0) => {
        if (number === null || number === undefined) return '-';
        return Number(number).toFixed(decimals);
    },

    formatCurrency: (value, currency = 'BRL', locale = 'pt-BR') => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(value);
    },

    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    truncateText: (text, maxLength = 50) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    capitalizeFirst: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    slugify: (text) => {
        return text
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }
};

/**
 * Utilitários de DOM
 */
export const DOMUtils = {
    createElement: (tag, className = '', innerHTML = '') => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    },

    removeElement: (selector) => {
        const element = document.querySelector(selector);
        if (element) element.remove();
    },

    toggleClass: (selector, className) => {
        const element = document.querySelector(selector);
        if (element) element.classList.toggle(className);
    },

    setElementText: (selector, text) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = text;
    },

    setElementHTML: (selector, html) => {
        const element = document.querySelector(selector);
        if (element) element.innerHTML = html;
    },

    getFormData: (formSelector) => {
        const form = document.querySelector(formSelector);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    },

    setFormData: (formSelector, data) => {
        const form = document.querySelector(formSelector);
        if (!form) return;

        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"], #${key}`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = Boolean(data[key]);
                } else if (input.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    input.value = data[key] || '';
                }
            }
        });
    },

    clearForm: (formSelector) => {
        const form = document.querySelector(formSelector);
        if (form) form.reset();
    }
};

/**
 * Utilitários de Local Storage
 */
export const StorageUtils = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
            return false;
        }
    },

    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Erro ao ler do localStorage:', error);
            return defaultValue;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Erro ao remover do localStorage:', error);
            return false;
        }
    },

    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Erro ao limpar localStorage:', error);
            return false;
        }
    },

    exists: (key) => {
        return localStorage.getItem(key) !== null;
    }
};

/**
 * Utilitários de Array e Object
 */
export const DataUtils = {
    groupBy: (array, key) => {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    sortBy: (array, key, direction = 'asc') => {
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });
    },

    filterBy: (array, filters) => {
        return array.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                const itemValue = item[key];
                
                if (typeof filterValue === 'string') {
                    return itemValue?.toString().toLowerCase().includes(filterValue.toLowerCase());
                }
                
                return itemValue === filterValue;
            });
        });
    },

    uniqueBy: (array, key) => {
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    },

    isEmpty: (value) => {
        return value === null || 
               value === undefined || 
               value === '' || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && Object.keys(value).length === 0);
    },

    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },

    mergeObjects: (...objects) => {
        return Object.assign({}, ...objects);
    }
};

/**
 * Utilitários de arquivo
 */
export const FileUtils = {
    readFileAsText: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    },

    readFileAsDataURL: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    },

    downloadFile: (data, filename, type = 'text/plain') => {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    isValidImageFile: (file) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
    },

    isValidDocumentFile: (file) => {
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        return validTypes.includes(file.type);
    },

    getFileExtension: (filename) => {
        return filename.split('.').pop().toLowerCase();
    }
};

/**
 * Utilitários de URL e Query String
 */
export const URLUtils = {
    parseQueryString: (queryString = window.location.search) => {
        const params = new URLSearchParams(queryString);
        const result = {};
        for (let [key, value] of params.entries()) {
            result[key] = value;
        }
        return result;
    },

    buildQueryString: (params) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                searchParams.append(key, params[key]);
            }
        });
        return searchParams.toString();
    },

    updateURL: (params, replaceState = false) => {
        const queryString = URLUtils.buildQueryString(params);
        const newURL = `${window.location.pathname}${queryString ? '?' + queryString : ''}`;
        
        if (replaceState) {
            window.history.replaceState(null, '', newURL);
        } else {
            window.history.pushState(null, '', newURL);
        }
    },

    isValidURL: (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
};

/**
 * Utilitários de performance
 */
export const PerformanceUtils = {
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    measureTime: (func, label = 'Execution time') => {
        return async (...args) => {
            const start = performance.now();
            const result = await func(...args);
            const end = performance.now();
            console.log(`${label}: ${(end - start).toFixed(2)}ms`);
            return result;
        };
    }
};

/**
 * Utilitários de erro
 */
export const ErrorUtils = {
    createError: (message, code = 'UNKNOWN_ERROR', details = {}) => {
        const error = new Error(message);
        error.code = code;
        error.details = details;
        return error;
    },

    handleError: (error, context = 'Unknown') => {
        console.error(`[${context}] Error:`, error);
        
        // Log para analytics ou sistema de monitoramento
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: error.message,
                fatal: false
            });
        }
        
        return {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            context,
            timestamp: new Date().toISOString()
        };
    },

    isNetworkError: (error) => {
        return error.name === 'TypeError' && error.message.includes('fetch');
    },

    isTimeoutError: (error) => {
        return error.name === 'AbortError' || error.message.includes('timeout');
    }
};

/**
 * Utilitários de loading e feedback
 */
export const FeedbackUtils = {
    showSpinner: (selector) => {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
    },

    hideSpinner: (selector, originalContent = '') => {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = originalContent;
        }
    },

    createToast: (message, type = 'info', duration = 3000) => {
        const toast = DOMUtils.createElement('div', `alert alert-${type} toast-notification`, message);
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// Exportar todas as utilidades como um objeto padrão também
/**
 * Utilitários de API
 */
export const APIUtils = {
    fetchWithAuth: async (url, options = {}) => {
        const token = localStorage.getItem('authToken');

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });

            if (response.status === 401 || response.status === 403) {
                console.warn('Token inválido ou expirado. Redirecionando para o login.');
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                throw new Error('Authentication failed');
            }

            return response;
        } catch (error) {
            // Se for um erro de rede, apenas relance para ser tratado pelo chamador
            if (ErrorUtils.isNetworkError(error) || ErrorUtils.isTimeoutError(error)) {
                throw error;
            }
            // Outros erros podem ser tratados aqui se necessário
            throw error;
        }
    }
};

export default {
    APIUtils,
    ValidationUtils,
    FormatUtils,
    DOMUtils,
    StorageUtils,
    DataUtils,
    FileUtils,
    URLUtils,
    PerformanceUtils,
    ErrorUtils,
    FeedbackUtils
};