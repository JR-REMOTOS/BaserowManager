// xtream-api.js - VERSÃO CORRIGIDA PARA AUTENTICAÇÃO E PARSING
import { FeedbackUtils } from './utils.js';

class XtreamAPI {
    constructor() {
        this.baseUrl = '';
        this.username = '';
        this.password = '';
        this.connectionName = '';
        this.cacheDir = 'xtream_cache/';
        this.cacheDuration = 24 * 60 * 60 * 1000; // 24 horas
        this.authData = null;
        this.maxRetries = 4;
        this.retryDelay = 2000;
        
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?',
            'https://proxy.cors.sh/',
            'https://cors.eu.org/',
        ];
    }

    setCredentials({ baseUrl, username, password, connectionName }) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.username = username;
        this.password = password;
        this.connectionName = connectionName;
        this.authData = null;
        
        console.log('[XtreamAPI] Credenciais configuradas:', {
            baseUrl: this.baseUrl,
            username: this.username,
            connectionName: this.connectionName
        });
    }

    validateCredentials() {
        if (!this.baseUrl || !this.username || !this.password) {
            console.error('[XtreamAPI] Credenciais inválidas:', {
                baseUrl: !!this.baseUrl,
                username: !!this.username,
                password: !!this.password
            });
            return false;
        }
        return this.baseUrl.match(/^https?:\/\/.+/);
    }

    async fetchWithRetry(url, options = {}, retryCount = 0) {
        console.log(`[XtreamAPI] Tentativa ${retryCount + 1} para URL:`, url.replace(/password=[^&]*/, 'password=***'));
        
        if (retryCount === 0) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                        'Origin': window.location.origin,
                        'Referrer': window.location.href
                    },
                    mode: 'cors',
                    credentials: 'omit',
                    timeout: 15000,
                    ...options
                });
                
                if (response.ok) {
                    console.log('[XtreamAPI] Requisição direta bem-sucedida');
                    return response;
                }
                
                console.log('[XtreamAPI] Requisição direta falhou com status:', response.status);
            } catch (error) {
                console.log('[XtreamAPI] Requisição direta falhou:', error.message);
            }
        }

        for (let i = 0; i < this.corsProxies.length; i++) {
            const proxy = this.corsProxies[i];
            try {
                console.log(`[XtreamAPI] Tentando proxy ${i + 1}:`, proxy);
                
                let proxyUrl;
                let fetchOptions = {
                    method: 'GET',
                    headers: {
                        'Accept': '*/*',
                    },
                    timeout: 20000
                };

                if (proxy.includes('allorigins.win')) {
                    proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                    fetchOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
                } else {
                    proxyUrl = proxy + url;
                }

                const response = await fetch(proxyUrl, fetchOptions);
                
                if (response.ok) {
                    console.log(`[XtreamAPI] Proxy ${i + 1} bem-sucedido`);
                    
                    if (proxy.includes('allorigins.win')) {
                        const data = await response.json();
                        return {
                            ok: true,
                            status: 200,
                            text: () => Promise.resolve(data.contents),
                            json: () => Promise.resolve(JSON.parse(data.contents))
                        };
                    }
                    
                    return response;
                }
                
                console.log(`[XtreamAPI] Proxy ${i + 1} falhou com status:`, response.status);
            } catch (error) {
                console.log(`[XtreamAPI] Tentando proxy ${i + 1}:`, error.message);
                continue;
            }
        }

        if (retryCount < this.maxRetries && url.startsWith('https://')) {
            const httpUrl = url.replace(/^https:/, 'http:');
            console.log(`[XtreamAPI] Tentando com HTTP:`, httpUrl.replace(/password=[^&]*/, 'password=***'));
            try {
                const response = await fetch(httpUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                    },
                    mode: 'cors',
                    credentials: 'omit',
                    timeout: 15000,
                    ...options
                });
                
                if (response.ok) {
                    console.log('[XtreamAPI] Requisição HTTP bem-sucedida');
                    return response;
                }
                
                console.log('[XtreamAPI] Requisição HTTP falhou com status:', response.status);
            } catch (error) {
                console.log('[XtreamAPI] Requisição HTTP falhou:', error.message);
            }
        }

        if (retryCount < this.maxRetries) {
            console.log(`[XtreamAPI] Aguardando ${this.retryDelay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            return this.fetchWithRetry(url, options, retryCount + 1);
        }
        
        throw new Error(`Falha após ${this.maxRetries + 1} tentativas e ${this.corsProxies.length} proxies. Verifique a URL e conexão.`);
    }

    async authenticate() {
        if (!this.validateCredentials()) {
            throw new Error('Credenciais inválidas. Verifique URL, usuário e senha.');
        }

        const urlVariations = [
            `${this.baseUrl}/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`,
            `${this.baseUrl}/api/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`,
            `${this.baseUrl}/xtream/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`
        ];

        let lastError = null;

        for (const url of urlVariations) {
            console.log('[XtreamAPI] Tentando autenticar:', url.replace(/password=[^&]*/, 'password=***'));
            try {
                const response = await this.fetchWithRetry(url);
                const data = await response.json();
                
                console.log('[XtreamAPI] Resposta da autenticação:', data);
                
                if (this.isValidAuthResponse(data)) {
                    this.authData = data;
                    console.log('[XtreamAPI] Autenticação bem-sucedida');
                    return data;
                }
                
                throw new Error('Resposta de autenticação inválida. Verifique suas credenciais.');
                
            } catch (error) {
                console.error('[XtreamAPI] Erro na autenticação com URL:', url.replace(/password=[^&]*/, 'password=***'), error);
                lastError = error;
                continue;
            }
        }

        throw new Error(`Erro de autenticação: ${lastError?.message || 'Não foi possível autenticar com nenhuma URL.'}`);
    }

    isValidAuthResponse(data) {
        if (!data || typeof data !== 'object') return false;
        
        return (
            (data.user_info && (
                data.user_info.auth === 1 || 
                data.user_info.auth === "1" || 
                data.user_info.status === "Active" ||
                data.user_info.status === "active"
            )) ||
            data.server_info ||
            data.available_channels ||
            data.categories ||
            Array.isArray(data) ||
            (Object.keys(data).length > 0 && !data.error)
        );
    }

    async downloadM3U(forceDownload = false) {
        const cacheKey = `${this.connectionName}_m3u`;
        
        if (!forceDownload) {
            try {
                const cachedData = await this.checkCache(cacheKey);
                if (cachedData && cachedData.length > 100) {
                    console.log('[XtreamAPI] Usando M3U em cache, tamanho:', cachedData.length);
                    return cachedData;
                }
            } catch (error) {
                console.log('[XtreamAPI] Erro ao verificar cache:', error.message);
            }
        }

        const m3uUrls = [
            `${this.baseUrl}/get.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}&type=m3u_plus&output=ts`,
            `${this.baseUrl}/get.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}&type=m3u_plus`,
            `${this.baseUrl}/get.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}&type=m3u`,
            `${this.baseUrl}/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}&action=get_live_streams`,
        ];

        let lastError = null;
        
        for (const url of m3uUrls) {
            try {
                console.log('[XtreamAPI] Tentando baixar M3U:', url.replace(/password=[^&]*/, 'password=***'));
                const response = await this.fetchWithRetry(url);
                const content = await response.text();
                
                console.log('[XtreamAPI] Conteúdo baixado, tamanho:', content.length);
                
                if (this.isValidM3UContent(content)) {
                    const cleanContent = this.cleanM3UContent(content);
                    
                    try {
                        await this.saveToCache(cacheKey, cleanContent);
                        console.log('[XtreamAPI] M3U salvo em cache');
                    } catch (cacheError) {
                        console.warn('[XtreamAPI] Erro ao salvar cache:', cacheError.message);
                    }
                    
                    return cleanContent;
                }
                
                console.log('[XtreamAPI] Conteúdo não é M3U válido');
                
            } catch (error) {
                console.error('[XtreamAPI] Erro ao baixar M3U:', error.message);
                lastError = error;
                continue;
            }
        }

        try {
            console.log('[XtreamAPI] Tentando fallback com API JSON...');
            const jsonContent = await this.downloadJSONContent();
            if (jsonContent && jsonContent.length > 0) {
                const m3uContent = this.convertJSONToM3U(jsonContent);
                
                try {
                    await this.saveToCache(cacheKey, m3uContent);
                } catch (cacheError) {
                    console.warn('[XtreamAPI] Erro ao salvar cache do fallback:', cacheError.message);
                }
                
                return m3uContent;
            }
        } catch (error) {
            console.error('[XtreamAPI] Fallback JSON também falhou:', error.message);
        }

        throw new Error(`Não foi possível baixar a lista M3U. Verifique suas credenciais e conexão. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
    }

    isValidM3UContent(content) {
        if (!content || typeof content !== 'string' || content.length < 10) {
            console.log('[XtreamAPI] Conteúdo muito pequeno ou inválido');
            return false;
        }
        
        const hasM3UHeader = content.includes('#EXTM3U') || content.includes('#EXTINF');
        const hasUrls = /https?:\/\/[^\s]+/.test(content);
        const hasValidStructure = content.split('\n').length > 5;
        
        const isValid = (hasM3UHeader || hasUrls) && hasValidStructure;
        console.log('[XtreamAPI] Validação M3U:', { 
            hasM3UHeader, 
            hasUrls, 
            hasValidStructure, 
            isValid,
            contentLength: content.length 
        });
        
        return isValid;
    }

    async downloadJSONContent() {
        const endpoints = [
            { url: 'player_api.php?action=get_live_streams', type: 'live' },
            { url: 'player_api.php?action=get_vod_streams', type: 'movies' }, 
            { url: 'player_api.php?action=get_series', type: 'series' }
        ];

        const allContent = [];
        
        for (const endpoint of endpoints) {
            try {
                const url = `${this.baseUrl}/${endpoint.url}&username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`;
                console.log(`[XtreamAPI] Baixando ${endpoint.type}...`);
                
                const response = await this.fetchWithRetry(url);
                const data = await response.json();
                
                if (Array.isArray(data) && data.length > 0) {
                    console.log(`[XtreamAPI] ${data.length} itens de ${endpoint.type} encontrados`);
                    allContent.push(...data.map(item => ({ 
                        ...item, 
                        content_type: endpoint.type,
                        originalType: endpoint.type
                    })));
                }
            } catch (error) {
                console.log(`[XtreamAPI] Endpoint ${endpoint.url} falhou:`, error.message);
                continue;
            }
        }
        
        console.log(`[XtreamAPI] Total de itens JSON coletados: ${allContent.length}`);
        return allContent.length > 0 ? allContent : null;
    }

    convertJSONToM3U(jsonData) {
        console.log('[XtreamAPI] Convertendo JSON para M3U, itens:', jsonData.length);
        
        let m3uContent = '#EXTM3U\n\n';
        let itemCount = 0;
        
        jsonData.forEach(item => {
            const name = item.name || item.title || 'Sem Nome';
            const logo = item.stream_icon || item.cover || '';
            const group = item.category_name || item.genre || item.content_type || 'Geral';
            const url = this.buildStreamUrl(item);
            
            if (url && name !== 'Sem Nome') {
                m3uContent += `#EXTINF:-1 tvg-logo="${logo}" group-title="${group}",${name}\n`;
                m3uContent += `${url}\n\n`;
                itemCount++;
            }
        });
        
        console.log(`[XtreamAPI] ${itemCount} itens convertidos para M3U`);
        return m3uContent;
    }

    buildStreamUrl(item) {
        try {
            const streamId = item.stream_id || item.id;
            if (!streamId) return null;

            if (item.content_type === 'live') {
                return `${this.baseUrl}/live/${this.username}/${this.password}/${streamId}.m3u8`;
            } else if (item.content_type === 'movies') {
                const extension = item.container_extension || 'mp4';
                return `${this.baseUrl}/movie/${this.username}/${this.password}/${streamId}.${extension}`;
            } else if (item.content_type === 'series') {
                return `${this.baseUrl}/series/${this.username}/${this.password}/${streamId}.m3u8`;
            }
            
            return null;
        } catch (error) {
            console.error('[XtreamAPI] Erro ao construir URL do stream:', error);
            return null;
        }
    }

    cleanM3UContent(content) {
        if (!content || typeof content !== 'string') return '';
        
        try {
            let cleaned = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            if (!cleaned.startsWith('#EXTM3U')) {
                cleaned = '#EXTM3U\n' + cleaned;
            }
            cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
            cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
            
            cleaned = cleaned.split('\n')
                .map(line => line.trim())
                .filter((line, index, array) => {
                    return line === '#EXTM3U' || 
                           line.startsWith('#EXTINF') || 
                           /^https?:\/\//.test(line) ||
                           (line === '' && array[index + 1] && array[index + 1].startsWith('#EXTINF'));
                })
                .join('\n');
            
            return cleaned;
        } catch (error) {
            console.error('[XtreamAPI] Erro ao limpar conteúdo M3U:', error);
            return content;
        }
    }

    async splitM3U(m3uContent) {
        console.log('[XtreamAPI] Iniciando divisão M3U, tamanho:', m3uContent.length);
        
        const lines = m3uContent.split(/[\r\n]+/).map(line => line.trim()).filter(line => line);
        
        const categories = {
            live: ['#EXTM3U'],
            series: ['#EXTM3U'],
            movies: ['#EXTM3U']
        };
        
        let currentExtinf = null;
        let currentType = null;
        let processedItems = 0;
        let skippedItems = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('#EXTINF:')) {
                currentExtinf = line;
                currentType = this.categorizeExtinf(line);
                
            } else if (this.isStreamUrl(line)) {
                if (currentExtinf) {
                    if (categories[currentType]) {
                        categories[currentType].push(currentExtinf, line);
                        processedItems++;
                    } else {
                        categories.movies.push(currentExtinf, line);
                        processedItems++;
                    }
                } else {
                    const urlType = this.categorizeUrl(line);
                    const basicExtinf = this.createBasicExtinf(line);
                    
                    if (categories[urlType]) {
                        categories[urlType].push(basicExtinf, line);
                        processedItems++;
                    } else {
                        categories.movies.push(basicExtinf, line);
                        processedItems++;
                    }
                }
                
                currentExtinf = null;
                currentType = null;
            } else if (line.startsWith('#EXTINF:')) {
                skippedItems++;
                console.log('[XtreamAPI] Linha EXTINF sem URL associada, ignorada:', line);
            } else {
                console.log('[XtreamAPI] Linha ignorada:', line);
            }
        }

        const result = {
            live: categories.live.join('\n'),
            series: categories.series.join('\n'),
            movies: categories.movies.join('\n')
        };

        const stats = {
            processedItems,
            skippedItems,
            live: Math.floor((categories.live.length - 1) / 2),
            series: Math.floor((categories.series.length - 1) / 2),
            movies: Math.floor((categories.movies.length - 1) / 2)
        };

        console.log('[XtreamAPI] M3U dividido com sucesso:', stats);

        this.saveCategoriesAsync(result);

        return result;
    }

    async saveCategoriesAsync(result) {
        try {
            const cacheKey = this.connectionName;
            await Promise.all([
                this.saveToCache(`${this.cacheDir}${cacheKey}_live`, result.live),
                this.saveToCache(`${this.cacheDir}${cacheKey}_series`, result.series),
                this.saveToCache(`${this.cacheDir}${cacheKey}_movies`, result.movies)
            ]);
            console.log('[XtreamAPI] Categorias salvas em cache');
        } catch (error) {
            console.warn('[XtreamAPI] Erro ao salvar cache das categorias:', error.message);
        }
    }

    categorizeExtinf(extinfLine) {
        const line = extinfLine.toLowerCase();
        
        const liveKeywords = [
            'live', 'tv ', 'canal', 'channel', 'ao vivo', 'iptv',
            'radio', 'rádio', 'news', 'notícias', 'sport', 'esporte',
            'entertainment', 'music', 'kids', 'documentary', 'religioso',
            'brasil', 'globo', 'sbt', 'record', 'band', 'fox ', 'cnn',
            'discovery', 'cartoon', 'disney', 'hbo ', 'premium'
        ];
        
        const seriesKeywords = [
            'series', 'série', 'temporada', 'season', 'episodio', 'episode',
            's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09',
            'e01', 'e02', 'e03', 'e04', 'e05', 'e06', 'e07', 'e08', 'e09',
            'x01', 'x02', 'x03', 'x04', 'x05', 'cap ', 'capitulo'
        ];
        
        const groupMatch = line.match(/group-title=["']?([^"']*)["']?/i);
        if (groupMatch) {
            const group = groupMatch[1].toLowerCase();
            
            if (liveKeywords.some(keyword => group.includes(keyword))) {
                return 'live';
            }
            
            if (seriesKeywords.some(keyword => group.includes(keyword))) {
                return 'series';
            }
            
            // Aceitar qualquer group-title que contenha "filmes" ou "movies"
            if (group.includes('filmes') || group.includes('movies') || group.includes('vod') || group.includes('crime') || group.includes('lancamentos')) {
                return 'movies';
            }
        }
        
        const nameMatch = line.match(/,\s*(.+)$/);
        if (nameMatch) {
            const name = nameMatch[1].toLowerCase();
            
            if (name.match(/\bs\d{1,2}e\d{1,2}\b|\bseason\s+\d+.*episode\s+\d+|\b\d{1,2}x\d{1,2}\b|\btemporada\s+\d+.*episodio\s+\d+/)) {
                return 'series';
            }
            
            if (seriesKeywords.some(keyword => name.includes(keyword))) {
                return 'series';
            }
            
            if (liveKeywords.some(keyword => name.includes(keyword))) {
                return 'live';
            }
        }
        
        return 'movies';
    }

    isStreamUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        return (
            /^https?:\/\/.+/.test(url) ||
            /\.(m3u8?|ts|mp4|mkv|avi|mov|flv)(\?.*)?$/i.test(url) ||
            url.includes('/live/') ||
            url.includes('/movie/') ||
            url.includes('/series/') ||
            url.includes('stream') ||
            url.includes('play')
        );
    }

    categorizeUrl(url) {
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('/live/') || urlLower.includes('live.') || 
            urlLower.includes('tv.') || urlLower.includes('channel')) {
            return 'live';
        }
        if (urlLower.includes('/series/') || urlLower.includes('series.') || 
            urlLower.includes('episode')) {
            return 'series';
        }
        return 'movies';
    }

    createBasicExtinf(url) {
        const name = this.extractNameFromUrl(url);
        return `#EXTINF:-1,${name}`;
    }

    extractNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            
            if (pathParts.length > 0) {
                const lastPart = pathParts[pathParts.length - 1];
                return lastPart.replace(/\.(m3u8?|ts|mp4|mkv|avi|mov|flv)$/i, '') || 'Stream';
            }
            
            return urlObj.hostname || 'Stream';
        } catch (e) {
            const parts = url.split('/');
            return parts[parts.length - 1] || 'Stream';
        }
    }

    async checkCache(cacheKey) {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.get(cacheKey);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const cached = request.result;
                    if (cached && cached.data && (Date.now() - cached.timestamp < this.cacheDuration)) {
                        console.log(`[XtreamAPI] Cache hit para: ${cacheKey}`);
                        resolve(cached.data);
                    } else {
                        console.log(`[XtreamAPI] Cache miss ou expirado para: ${cacheKey}`);
                        resolve(null);
                    }
                };
                request.onerror = () => {
                    console.warn('[XtreamAPI] Erro ao ler cache:', request.error);
                    resolve(null);
                };
            });
        } catch (error) {
            console.log('[XtreamAPI] Erro ao verificar cache IndexedDB:', error);
            return null;
        }
    }

    async saveToCache(cacheKey, data) {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            
            store.put({
                id: cacheKey,
                data: data,
                timestamp: Date.now()
            });
            
            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log(`[XtreamAPI] Cache salvo: ${cacheKey}`);
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });
            
        } catch (error) {
            console.error('[XtreamAPI] Erro ao salvar no IndexedDB:', error);
        }
    }

    async clearCache() {
        try {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            store.clear();
            
            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
            
            console.log('[XtreamAPI] Cache limpo com sucesso');
        } catch (error) {
            console.error('[XtreamAPI] Erro ao limpar cache:', error);
            throw error;
        }
    }

    openIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('XtreamCacheDB', 2);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (db.objectStoreNames.contains('cache')) {
                    db.deleteObjectStore('cache');
                }
                
                const store = db.createObjectStore('cache', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            };
            
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    showAlert(message, type = 'info') {
        if (typeof FeedbackUtils !== 'undefined' && FeedbackUtils.createToast) {
            FeedbackUtils.createToast(message, type, 5000);
        } else {
            console.log(`[XtreamAPI] ${type.toUpperCase()}: ${message}`);
        }
    }
}

export default XtreamAPI;