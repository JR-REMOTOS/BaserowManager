/**
 * Gerenciador de Listas M3U - VERSÃO MELHORADA COM TRATAMENTO DE ERROS E RENDERIZAÇÃO PROGRESSIVA
 * Funcionalidades para ler, processar e importar conteúdo M3U para o Baserow
 */

import XtreamAPI from './xtream-api.js';
import M3UFieldMapper from './m3u-field-mapper.js';
import { FileUtils, DOMUtils, FeedbackUtils } from './utils.js';

class M3UManager {
    constructor(baserowManager) {
        this.baserowManager = baserowManager;
        this.currentPlaylist = null;
        this.processedContent = {
            movies: [],
            series: {},
            channels: []
        };
        this.selectedItems = new Set();
        this.isLoading = false;
        this.xtreamAPI = new XtreamAPI();
        this.fieldMapper = new M3UFieldMapper();
        this.worker = new Worker('m3u-worker.js');
        this.connectionStatus = 'disconnected';
        this.lastError = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.batchSize = 100; // Tamanho do lote para processamento e renderização
        this.renderedCounts = { movies: 0, series: 0, channels: 0 }; // Contador de itens renderizados por categoria
        
        this.worker.onmessage = (event) => {
            console.log('[M3U] Dados processados recebidos do worker.');
            this.processedContent = event.data;
            this.renderContent(true); // Re-renderizar com dados completos
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initializeStatusIndicator();
        console.log('[M3U] M3U Manager inicializado');
    }

    initializeStatusIndicator() {
        const statusIndicator = document.getElementById('xtreamStatus') || this.createStatusIndicator();
        this.updateConnectionStatus('disconnected');
    }

    createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'xtreamStatus';
        indicator.className = 'xtream-status mb-3';
        indicator.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="status-dot me-2" style="width: 12px; height: 12px; border-radius: 50%;"></div>
                <span class="status-text">Desconectado</span>
                <small class="status-details ms-2 text-muted"></small>
            </div>
        `;
        
        const xtreamForm = document.getElementById('xtreamForm');
        if (xtreamForm) {
            xtreamForm.insertBefore(indicator, xtreamForm.firstChild);
        }
        
        return indicator;
    }

    updateConnectionStatus(status, details = '') {
        this.connectionStatus = status;
        const statusIndicator = document.getElementById('xtreamStatus');
        if (!statusIndicator) return;

        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        const statusDetails = statusIndicator.querySelector('.status-details');

        const statusConfig = {
            disconnected: { color: '#6c757d', text: 'Desconectado', icon: '⚫' },
            connecting: { color: '#ffc107', text: 'Conectando...', icon: '🔄' },
            connected: { color: '#198754', text: 'Conectado', icon: '🟢' },
            error: { color: '#dc3545', text: 'Erro de Conexão', icon: '🔴' }
        };

        const config = statusConfig[status] || statusConfig.disconnected;
        
        if (statusDot) statusDot.style.backgroundColor = config.color;
        if (statusText) statusText.textContent = `${config.icon} ${config.text}`;
        if (statusDetails) statusDetails.textContent = details;
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'loadXtreamBtn') {
                this.loadXtreamContent(true); // Forçar novo download
            } else if (e.target.id === 'xtreamPasswordToggle') {
                this.toggleXtreamPasswordVisibility();
            } else if (e.target.id === 'clearCacheBtn') {
                this.clearCacheAndReload();
            } else if (e.target.id === 'testXtreamBtn') {
                this.testXtreamConnection();
            } else if (e.target.classList.contains('add-single-item')) {
                this.addSingleItem(e.target.dataset.itemId);
            } else if (e.target.classList.contains('add-all-items')) {
                this.addAllItems(e.target.dataset.category);
            } else if (e.target.classList.contains('series-toggle')) {
                this.toggleSeries(e.target.dataset.seriesName);
            } else if (e.target.id === 'selectAllItems') {
                this.toggleSelectAll();
            } else if (e.target.id === 'addSelectedItems') {
                this.addSelectedItems();
            } else if (e.target.classList.contains('add-all-from-tab')) {
                this.addAllFromTab(e.target.dataset.tabName);
            }
        });

        // Adicionar listeners para botões "Carregar Mais" de forma delegada
        document.addEventListener('click', (e) => {
            if (e.target.matches('#loadMoreMovies')) {
                this.loadMoreItems('movies');
            } else if (e.target.matches('#loadMoreSeries')) {
                this.loadMoreItems('series');
            } else if (e.target.matches('#loadMoreChannels')) {
                this.loadMoreItems('channels');
            }
        });

        // Rolagem infinita
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.addEventListener('scroll', () => {
                if (this.isLoading) return;

                const activeTab = document.querySelector('.tab-pane.active');
                if (!activeTab) return;

                const category = activeTab.id;
                const loadMoreButton = document.getElementById(`loadMore${category.charAt(0).toUpperCase() + category.slice(1)}`);

                if (loadMoreButton && mainContent.scrollTop + mainContent.clientHeight >= mainContent.scrollHeight - 200) {
                    this.loadMoreItems(category);
                }
            });
        }

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('item-checkbox')) {
                this.handleItemSelection(e.target);
            }
        });

        ['xtreamBaseUrl', 'xtreamUsername', 'xtreamPassword', 'xtreamConnectionName'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        document.getElementById('loadXtreamBtn')?.click();
                    }
                });
            }
        });

        ['xtreamBaseUrl', 'xtreamUsername', 'xtreamPassword'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.validateXtreamCredentials());
            }
        });
    }

    validateXtreamCredentials() {
        const baseUrl = document.getElementById('xtreamBaseUrl')?.value?.trim();
        const username = document.getElementById('xtreamUsername')?.value?.trim();
        const password = document.getElementById('xtreamPassword')?.value?.trim();
        
        const isValid = baseUrl && username && password && baseUrl.match(/^https?:\/\/.+/);
        
        const testBtn = document.getElementById('testXtreamBtn');
        const loadBtn = document.getElementById('loadXtreamBtn');
        
        if (testBtn) testBtn.disabled = !isValid;
        if (loadBtn) loadBtn.disabled = !isValid;
        
        return isValid;
    }

    async testXtreamConnection() {
        const baseUrl = document.getElementById('xtreamBaseUrl')?.value?.trim();
        const username = document.getElementById('xtreamUsername')?.value?.trim();
        const password = document.getElementById('xtreamPassword')?.value?.trim();

        if (!baseUrl || !username || !password) {
            this.showAlert('⚠️ Preencha todos os campos primeiro', 'warning');
            return;
        }

        try {
            this.updateConnectionStatus('connecting', 'Testando credenciais...');
            this.setLoading(true, 'testXtreamBtn');

            this.xtreamAPI.setCredentials({ 
                baseUrl, 
                username, 
                password, 
                connectionName: 'test_connection' 
            });

            const authResult = await this.xtreamAPI.authenticate();
            
            this.updateConnectionStatus('connected', 'Credenciais válidas');
            this.showAlert('✅ Conexão bem-sucedida! Credenciais válidas.\n\nSugestão: Clique em "Conectar Xtream" para carregar a lista.', 'success');
            
            if (authResult.user_info) {
                const info = authResult.user_info;
                let message = '📊 Informações da conta:\n';
                if (info.username) message += `👤 Usuário: ${info.username}\n`;
                if (info.status) message += `📈 Status: ${info.status}\n`;
                if (info.exp_date) {
                    const expDate = new Date(parseInt(info.exp_date) * 1000);
                    message += `📅 Expira: ${expDate.toLocaleDateString('pt-BR')}\n`;
                }
                if (info.active_cons) message += `🔗 Conexões ativas: ${info.active_cons}\n`;
                if (info.max_connections) message += `🔗 Máx. conexões: ${info.max_connections}`;
                
                this.showAlert(message, 'info');
            }

        } catch (error) {
            console.error('[M3U] Erro no teste de conexão:', error);
            this.updateConnectionStatus('error', this.getErrorMessage(error));
            this.showAlert(`❌ Teste falhou: ${this.getErrorMessage(error)}\n\nSugestões:\n- Tente usar HTTP em vez de HTTPS\n- Verifique as credenciais\n- Considere configurar um proxy CORS local`, 'danger');
        } finally {
            this.setLoading(false, 'testXtreamBtn');
        }
    }

    getErrorMessage(error) {
        if (!error || !error.message) {
            return 'Erro desconhecido - Verifique a conexão ou tente novamente';
        }
        const message = error.message.toLowerCase();
        
        if (message.includes('cors') || message.includes('cross-origin')) {
            return 'Erro de CORS - Tente usar HTTP ou configurar um proxy local';
        } else if (message.includes('credentials') || message.includes('authentication')) {
            return 'Credenciais inválidas - Verifique usuário e senha';
        } else if (message.includes('network') || message.includes('fetch')) {
            return 'Erro de rede - Verifique conexão e URL';
        } else if (message.includes('timeout')) {
            return 'Timeout - Servidor demorou para responder';
        } else if (message.includes('blocked')) {
            return 'Requisição bloqueada - Problema de CORS';
        } else if (message.includes('memory')) {
            return 'Memória insuficiente - Tente carregar uma lista menor ou limpar o cache';
        } else if (message.includes('created_on')) {
            return 'Erro ao adicionar item: Campo created_on é somente leitura';
        }
        
        return error.message;
    }

    toggleXtreamPasswordVisibility() {
        const passwordInput = document.getElementById('xtreamPassword');
        const eyeIcon = document.getElementById('xtreamPasswordToggle').querySelector('i');
        if (passwordInput && eyeIcon) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                eyeIcon.className = 'fas fa-eye';
            }
        }
    }

    async clearCacheAndReload() {
        try {
            this.showAlert('🧹 Limpando cache...', 'info');
            await this.xtreamAPI.clearCache();
            
            if (this.currentPlaylist && this.currentPlaylist.length > 0) {
                this.showAlert('♻️ Recarregando conteúdo...', 'info');
                await this.loadXtreamContent(true);
            } else {
                this.showAlert('✅ Cache limpo com sucesso!', 'success');
            }
        } catch (error) {
            console.error('[M3U] Erro ao limpar cache:', error);
            this.showAlert('❌ Erro ao limpar cache: ' + this.getErrorMessage(error), 'danger');
        }
    }

    async loadXtreamContent(forceDownload = true) {
        if (forceDownload) {
            const confirmed = confirm("Isso limpará os dados M3U salvos localmente e buscará uma nova lista do servidor. Deseja continuar?");
            if (!confirmed) {
                return;
            }
        }

        const baseUrl = document.getElementById('xtreamBaseUrl')?.value?.trim();
        const username = document.getElementById('xtreamUsername')?.value?.trim();
        const password = document.getElementById('xtreamPassword')?.value?.trim();
        const connectionName = document.getElementById('xtreamConnectionName')?.value?.trim() || 'Xtream_Connection';

        if (!baseUrl || !username || !password) {
            this.showAlert('⚠️ Preencha todos os campos do Xtream Codes (URL, usuário e senha)', 'warning');
            return;
        }

        if (!baseUrl.match(/^https?:\/\/.+/)) {
            this.showAlert('⚠️ URL deve começar com http:// ou https://', 'warning');
            return;
        }

        this.retryCount = 0;
        await this.attemptXtreamLoad(baseUrl, username, password, connectionName, forceDownload);
    }

    async attemptXtreamLoad(baseUrl, username, password, connectionName, forceDownload) {
        try {
            this.setLoading(true);
            this.updateConnectionStatus('connecting', 'Conectando ao servidor...');
            this.showAlert('🔌 Conectando ao Xtream Codes...', 'info');

            this.xtreamAPI.setCredentials({ baseUrl, username, password, connectionName });
            
            this.updateConnectionStatus('connecting', 'Verificando credenciais...');
            this.showAlert('🔐 Verificando credenciais...', 'info');
            
            await this.xtreamAPI.authenticate();
            
            this.updateConnectionStatus('connected', 'Autenticado');
            this.showAlert('✅ Autenticação bem-sucedida! Baixando conteúdo...', 'success');
            
            this.updateConnectionStatus('connected', 'Baixando playlist...');
            const m3uContent = await this.xtreamAPI.downloadM3U(forceDownload);
            
            console.log('[M3U] Conteúdo M3U obtido, tamanho:', m3uContent.length);
            console.log('[M3U] Primeiros 1000 caracteres do M3U:', m3uContent.substring(0, 1000));
            
            if (!m3uContent || m3uContent.length < 50) {
                throw new Error('Conteúdo M3U está vazio ou muito pequeno. Verifique suas credenciais.');
            }

            this.showAlert('⚙️ Processando conteúdo...', 'info');
            this.updateConnectionStatus('connected', 'Processando playlist...');

            await this.processM3UContent(m3uContent);
            
            this.retryCount = 0;
            this.lastError = null;
            const stats = this.getTotalItemsStats();
            this.updateConnectionStatus('connected', `${stats.total} itens carregados`);
            this.showAlert(`🎉 Lista Xtream carregada com sucesso!\n\n📊 ${stats.total} itens encontrados:\n🎬 ${stats.movies} filmes\n📺 ${stats.series} séries\n📡 ${stats.channels} canais`, 'success');
            
            // Salvar configurações do usuário
            if (this.baserowManager && typeof this.baserowManager.saveUserConfig === 'function') {
                await this.baserowManager.saveUserConfig();
            }

        } catch (error) {
            console.error('[M3U] Erro ao carregar Xtream:', error);
            this.lastError = error;
            
            if (this.retryCount < this.maxRetries && this.shouldRetry(error)) {
                this.retryCount++;
                this.updateConnectionStatus('connecting', `Tentativa ${this.retryCount}/${this.maxRetries}...`);
                this.showAlert(`🔄 Tentativa ${this.retryCount}/${this.maxRetries}... ${this.getErrorMessage(error)}`, 'warning');
                
                await new Promise(resolve => setTimeout(resolve, 2000 * this.retryCount));
                return this.attemptXtreamLoad(baseUrl, username, password, connectionName, forceDownload);
            }
            
            this.updateConnectionStatus('error', this.getErrorMessage(error));
            this.showAlert(`❌ Erro ao carregar lista Xtream: ${this.getErrorMessage(error)}\n\nSugestões:\n- Tente usar HTTP em vez de HTTPS\n- Verifique as credenciais\n- Considere configurar um proxy CORS local`, 'danger');
            
            // Renderizar conteúdo parcial, se disponível
            if (this.currentPlaylist?.length > 0) {
                this.renderContent();
            }
        } finally {
            this.setLoading(false);
        }
    }

    shouldRetry(error) {
        if (!error || !error.message) return false;
        const message = error.message.toLowerCase();
        return message.includes('network') || 
               message.includes('timeout') || 
               message.includes('cors') ||
               message.includes('fetch') ||
               !message.includes('credentials');
    }

    async processM3UContent(m3uContent) {
        const splitContent = await this.xtreamAPI.splitM3U(m3uContent);
        
        this.currentPlaylist = [];
        this.processedContent = {
            movies: [],
            series: {},
            channels: []
        };
        this.renderedCounts = { movies: 0, series: 0, channels: 0 };
        
        let totalProcessed = 0;

        for (const [type, content] of Object.entries(splitContent)) {
            if (content && content !== '#EXTM3U' && content.includes('http')) {
                console.log(`[M3U] Processando ${type} com ${content.split('\n').length} linhas`);
                
                try {
                    const parsedItems = this.parseM3U(content);
                    console.log(`[M3U] ${parsedItems.length} itens parseados para ${type}`, parsedItems.slice(0, 5));
                    
                    // Processar em lotes para evitar sobrecarga de memória
                    for (let i = 0; i < parsedItems.length; i += this.batchSize) {
                        const batch = parsedItems.slice(i, i + this.batchSize);
                        batch.forEach(item => {
                            item.type = type;
                            item.originalType = type;
                            this.currentPlaylist.push(item);
                        });
                        totalProcessed += batch.length;
                        await new Promise(resolve => setTimeout(resolve, 10)); // Pequena pausa para liberar memória
                    }
                } catch (parseError) {
                    console.error(`[M3U] Erro ao processar ${type}:`, parseError);
                }
            } else {
                console.log(`[M3U] Nenhuma linha válida encontrada para ${type}`);
            }
        }

        console.log('[M3U] Total de itens processados:', totalProcessed);
        
        if (totalProcessed === 0) {
            console.log('[M3U] Tentando processar conteúdo completo como fallback');
            const parsedItems = this.parseM3U(m3uContent);
            for (let i = 0; i < parsedItems.length; i += this.batchSize) {
                const batch = parsedItems.slice(i, i + this.batchSize);
                batch.forEach(item => {
                    item.type = 'movies';
                    item.originalType = 'movies';
                    this.currentPlaylist.push(item);
                });
                totalProcessed += batch.length;
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        if (totalProcessed === 0) {
            throw new Error('Nenhum item válido encontrado na lista. Verifique o servidor Xtream ou suas credenciais.');
        }

        await this.processContent();
        await this.renderContent();
        
        // Salvar conteúdo no banco de dados
        await this.saveM3UContentToDB();
    }

    async loadM3UContentFromDB() {
        try {
            this.showAlert('🔄 Carregando conteúdo M3U salvo...', 'info');
            const response = await fetch('load_m3u_content.php');
            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                this.currentPlaylist = result.data;
                await this.processContent();
                await this.renderContent();
                this.showAlert('✅ Conteúdo M3U carregado do banco de dados.', 'success');
            } else {
                this.showAlert('Nenhum conteúdo M3U local encontrado.', 'info');
            }
        } catch (error) {
            console.error('[M3U] Erro ao carregar conteúdo do DB:', error);
            this.showAlert('❌ Erro ao carregar conteúdo M3U local.', 'danger');
        }
    }

    async saveM3UContentToDB() {
        if (!this.currentPlaylist || this.currentPlaylist.length === 0) {
            return;
        }

        try {
            this.showAlert('💾 Salvando conteúdo da lista no banco de dados...', 'info');
            const response = await fetch('save_m3u_content.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.currentPlaylist)
            });

            const result = await response.json();
            if (result.success) {
                this.showAlert('✅ Conteúdo da lista salvo com sucesso!', 'success');
            } else {
                this.showAlert('❌ Erro ao salvar conteúdo da lista: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('[M3U] Erro ao salvar conteúdo no DB:', error);
            this.showAlert('❌ Erro de conexão ao salvar conteúdo da lista.', 'danger');
        }
    }

    parseM3U(content) {
        if (!content) {
            console.error('[M3U] Conteúdo M3U vazio');
            return [];
        }
        
        const lines = content.split(/[\r\n]+/).map(line => line.trim()).filter(line => line);
        const items = [];
        let currentItem = null;
        
        console.log('[M3U] Parsing M3U com', lines.length, 'linhas');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            console.log('[M3U] Processando linha:', line);
            
            if (line.startsWith('#EXTINF:')) {
                if (currentItem && currentItem.url) {
                    currentItem.id = this.generateId();
                    items.push({ ...currentItem });
                    console.log('[M3U] Item parseado:', currentItem);
                }
                
                currentItem = this.parseExtinf(line);
                
                // Verificar se a próxima linha é uma URL
                if (i + 1 < lines.length && this.isValidStreamUrl(lines[i + 1])) {
                    currentItem.url = lines[i + 1];
                    currentItem.id = this.generateId();
                    items.push({ ...currentItem });
                    console.log('[M3U] Item parseado com URL na próxima linha:', currentItem);
                    i++; // Pular a linha da URL
                    currentItem = null;
                }
            } else if (this.isValidStreamUrl(line)) {
                if (currentItem) {
                    currentItem.url = line;
                    currentItem.id = this.generateId();
                    items.push({ ...currentItem });
                    console.log('[M3U] Item parseado:', currentItem);
                    currentItem = null;
                } else {
                    const basicItem = {
                        duration: -1,
                        name: this.extractNameFromUrl(line),
                        logo: '',
                        group: 'Sem categoria',
                        tvgId: '',
                        tvgName: '',
                        url: line,
                        id: this.generateId()
                    };
                    items.push(basicItem);
                    console.log('[M3U] Item básico parseado:', basicItem);
                }
            } else {
                console.log('[M3U] Linha ignorada:', line);
            }
        }

        if (currentItem && currentItem.url) {
            currentItem.id = this.generateId();
            items.push({ ...currentItem });
            console.log('[M3U] Último item parseado:', currentItem);
        }
        
        console.log('[M3U] Total de itens extraídos:', items.length, items.slice(0, 5));
        return items;
    }

    parseExtinf(line) {
        const item = {
            duration: -1,
            name: '',
            logo: '',
            group: '',
            tvgId: '',
            tvgName: '',
            url: ''
        };

        console.log('[M3U] Parsing linha EXTINF:', line);

        const durationMatch = line.match(/#EXTINF:\s*([^,]+)/i);
        if (durationMatch) {
            item.duration = parseFloat(durationMatch[1]) || -1;
        }

        const logoMatch = line.match(/tvg-logo=["']?([^"'\s]*)["']?/i);
        if (logoMatch) item.logo = logoMatch[1];

        const groupMatch = line.match(/group-title=["']?([^"']*)["']?/i);
        if (groupMatch) item.group = groupMatch[1];

        const tvgIdMatch = line.match(/tvg-id=["']?([^"']*)["']?/i);
        if (tvgIdMatch) item.tvgId = tvgIdMatch[1];

        const tvgNameMatch = line.match(/tvg-name=["']?([^"']*)["']?/i);
        if (tvgNameMatch) item.tvgName = tvgNameMatch[1];

        const nameMatch = line.match(/,\s*(.+)$/);
        if (nameMatch) {
            item.name = nameMatch[1].trim();
        }
        
        if (!item.name || item.name === 'Sem Nome') {
            item.name = item.tvgName || item.group || 'Sem Nome';
        }

        return item;
    }

    isValidStreamUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        return (
            url.match(/^https?:\/\/.+/i) ||
            url.match(/\.(m3u8?|ts|mp4|mkv|avi|mov|flv)(\?.*)?$/i) ||
            url.includes('/live/') ||
            url.includes('/movie/') ||
            url.includes('/series/') ||
            url.includes('stream') ||
            url.includes('play')
        );
    }

    extractNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            
            if (filename && filename !== '') {
                return filename.replace(/\.(m3u8?|ts|mp4|mkv|avi|mov|flv)$/i, '');
            }
            
            return urlObj.hostname + pathname;
        } catch (e) {
            const parts = url.split('/');
            return parts[parts.length - 1] || 'Stream';
        }
    }

    async processContent(isInitial = true) {
        if (isInitial) {
            // Renderização inicial rápida com dados não processados
            this.renderInitialContent();
            // Enviar para o worker processar em segundo plano
            this.worker.postMessage(this.currentPlaylist);
        } else {
            // Re-renderização com dados processados do worker
            this.renderContent(true);
        }
    }

    renderInitialContent() {
        let container = document.getElementById('m3uContent');
        if (!container) {
            container = document.createElement('div');
            container.id = 'm3uContent';
            document.querySelector('.main-content').appendChild(container);
        }

        const initialItems = this.currentPlaylist.slice(0, this.batchSize);
        this.renderedCounts.movies = initialItems.length; // Usar 'movies' como contador geral inicial

        const html = `
            <div class="card-body">
                <div class="alert alert-info">
                    <i class="fas fa-spinner fa-spin me-2"></i>
                    Processando lista completa em segundo plano. A interface será atualizada em breve.
                </div>
                <div class="row">
                    ${initialItems.map(item => this.renderItem(item, 'movie')).join('')}
                </div>
                <button class="btn btn-outline-primary w-100 mt-3" id="loadMoreMovies" disabled>Carregando...</button>
            </div>
        `;
        container.innerHTML = html;
        container.style.display = 'block';
    }

    validateCategorization() {
        // Verificar se há itens mal categorizados
        const uncategorized = this.currentPlaylist.filter(item => !item.type || !['movies', 'series'].includes(item.originalType));
        if (uncategorized.length > 0) {
            console.warn('[M3U] Itens não categorizados:', uncategorized.length, uncategorized.slice(0, 5));
            // Reprocessar itens não categorizados como filmes por padrão
            uncategorized.forEach(item => {
                item.type = 'movies';
                item.originalType = 'movies';
                this.processedContent.movies.push({
                    ...item,
                    category: item.group || 'Filmes'
                });
            });
        }

        // Verificar consistência das séries
        Object.values(this.processedContent.series).forEach(series => {
            if (!series.episodes.length) {
                console.warn('[M3U] Série sem episódios:', series.name);
                delete this.processedContent.series[series.name];
            }
        });
    }

    categorizeItem(item) {
        const name = (item.name || '').toLowerCase();
        const group = (item.group || '').toLowerCase();
        const originalType = item.type || item.originalType || '';
        
        // Priorizar o tipo original da lista M3U
        if (originalType === 'movies') {
            return { 
                type: 'movie', 
                category: item.group || 'Filmes' 
            };
        } else if (originalType === 'series') {
            const seriesPatterns = [
                /(.+?)\s*[s|season]\s*(\d+)\s*[e|ep|episode]\s*(\d+)(?:\s*[-:]?\s*(.+))?/i,
                /(.+?)\s*(\d+)x(\d+)(?:\s*[-:]?\s*(.+))?/i,
                /(.+?)\s*temporada\s*(\d+)\s*episodio\s*(\d+)(?:\s*[-:]?\s*(.+))?/i,
                /(.+?)\s*t(\d+)e(\d+)(?:\s*[-:]?\s*(.+))?/i,
                /(.+?)\s*-\s*(\d+)x(\d+)(?:\s*[-:]?\s*(.+))?/i,
                /(.+?)\s*-\s*s(\d+)e(\d+)(?:\s*[-:]?\s*(.+))?/i
            ];

            for (const pattern of seriesPatterns) {
                const match = name.match(pattern) || item.name.match(pattern);
                if (match) {
                    return {
                        type: 'series',
                        seriesName: match[1].trim(),
                        season: parseInt(match[2]) || 1,
                        episode: parseInt(match[3]) || 1,
                        episodeName: match[4] ? match[4].trim() : `Episódio ${match[3]}`
                    };
                }
            }
            // Se não for identificado como episódio, mas o tipo original é 'series', ainda categorizar como série
            return {
                type: 'series',
                seriesName: item.name || 'Série Desconhecida',
                season: 1,
                episode: 1,
                episodeName: item.name || 'Episódio 1'
            };
        }

        // Evitar categorizar como canal, já que a lista contém apenas filmes e séries
        const seriesPatterns = [
            /(.+?)\s*[s|season]\s*(\d+)\s*[e|ep|episode]\s*(\d+)(?:\s*[-:]?\s*(.+))?/i,
            /(.+?)\s*(\d+)x(\d+)(?:\s*[-:]?\s*(.+))?/i,
            /(.+?)\s*temporada\s*(\d+)\s*episodio\s*(\d+)(?:\s*[-:]?\s*(.+))?/i,
            /(.+?)\s*t(\d+)e(\d+)(?:\s*[-:]?\s*(.+))?/i,
            /(.+?)\s*-\s*(\d+)x(\d+)(?:\s*[-:]?\s*(.+))?/i,
            /(.+?)\s*-\s*s(\d+)e(\d+)(?:\s*[-:]?\s*(.+))?/i
        ];

        for (const pattern of seriesPatterns) {
            const match = name.match(pattern) || item.name.match(pattern);
            if (match) {
                return {
                    type: 'series',
                    seriesName: match[1].trim(),
                    season: parseInt(match[2]) || 1,
                    episode: parseInt(match[3]) || 1,
                    episodeName: match[4] ? match[4].trim() : `Episódio ${match[3]}`
                };
            }
        }

        // Se não for identificado como série, categorizar como filme
        return { 
            type: 'movie',
            category: item.group || 'Filmes'
        };
    }

    async renderContent() {
        let container = document.getElementById('m3uContent');
        if (!container) {
            console.warn('[M3U] Elemento m3uContent não encontrado, criando dinamicamente');
            container = document.createElement('div');
            container.id = 'm3uContent';
            container.className = 'card border-0 shadow-sm mb-4 shadow-hover';
            const mainContent = document.querySelector('.main-content') || document.body;
            mainContent.insertBefore(container, mainContent.querySelector('#tableHeader'));
        }

        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        console.log('[M3U] Renderizando conteúdo:', this.processedContent);

        const stats = this.getTotalItemsStats();
        console.log('[M3U] Estatísticas de renderização:', stats);

        // Resetar contadores de renderização
        this.renderedCounts = { movies: 0, series: 0, channels: 0 };

        if (stats.total === 0) {
            container.innerHTML = `
                <div class="card-body">
                    <div class="alert alert-warning">
                        <div class="text-center py-4">
                            <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                            <h5>Nenhum conteúdo encontrado</h5>
                            <p>Verifique as credenciais Xtream.</p>
                            <button class="btn btn-warning btn-sm" id="clearCacheBtn">
                                <i class="fas fa-sync me-2"></i>Limpar Cache e Tentar Novamente
                            </button>
                            <button class="btn btn-info btn-sm ms-2" id="testXtreamBtn">
                                <i class="fas fa-plug me-2"></i>Testar Conexão
                            </button>
                        </div>
                    </div>
                </div>
            `;
            console.log('[M3U] Renderizado estado vazio');
            return;
        }

        // Ocultar a aba Canais se não houver canais
        const showChannelsTab = stats.channels > 0;

        const html = `
            <div class="card-body">
                <div class="m3u-content">
                    <div class="m3u-header mb-3">
                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                            <h5 class="mb-2"><i class="fas fa-list me-2"></i>Conteúdo da Lista M3U</h5>
                            <div class="m3u-actions">
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="selectAllItems">
                                    <label class="form-check-label" for="selectAllItems">Selecionar Todos</label>
                                </div>
                                <button class="btn btn-success btn-sm ms-2" id="addSelectedItems" data-bs-toggle="tooltip" title="Adicionar itens selecionados ao Baserow">
                                    <i class="fas fa-plus"></i> Adicionar Selecionados
                                </button>
                                <button class="btn btn-warning btn-sm ms-2" id="clearCacheBtn" data-bs-toggle="tooltip" title="Limpar cache e recarregar conteúdo">
                                    <i class="fas fa-sync me-2"></i>Limpar Cache
                                </button>
                                <button class="btn btn-info btn-sm ms-2" id="testXtreamBtn" data-bs-toggle="tooltip" title="Testar conexão com o servidor Xtream">
                                    <i class="fas fa-plug me-2"></i>Testar Conexão
                                </button>
                            </div>
                        </div>
                        <div class="m3u-stats mt-2">
                            <span class="badge bg-primary me-2">🎬 Filmes: ${stats.movies}</span>
                            <span class="badge bg-info me-2">📺 Séries: ${stats.series}</span>
                            ${showChannelsTab ? `<span class="badge bg-warning me-2">📡 Canais: ${stats.channels}</span>` : ''}
                            <span class="badge bg-success ms-2">📊 Total: ${stats.total}</span>
                        </div>
                    </div>

                    ${this.renderBaserowStatus()}

                    <div class="m3u-tabs">
                        <ul class="nav nav-tabs" id="m3uTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="movies-tab" data-bs-toggle="tab" data-bs-target="#movies" type="button" role="tab">
                                    <i class="fas fa-film me-1"></i> Filmes (${stats.movies})
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="series-tab" data-bs-toggle="tab" data-bs-target="#series" type="button" role="tab">
                                    <i class="fas fa-tv me-1"></i> Séries (${stats.series})
                                </button>
                            </li>
                            ${showChannelsTab ? `
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="channels-tab" data-bs-toggle="tab" data-bs-target="#channels" type="button" role="tab">
                                    <i class="fas fa-broadcast-tower me-1"></i> Canais (${stats.channels})
                                </button>
                            </li>
                            ` : ''}
                        </ul>
                        <div class="tab-content" id="m3uTabContent">
                            <div class="tab-pane fade show active" id="movies" role="tabpanel">
                                ${this.renderMovies()}
                                ${stats.movies > this.batchSize ? `<button class="btn btn-outline-primary w-100 mt-3" id="loadMoreMovies">Carregar Mais Filmes</button>` : ''}
                            </div>
                            <div class="tab-pane fade" id="series" role="tabpanel">
                                ${this.renderSeries()}
                                ${stats.series > this.batchSize ? `<button class="btn btn-outline-primary w-100 mt-3" id="loadMoreSeries">Carregar Mais Séries</button>` : ''}
                            </div>
                            ${showChannelsTab ? `
                            <div class="tab-pane fade" id="channels" role="tabpanel">
                                ${this.renderChannels()}
                                ${stats.channels > this.batchSize ? `<button class="btn btn-outline-primary w-100 mt-3" id="loadMoreChannels">Carregar Mais Canais</button>` : ''}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        console.log('[M3U] HTML renderizado (primeiros 1000 caracteres):', html.substring(0, 1000));
        
        // Forçar visibilidade do container
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        container.scrollIntoView({ behavior: 'smooth' });

        // Inicializar tooltips do Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        // Verificar e habilitar/desabilitar botões de envio
        this.checkAndEnableButtons();
    }

    checkAndEnableButtons() {
        const config = this.baserowManager.api.config;
        const hasConteudosTable = !!config.conteudosTableId;
        const hasEpisodiosTable = !!config.episodiosTableId;
        const hasConteudosMapping = config.mapping_conteudos && Object.keys(config.mapping_conteudos).length > 0;
        const hasEpisodiosMapping = config.mapping_episodios && Object.keys(config.mapping_episodios).length > 0;

        const isReady = hasConteudosTable && hasEpisodiosTable && hasConteudosMapping && hasEpisodiosMapping;
        
        this.updateSendButtonsState(isReady);
    }

    renderBaserowStatus() {
        const hasTable = this.baserowManager.currentTable;
        const tableName = hasTable ? this.baserowManager.currentTable.name : null;
        
        if (!hasTable) {
            return `
                <div class="alert alert-info">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-info-circle me-2"></i>
                        <div>
                            <strong>💡 Dica:</strong> Selecione uma tabela no Baserow para importar os dados M3U
                        </div>
                    </div>
                </div>
            `;
        }
        
        const isCompatible = this.baserowManager.ui.isTableM3UCompatible({ name: tableName });
        return `
            <div class="alert alert-${isCompatible ? 'success' : 'warning'}">
                <div class="d-flex align-items-center">
                    <i class="fas fa-${isCompatible ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                    <div>
                        <strong>✅ Tabela selecionada:</strong> ${tableName}
                        <br><small>${isCompatible ? 'Pronto para importar dados M3U!' : 'Esta tabela pode não ser totalmente compatível com M3U.'}</small>
                    </div>
                </div>
            </div>
        `;
    }

    renderMovies() {
        if (this.processedContent.movies.length === 0) {
            return '<div class="text-center py-4 text-muted">Nenhum filme encontrado</div>';
        }

        const moviesToRender = this.processedContent.movies.slice(0, this.batchSize);
        this.renderedCounts.movies = moviesToRender.length;

        const groupedMovies = this.groupBy(moviesToRender, 'category');
        
        let html = `
            <div class="d-flex justify-content-end mb-3">
                <button class="btn btn-primary add-all-from-tab" data-tab-name="movies">
                    <i class="fas fa-plus-circle me-2"></i>Adicionar Todos os Filmes (${this.processedContent.movies.length})
                </button>
            </div>
        `;

        html += Object.entries(groupedMovies).map(([category, movies]) => `
            <div class="category-section mb-4" data-category-group="movies">
                <div class="category-header d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">
                        <i class="fas fa-folder me-2"></i>${category}
                        <span class="badge bg-secondary ms-2">${movies.length}</span>
                    </h6>
                    <button class="btn btn-outline-success btn-sm add-all-items" data-category="movies-${category}" data-bs-toggle="tooltip" title="Adicionar todos os filmes desta categoria ao Baserow">
                        <i class="fas fa-plus"></i> Adicionar Todos da Categoria
                    </button>
                </div>
                <div class="row">
                    ${movies.map(movie => this.renderItem(movie, 'movie')).join('')}
                </div>
            </div>
        `).join('');

        if (this.processedContent.movies.length > this.renderedCounts.movies) {
            html += `<button class="btn btn-outline-primary w-100 mt-3" id="loadMoreMovies" onclick="app.m3uManager.loadMoreItems('movies')">Carregar Mais Filmes</button>`;
        }

        return html;
    }

    renderSeries() {
        if (Object.keys(this.processedContent.series).length === 0) {
            return '<div class="text-center py-4 text-muted">Nenhuma série encontrada</div>';
        }

        const seriesKeys = Object.keys(this.processedContent.series);
        const seriesToRender = seriesKeys.slice(0, this.batchSize);
        this.renderedCounts.series = seriesToRender.length;
        
        let html = `
            <div class="d-flex justify-content-end mb-3">
                <button class="btn btn-primary add-all-from-tab" data-tab-name="series">
                    <i class="fas fa-plus-circle me-2"></i>Adicionar Todas as Séries (${Object.keys(this.processedContent.series).length})
                </button>
            </div>
        `;

        html += seriesToRender.map(seriesName => {
            const series = this.processedContent.series[seriesName];
            return `
                <div class="series-section mb-4" data-category-group="series">
                    <div class="series-header d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                        <div class="series-info d-flex align-items-center">
                            ${series.logo ? `<img src="${series.logo}" alt="${seriesName}" class="series-logo me-3" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'">` : ''}
                            <div>
                                <h6 class="mb-0">${seriesName}</h6>
                                <small class="text-muted">${series.episodes.length} episódios</small>
                            </div>
                        </div>
                        <div class="series-actions">
                            <button class="btn btn-outline-success btn-sm add-all-items me-2" data-category="series-${seriesName}" data-bs-toggle="tooltip" title="Adicionar todos os episódios desta série ao Baserow">
                                <i class="fas fa-plus"></i> Adicionar Série Completa
                            </button>
                            <button class="btn btn-outline-primary btn-sm series-toggle" data-series-name="${seriesName}" data-bs-toggle="tooltip" title="Mostrar/esconder episódios">
                                <i class="fas fa-chevron-down"></i> Episódios
                            </button>
                        </div>
                    </div>
                    <div class="series-episodes collapse" id="episodes-${this.sanitizeId(seriesName)}">
                        <div class="row">
                            ${series.episodes.slice(0, this.batchSize).map(episode => this.renderItem(episode, 'episode')).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (seriesKeys.length > this.renderedCounts.series) {
            html += `<button class="btn btn-outline-primary w-100 mt-3" id="loadMoreSeries" onclick="app.m3uManager.loadMoreItems('series')">Carregar Mais Séries</button>`;
        }

        return html;
    }

    renderChannels() {
        if (this.processedContent.channels.length === 0) {
            return '<div class="text-center py-4 text-muted">Nenhum canal encontrado</div>';
        }

        const channelsToRender = this.processedContent.channels.slice(0, this.batchSize);
        this.renderedCounts.channels = channelsToRender.length;

        const groupedChannels = this.groupBy(channelsToRender, 'category');
        
        let html = Object.entries(groupedChannels).map(([category, channels]) => `
            <div class="category-section mb-4" data-category-group="channels">
                <div class="category-header d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">
                        <i class="fas fa-broadcast-tower me-2"></i>${category}
                        <span class="badge bg-secondary ms-2">${channels.length}</span>
                    </h6>
                    <button class="btn btn-outline-success btn-sm add-all-items" data-category="channels-${category}" data-bs-toggle="tooltip" title="Adicionar todos os canais desta categoria ao Baserow">
                        <i class="fas fa-plus"></i> Adicionar Todos
                    </button>
                </div>
                <div class="row">
                    ${channels.map(channel => this.renderItem(channel, 'channel')).join('')}
                </div>
            </div>
        `).join('');

        if (this.processedContent.channels.length > this.renderedCounts.channels) {
            html += `<button class="btn btn-outline-primary w-100 mt-3" id="loadMoreChannels" onclick="app.m3uManager.loadMoreItems('channels')">Carregar Mais Canais</button>`;
        }

        return html;
    }

    renderItem(item, type) {
        const title = type === 'episode' ? 
            `${item.episodeName || item.name} (S${item.season || '?'}E${item.episode || '?'})` : 
            item.name;

        const safeTitle = this.escapeHtml(title);

        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 m3u-item-card">
                    <div class="card-body p-3">
                        <div class="d-flex align-items-start">
                            <div class="form-check me-2 mt-1">
                                <input class="form-check-input item-checkbox" type="checkbox" value="${item.id}" id="item-${item.id}">
                            </div>
                            ${item.logo ? 
                                `<img src="${item.logo}" alt="${safeTitle}" class="item-logo me-3" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div class="item-logo-placeholder me-3" style="display: none; width: 60px; height: 60px; background: #f0f0f0; border-radius: 6px;"></div>` : 
                                '<div class="item-logo-placeholder me-3" style="width: 60px; height: 60px; background: #f0f0f0; border-radius: 6px;"></div>'
                            }
                            <div class="item-info flex-grow-1">
                                <h6 class="card-title mb-1" title="${safeTitle}">${this.truncateText(safeTitle, 40)}</h6>
                                <p class="card-text small text-muted mb-2">
                                    ${item.group ? `<span class="badge bg-light text-dark me-1">${this.escapeHtml(item.group)}</span>` : ''}
                                    ${type === 'episode' ? `<span class="badge bg-info">S${item.season || '?'}E${item.episode || '?'}</span>` : ''}
                                </p>
                                <div class="item-actions">
                                    <button class="btn btn-success btn-sm add-single-item" data-item-id="${item.id}" title="Adicionar ao Baserow" data-bs-toggle="tooltip">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                    <button class="btn btn-outline-primary btn-sm ms-1" onclick="window.open('${item.url}', '_blank')" title="Visualizar" data-bs-toggle="tooltip">
                                        <i class="fas fa-play"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadMoreItems(category) {
        const loadMoreButton = document.getElementById(`loadMore${category.charAt(0).toUpperCase() + category.slice(1)}`);
        if (!loadMoreButton) return;
    
        loadMoreButton.disabled = true;
        loadMoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    
        const currentCount = this.renderedCounts[category];
        const newCount = currentCount + this.batchSize;
    
        let items;
        let container;
        let html = '';
    
        switch (category) {
            case 'movies':
                items = this.processedContent.movies.slice(currentCount, newCount);
                container = document.querySelector('#movies .row');
                html = items.map(movie => this.renderItem(movie, 'movie')).join('');
                break;
            case 'series':
                const seriesKeys = Object.keys(this.processedContent.series);
                items = seriesKeys.slice(currentCount, newCount);
                container = document.querySelector('#series');
                html = items.map(seriesName => this.renderSeriesItem(seriesName)).join('');
                break;
            case 'channels':
                items = this.processedContent.channels.slice(currentCount, newCount);
                container = document.querySelector('#channels .row');
                html = items.map(channel => this.renderItem(channel, 'channel')).join('');
                break;
        }
    
        if (container && html) {
            // Usar um elemento temporário para inserir o HTML e evitar problemas de script
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            while(tempDiv.firstChild) {
                container.appendChild(tempDiv.firstChild);
            }
        }
    
        this.renderedCounts[category] = newCount;
    
        if (newCount >= (category === 'series' ? Object.keys(this.processedContent.series).length : this.processedContent[category].length)) {
            loadMoreButton.remove();
        } else {
            loadMoreButton.disabled = false;
            loadMoreButton.innerHTML = `Carregar Mais ${category.charAt(0).toUpperCase() + category.slice(1)}`;
        }
    
        // Re-inicializar tooltips para novos elementos
        const tooltipTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    renderSeriesItem(seriesName) {
        const series = this.processedContent.series[seriesName];
        return `
            <div class="series-section mb-4" data-category-group="series">
                <div class="series-header d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                    <div class="series-info d-flex align-items-center">
                        ${series.logo ? `<img src="${series.logo}" alt="${seriesName}" class="series-logo me-3" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'">` : ''}
                        <div>
                            <h6 class="mb-0">${seriesName}</h6>
                            <small class="text-muted">${series.episodes.length} episódios</small>
                        </div>
                    </div>
                    <div class="series-actions">
                        <button class="btn btn-outline-success btn-sm add-all-items me-2" data-category="series-${seriesName}" data-bs-toggle="tooltip" title="Adicionar todos os episódios desta série ao Baserow">
                            <i class="fas fa-plus"></i> Adicionar Série
                        </button>
                        <button class="btn btn-outline-primary btn-sm series-toggle" data-series-name="${seriesName}" data-bs-toggle="tooltip" title="Mostrar/esconder episódios">
                            <i class="fas fa-chevron-down"></i> Episódios
                        </button>
                    </div>
                </div>
                <div class="series-episodes collapse" id="episodes-${this.sanitizeId(seriesName)}">
                    <div class="row">
                        ${series.episodes.slice(0, this.batchSize).map(episode => this.renderItem(episode, 'episode')).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    async addSingleItem(itemId) {
        if (!this.baserowManager.api.config.conteudosTableId) {
            this.showAlert('Por favor, configure o mapeamento de campos e os IDs das tabelas antes de adicionar itens.', 'warning');
            return;
        }

        const item = this.findItemById(itemId);
        if (!item) {
            this.showAlert('❌ Item não encontrado', 'error');
            return;
        }

        const itemType = this.getItemTypeForMapping(item);
        const isEpisode = itemType === 'episode';
        const apiConfig = this.baserowManager.api.config;
        const tableId = isEpisode ? apiConfig.episodiosTableId : apiConfig.conteudosTableId;
        const tableName = isEpisode ? 'Episódios' : 'Conteúdos';

        if (!tableId) {
            this.showAlert(`⚠️ Tabela para "${itemType}" não encontrada na configuração.`, 'danger');
            return;
        }

        // Verificação de duplicados para filmes e séries
        if (!isEpisode) {
            const nameField = apiConfig.mapping_conteudos['Nome'];
            if (nameField) {
                const existingNames = await this.baserowManager.api.fetchAllRecordNames(tableId, nameField);
                if (existingNames.has(item.name)) {
                    this.showAlert(`ℹ️ Item "${item.name}" já existe no Baserow.`, 'info');
                    return;
                }
            }
        }

        try {
            this.setLoading(true, `add-single-item-${itemId}`);
            this.showAlert(`⬆️ Adicionando "${item.name}" à tabela "${tableName}"...`, 'info');
            
            const formattedData = this.formatItemForBaserow(item, itemType);
            
            await this.baserowManager.api.createRecord(tableId, formattedData);
            
            this.showAlert(`✅ "${item.name}" adicionado com sucesso!`, 'success');
            
            const checkbox = document.getElementById(`item-${itemId}`);
            if (checkbox) {
                checkbox.checked = false;
                checkbox.disabled = true;
                checkbox.parentElement.parentElement.parentElement.style.opacity = '0.6';
            }
            
        } catch (error) {
            console.error('[M3U] Erro ao adicionar item:', error);
            this.showAlert(`❌ Erro ao adicionar "${item.name}": ${this.getErrorMessage(error)}`, 'danger');
        } finally {
            this.setLoading(false, `add-single-item-${itemId}`);
        }
    }

    async addAllItems(category) {
        const apiConfig = this.baserowManager.api.config;
        const ui = this.baserowManager.ui;
        const moviesTableId = apiConfig.conteudosTableId;
        const episodesTableId = apiConfig.episodiosTableId;

        if (!moviesTableId || !episodesTableId) {
            this.showAlert('⚠️ IDs das tabelas de conteúdos ou episódios não encontrados na configuração.', 'danger');
            return;
        }

        let isSeries = category.startsWith('series-');
        const nameField = apiConfig.mapping_conteudos['Nome'];
        if (!nameField) {
            this.showAlert('Mapeamento para o campo "Nome" não encontrado na tabela de conteúdos.', 'danger');
            return;
        }

        ui.showProgress('Verificando Duplicados', 'Buscando conteúdos existentes...');
        const existingNames = await this.baserowManager.api.fetchAllRecordNames(moviesTableId, nameField);
        
        if (isSeries) {
            const seriesName = category.replace('series-', '');
            const seriesData = this.processedContent.series[seriesName];
            if (!seriesData) {
                this.showAlert(`Série "${seriesName}" não encontrada.`, 'danger');
                ui.hideProgress();
                return;
            }

            const confirm = window.confirm(`Deseja sincronizar a série "${seriesName}" (${seriesData.episodes.length} episódios)?`);
            if (!confirm) {
                ui.hideProgress();
                return;
            }

            let errorCount = 0;
            let successCount = 0;
            
            if (!existingNames.has(seriesData.name)) {
                ui.updateProgress(0, `Adicionando nova série: ${seriesName}`);
                const seriesHeaderData = this.fieldMapper.mapSeriesHeader(seriesData, apiConfig.mapping_conteudos);
                for (const seasonData of seriesHeaderData) {
                    await this.baserowManager.api.createRecord(moviesTableId, seasonData).catch(e => errorCount++);
                }
                // Se a série é nova, todos os episódios são novos
                await this.processItemsInBulk(seriesData.episodes, 'episode', episodesTableId, `episódios de ${seriesName}`, 0, `Enviando episódio`);
            } else {
                this.showAlert(`Série "${seriesName}" já existe, sincronizando episódios...`, 'info', 2000);
                ui.updateProgress(0, `Verificando episódios para ${seriesName}...`);
                const episodeNameField = apiConfig.mapping_episodios['Nome'];
                const seasonField = apiConfig.mapping_episodios['Temporadas'];
                const episodeNumField = apiConfig.mapping_episodios['Episódio'];
                
                const existingEpisodeIds = await this.baserowManager.api.fetchExistingEpisodeIds(episodesTableId, episodeNameField, seasonField, episodeNumField);
                const newEpisodes = seriesData.episodes.filter(ep => !existingEpisodeIds.has(this.getEpisodeIdentifier(seriesData.name, ep.season, ep.episode)));
                const skippedCount = seriesData.episodes.length - newEpisodes.length;

                if (newEpisodes.length === 0) {
                    this.showAlert(`✅ Nenhum episódio novo para "${seriesName}".`, 'success');
                    ui.hideProgress();
                    return;
                }
                await this.processItemsInBulk(newEpisodes, 'episode', episodesTableId, `episódios de ${seriesName}`, skippedCount, `Enviando episódio`);
            }
        } else { // Lógica para filmes
            const catName = category.replace('movies-', '');
            const items = this.processedContent.movies.filter(item => (item.group || 'Sem categoria') === catName);
            const newItems = items.filter(item => !existingNames.has(item.name));
            const skippedCount = items.length - newItems.length;

            if (newItems.length === 0) {
                this.showAlert(`✅ Todos os filmes de "${catName}" já existem.`, 'info');
                ui.hideProgress();
                return;
            }

            const confirm = window.confirm(`Encontrados ${newItems.length} filmes novos em "${catName}" (${skippedCount} já existem). Deseja adicionar?`);
            if (!confirm) {
                ui.hideProgress();
                return;
            }
            await this.processItemsInBulk(newItems, 'movie', moviesTableId, `filmes de ${catName}`, skippedCount, `Enviando filme`);
        }
    }

    splitLargeSeries(allSeries) {
        const finalSeriesList = [];
        for (const series of allSeries) {
            if (series.episodes.length <= 100) {
                finalSeriesList.push({ ...series, isSplitPart: false });
                continue;
            }

            const numParts = Math.ceil(series.episodes.length / 100);
            for (let i = 0; i < numParts; i++) {
                const partSeason = i + 1;
                const partEpisodes = series.episodes.slice(i * 100, (i + 1) * 100);
                
                let episodeCounter = 1;
                const updatedEpisodes = partEpisodes.map(ep => ({
                    ...ep,
                    seriesName: series.name, // Always use the original name
                    season: partSeason,      // Set season to the part number
                    episode: episodeCounter++  // Reset episode number for the new season
                }));

                const newSeriesPart = {
                    ...series,
                    name: series.name, // Keep original name
                    episodes: updatedEpisodes,
                    isSplitPart: true // Flag to identify this as a part of a split series
                };
                finalSeriesList.push(newSeriesPart);
            }
        }
        return finalSeriesList;
    }

    async addAllFromTab(tabName) {
        const apiConfig = this.baserowManager.api.config;
        const moviesTableId = apiConfig.conteudosTableId;
        const episodesTableId = apiConfig.episodiosTableId;
        const ui = this.baserowManager.ui;

        if (!moviesTableId || !episodesTableId) {
            this.showAlert('⚠️ IDs das tabelas de conteúdos e episódios devem ser configurados.', 'danger');
            return;
        }

        const nameField = apiConfig.mapping_conteudos['Nome'];
        if (!nameField) {
            this.showAlert('Mapeamento para o campo "Nome" não encontrado na tabela de conteúdos.', 'danger');
            return;
        }

        ui.showProgress('Verificando Duplicados', 'Buscando conteúdos existentes...');
        const existingNames = await this.baserowManager.api.fetchAllRecordNames(moviesTableId, nameField);
        
        if (tabName === 'movies') {
            const movies = this.processedContent.movies.filter(m => !existingNames.has(m.name));
            const skippedCount = this.processedContent.movies.length - movies.length;

            if (movies.length === 0) {
                this.showAlert('✅ Todos os filmes já existem no Baserow.', 'info');
                ui.hideProgress();
                return;
            }
            const confirm = window.confirm(`Encontrados ${movies.length} filmes novos para adicionar (${skippedCount} já existem). Deseja continuar?`);
            if (!confirm) {
                ui.hideProgress();
                return;
            }
            
            await this.processItemsInBulk(movies, 'movie', moviesTableId, 'filmes', skippedCount);

        } else if (tabName === 'series') {
            const allSeries = Object.values(this.processedContent.series);
            if (allSeries.length === 0) {
                this.showAlert('⚠️ Nenhuma série para adicionar.', 'warning');
                ui.hideProgress();
                return;
            }

            // Prioritize series with more than 100 episodes
            allSeries.sort((a, b) => {
                const aIsLarge = a.episodes.length > 100;
                const bIsLarge = b.episodes.length > 100;
                if (aIsLarge && !bIsLarge) return -1;
                if (!aIsLarge && bIsLarge) return 1;
                return 0;
            });
            
            const finalSeriesList = this.splitLargeSeries(allSeries);
            const originalSeriesCount = allSeries.length;
            const finalSeriesCount = finalSeriesList.length;

            let confirmMessage = `Deseja verificar ${originalSeriesCount} séries e adicionar as novas junto com seus episódios?`;
            if (finalSeriesCount > originalSeriesCount) {
                confirmMessage += `\n\nℹ️ Séries com mais de 100 episódios serão divididas em partes, resultando em um total de ${finalSeriesCount} partes de séries a serem processadas.`
            }
            
            const confirm = window.confirm(confirmMessage);
            if (!confirm) {
                ui.hideProgress();
                return;
            }

            try {
                ui.updateProgress(0, 'Buscando episódios existentes...');
                const episodeNameField = apiConfig.mapping_episodios['Nome'];
                const seasonField = apiConfig.mapping_episodios['Temporadas'];
                const episodeNumField = apiConfig.mapping_episodios['Episódio'];
                const existingEpisodeIds = await this.baserowManager.api.fetchExistingEpisodeIds(episodesTableId, episodeNameField, seasonField, episodeNumField);

                let seriesProcessed = 0;
                let episodesAdded = 0;
                let seriesSkipped = 0;
                let episodesSkipped = 0;
                let errors = 0;

                for (const series of finalSeriesList) {
                    seriesProcessed++;
                    ui.updateProgress(
                        Math.round((seriesProcessed / finalSeriesList.length) * 100),
                        `Processando parte ${seriesProcessed} de ${finalSeriesList.length}: ${series.name}`
                    );

                    if (!existingNames.has(series.name) || series.isSplitPart) {
                        // Adiciona nova série e todos os seus episódios
                        // For split parts, this will create new "conteudo" entries even with the same name
                        const seriesHeaderData = this.fieldMapper.mapSeriesHeader(series, apiConfig.mapping_conteudos);
                        for (const seasonData of seriesHeaderData) {
                            await this.baserowManager.api.createRecord(moviesTableId, seasonData).catch(e => errors++);
                        }
                        for (const episode of series.episodes) {
                            try {
                                await this.baserowManager.api.createRecord(episodesTableId, this.formatItemForBaserow(episode, 'episode'));
                                episodesAdded++;
                            } catch (error) { errors++; }
                        }
                    } else {
                        // Sincroniza episódios de série existente
                        seriesSkipped++;
                        const newEpisodes = series.episodes.filter(ep => {
                            const episodeId = this.getEpisodeIdentifier(series.name, ep.season, ep.episode);
                            return !existingEpisodeIds.has(episodeId);
                        });
                        
                        episodesSkipped += series.episodes.length - newEpisodes.length;

                        for (const episode of newEpisodes) {
                            try {
                                await this.baserowManager.api.createRecord(episodesTableId, this.formatItemForBaserow(episode, 'episode'));
                                episodesAdded++;
                            } catch (error) { errors++; }
                        }
                    }
                }
                
                const message = `🎉 Processo concluído! ${episodesAdded} episódios adicionados. ` +
                                `${seriesSkipped > 0 ? `(${seriesSkipped} séries já existiam). ` : ''}` +
                                `${episodesSkipped > 0 ? `(${episodesSkipped} episódios já existiam). ` : ''}` +
                                `${errors > 0 ? `(${errors} erros)` : ''}`;
                this.showAlert(message, 'success');

            } catch (error) {
                this.showAlert(`❌ Erro na adição em massa de séries: ${this.getErrorMessage(error)}`, 'danger');
            } finally {
                ui.hideProgress();
            }

        } else {
            this.showAlert('⚠️ Aba desconhecida para adição em massa.', 'warning');
            ui.hideProgress();
        }
    }

    async processItemsInBulk(items, itemType, tableId, tabName, skippedCount = 0) {
        const ui = this.baserowManager.ui;
        try {
            ui.showProgress(`Adicionando ${tabName}`, `Enviando ${items.length} itens...`);
            let successCount = 0;
            let errorCount = 0;
            let processedCount = 0;

            for (const item of items) {
                try {
                    const formattedData = this.formatItemForBaserow(item, itemType);
                    await this.baserowManager.api.createRecord(tableId, formattedData);
                    successCount++;
                } catch (error) {
                    console.error('[M3U] Erro ao adicionar item:', item.name, error);
                    errorCount++;
                }
                processedCount++;
                const percentage = Math.round((processedCount / items.length) * 100);
                ui.updateProgress(percentage, `Enviando ${processedCount} de ${items.length}...`);
            }

            const message = `🎉 ${successCount} ${tabName} adicionados! ` +
                            `${skippedCount > 0 ? `(ℹ️ ${skippedCount} já existiam) ` : ''}` +
                            `${errorCount > 0 ? `(❌ ${errorCount} falharam)` : ''}`;
            
            this.showAlert(message, successCount > 0 ? 'success' : 'info');

        } catch (error) {
            console.error(`[M3U] Erro na adição em massa de ${tabName}:`, error);
            this.showAlert(`❌ Erro na adição em massa: ${this.getErrorMessage(error)}`, 'danger');
        } finally {
            ui.hideProgress();
        }
    }

    async addSelectedItems() {
        if (!this.baserowManager.api.config.conteudosTableId) {
            this.showAlert('Por favor, configure o mapeamento de campos e os IDs das tabelas antes de adicionar itens.', 'warning');
            return;
        }

        if (this.selectedItems.size === 0) {
            this.showAlert('⚠️ Selecione pelo menos um item', 'warning');
            return;
        }
        
        const apiConfig = this.baserowManager.api.config;
        const moviesTableId = apiConfig.conteudosTableId;
        const episodesTableId = apiConfig.episodiosTableId;
        const ui = this.baserowManager.ui;

        if (!moviesTableId || !episodesTableId) {
            this.showAlert('⚠️ IDs das tabelas de conteúdos ou episódios não encontrados na configuração.', 'danger');
            return;
        }

        const nameField = apiConfig.mapping_conteudos['Nome'];
        if (!nameField) {
            this.showAlert('Mapeamento para o campo "Nome" não encontrado na tabela de conteúdos.', 'danger');
            return;
        }

        const confirm = window.confirm(`Deseja adicionar ${this.selectedItems.size} itens selecionados ao Baserow?`);
        if (!confirm) return;

        ui.showProgress('Verificando Duplicados', 'Buscando conteúdos existentes...');
        const existingNames = await this.baserowManager.api.fetchAllRecordNames(moviesTableId, nameField);

        try {
            ui.showProgress('Adicionando Itens Selecionados', `Iniciando envio...`);
            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;
            let processedCount = 0;

            for (const itemId of this.selectedItems) {
                const item = this.findItemById(itemId);
                if (!item) continue;

                const itemType = this.getItemTypeForMapping(item);
                const isEpisode = itemType === 'episode';
                
                if (!isEpisode && existingNames.has(item.name)) {
                    skippedCount++;
                } else if (isEpisode) {
                    // Para episódios, não verificamos duplicados aqui, pois a sincronização de série já faz isso.
                    // Esta parte é para adicionar episódios avulsos.
                    try {
                        await this.baserowManager.api.createRecord(episodesTableId, this.formatItemForBaserow(item, 'episode'));
                        successCount++;
                    } catch (error) { errorCount++; }
                } else {
                    // Adicionar filme novo
                    try {
                        await this.baserowManager.api.createRecord(moviesTableId, this.formatItemForBaserow(item, 'movie'));
                        successCount++;
                    } catch (error) { errorCount++; }
                }
                
                processedCount++;
                const percentage = Math.round((processedCount / this.selectedItems.size) * 100);
                ui.updateProgress(percentage, `Enviando ${processedCount} de ${this.selectedItems.size}...`);
                
                const checkbox = document.getElementById(`item-${item.id}`);
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.disabled = true;
                }
            }

            const message = `🎉 ${successCount} itens adicionados! ` +
                            `${skippedCount > 0 ? `(ℹ️ ${skippedCount} já existiam) ` : ''}` +
                            `${errorCount > 0 ? `(❌ ${errorCount} falharam)` : ''}`;
            
            this.showAlert(message, successCount > 0 ? 'success' : 'info');

            this.selectedItems.clear();
            const selectAllCheckbox = document.getElementById('selectAllItems');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
            
        } catch (error) {
            this.showAlert(`❌ Erro na adição de itens selecionados: ${this.getErrorMessage(error)}`, 'danger');
        } finally {
            ui.hideProgress();
        }
    }

    formatItemForBaserow(item) {
        const itemType = this.getItemTypeForMapping(item);
        const config = this.baserowManager.api.config;
        const mapping = itemType === 'episode' ? config.mapping_episodios : config.mapping_conteudos;
        
        if (!mapping) {
            this.showAlert('Mapeamento de campos não configurado.', 'danger');
            throw new Error('Mapeamento de campos não configurado.');
        }

        return this.fieldMapper.mapItemToBaserow(item, itemType, mapping);
    }

    getItemTypeForMapping(item) {
        if (item.season && item.episode) return 'episode';
        if (item.seriesName) return 'episode';
        return 'movie';
    }

    findItemById(id) {
        for (const movie of this.processedContent.movies) {
            if (movie.id === id) return movie;
        }
        
        for (const series of Object.values(this.processedContent.series)) {
            for (const episode of series.episodes) {
                if (episode.id === id) return episode;
            }
        }
        
        for (const channel of this.processedContent.channels) {
            if (channel.id === id) return channel;
        }
        
        return null;
    }

    toggleSeries(seriesName) {
        const episodesContainer = document.getElementById(`episodes-${this.sanitizeId(seriesName)}`);
        const toggleBtn = document.querySelector(`[data-series-name="${seriesName}"]`);
        
        if (episodesContainer && toggleBtn) {
            const isVisible = episodesContainer.classList.contains('show');
            
            if (isVisible) {
                episodesContainer.classList.remove('show');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Episódios';
            } else {
                episodesContainer.classList.add('show');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar';
            }
        }
    }

    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('selectAllItems');
        const isChecked = selectAllCheckbox.checked;
        this.selectedItems.clear(); // Limpar seleção anterior

        if (isChecked) {
            const activeTabId = document.querySelector('.tab-pane.active')?.id;
            let itemsToSelect = [];

            if (activeTabId === 'movies') {
                itemsToSelect = this.processedContent.movies;
            } else if (activeTabId === 'series') {
                itemsToSelect = Object.values(this.processedContent.series).flatMap(s => s.episodes);
            } else if (activeTabId === 'channels') {
                itemsToSelect = this.processedContent.channels;
            }
            
            console.log(`[M3U] Selecionando todos os ${itemsToSelect.length} itens da aba ${activeTabId}.`);
            itemsToSelect.forEach(item => this.selectedItems.add(item.id));
        }

        // Atualizar a UI para os itens visíveis
        const itemCheckboxes = document.querySelectorAll('.item-checkbox:not(:disabled)');
        itemCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });

        this.showAlert(`${this.selectedItems.size} itens selecionados.`, 'info', 2000);
    }

    handleItemSelection(checkbox) {
        const itemId = checkbox.value;
        if (checkbox.checked) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }

        // Atualizar o estado do checkbox "Selecionar Todos"
        const selectAllCheckbox = document.getElementById('selectAllItems');
        if (selectAllCheckbox) {
            const activeTabId = document.querySelector('.tab-pane.active')?.id;
            let totalItems = 0;
            if (activeTabId === 'movies') {
                totalItems = this.processedContent.movies.length;
            } else if (activeTabId === 'series') {
                totalItems = Object.values(this.processedContent.series).flatMap(s => s.episodes).length;
            } else if (activeTabId === 'channels') {
                totalItems = this.processedContent.channels.length;
            }
            
            if (this.selectedItems.size === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (this.selectedItems.size === totalItems) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
    }

    getEpisodeIdentifier(seriesName, season, episode) {
        const formattedSeason = String(season).padStart(2, '0');
        const formattedEpisode = String(episode).padStart(3, '0');
        return `${seriesName.toLowerCase().trim()}|s${formattedSeason}e${formattedEpisode}`;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    sanitizeId(str) {
        return str.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key] || 'Sem categoria';
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTotalItemsStats() {
        return {
            movies: this.processedContent.movies.length,
            series: Object.keys(this.processedContent.series).length,
            channels: this.processedContent.channels.length,
            total: this.processedContent.movies.length + 
                   Object.values(this.processedContent.series).reduce((sum, series) => sum + series.episodes.length, 0) + 
                   this.processedContent.channels.length
        };
    }

    setLoading(loading, buttonId = null) {
        this.isLoading = loading;
        const buttons = buttonId ? [buttonId] : ['loadXtreamBtn', 'testXtreamBtn'];
        
        buttons.forEach(id => {
            const btn = document.getElementById(id) || document.querySelector(`[data-item-id="${id.replace('add-single-item-', '')}"]`);
            if (btn) {
                btn.disabled = loading;
                if (loading) {
                    btn.dataset.originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Carregando...';
                } else {
                    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
                }
            }
        });

        const loadingIndicator = document.getElementById('m3uLoading');
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
        }

        const otherButtons = document.querySelectorAll('.add-single-item, .add-all-items, #addSelectedItems');
        otherButtons.forEach(btn => {
            btn.disabled = loading;
        });
    }

    updateSendButtonsState(enabled) {
        const buttons = document.querySelectorAll('.add-single-item, .add-all-items, #addSelectedItems');
        buttons.forEach(btn => {
            btn.disabled = !enabled;
            if (!enabled) {
                btn.title = 'Configure o mapeamento de campos primeiro.';
            } else {
                btn.title = ''; // Limpa o title
            }
        });
    }

    showAlert(message, type = 'info') {
        if (this.baserowManager && this.baserowManager.ui) {
            this.baserowManager.ui.showAlert(message, type);
        } else {
            console.log(`[M3U] ${type.toUpperCase()}: ${message}`);
            
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
            alertDiv.innerHTML = `
                ${message.replace(/\n/g, '<br>')}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            const container = document.querySelector('.main-content') || document.body;
            container.insertBefore(alertDiv, container.firstChild);
            
            setTimeout(() => alertDiv.remove(), 5000);
        }
    }
}

export default M3UManager;
