/**
 * URLs de Demonstração para M3U Manager
 * Coleção de URLs M3U públicas para teste e demonstração
 */

export const DEMO_M3U_URLS = {
    // Listas de teste públicas (educacionais)
    public: [
        {
            name: "Lista de Exemplo - Filmes",
            url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/br.m3u",
            description: "Lista pública brasileira para testes",
            type: "mixed"
        },
        {
            name: "Lista de Exemplo - Canais",
            url: "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_brazil.m3u8",
            description: "Canais gratuitos brasileiros",
            type: "channels"
        }
    ],
    
    // URLs de exemplo para desenvolvimento
    development: [
        {
            name: "Lista Local de Teste",
            url: "/test-samples/sample-movies.m3u",
            description: "Lista local para desenvolvimento",
            type: "movies"
        },
        {
            name: "Lista Local de Séries",
            url: "/test-samples/sample-series.m3u",
            description: "Lista local com séries para teste",
            type: "series"
        }
    ]
};

/**
 * Estruturas M3U de exemplo para diferentes tipos de conteúdo
 */
export const SAMPLE_M3U_STRUCTURES = {
    // Exemplo de filme
    movie: `#EXTM3U
#EXTINF:-1 tvg-logo="https://exemplo.com/capa1.jpg" group-title="Ação",Filme de Ação
https://exemplo.com/filme1.m3u8
#EXTINF:-1 tvg-logo="https://exemplo.com/capa2.jpg" group-title="Drama",Drama Clássico
https://exemplo.com/filme2.m3u8`,

    // Exemplo de série
    series: `#EXTM3U
#EXTINF:-1 tvg-logo="https://exemplo.com/serie1.jpg" group-title="Séries",Minha Série S01E01 - Piloto
https://exemplo.com/serie1-s01e01.m3u8
#EXTINF:-1 tvg-logo="https://exemplo.com/serie1.jpg" group-title="Séries",Minha Série S01E02 - Segundo Episódio
https://exemplo.com/serie1-s01e02.m3u8
#EXTINF:-1 tvg-logo="https://exemplo.com/serie2.jpg" group-title="Séries",Outra Série 1x01 - Começo
https://exemplo.com/serie2-1x01.m3u8`,

    // Exemplo de canais
    channels: `#EXTM3U
#EXTINF:-1 tvg-logo="https://exemplo.com/canal1.png" group-title="Canais" tvg-country="BR",Canal Nacional
https://exemplo.com/canal1.m3u8
#EXTINF:-1 tvg-logo="https://exemplo.com/canal2.png" group-title="Esportes" tvg-country="BR",Canal Esportivo
https://exemplo.com/canal2.m3u8`,

    // Exemplo misto
    mixed: `#EXTM3U
#EXTINF:-1 tvg-logo="https://exemplo.com/filme.jpg" group-title="Filmes",Super Filme 2024
https://exemplo.com/super-filme.m3u8
#EXTINF:-1 tvg-logo="https://exemplo.com/serie.jpg" group-title="Séries",Série Legal S01E01
https://exemplo.com/serie-legal-s01e01.m3u8
#EXTINF:-1 tvg-logo="https://exemplo.com/canal.png" group-title="TV ao Vivo",Canal de Notícias
https://exemplo.com/canal-noticias.m3u8`
};

/**
 * Configurações de teste para diferentes cenários
 */
export const TEST_SCENARIOS = {
    // Cenário 1: Importação básica de filmes
    basicMovies: {
        name: "Importação Básica de Filmes",
        description: "Teste simples com lista de filmes",
        m3uContent: SAMPLE_M3U_STRUCTURES.movie,
        expectedResults: {
            movies: 2,
            series: 0,
            channels: 0
        },
        tableFields: [
            { name: "Nome", type: "text" },
            { name: "Link", type: "url" },
            { name: "Capa", type: "url" },
            { name: "Categoria", type: "text" }
        ]
    },

    // Cenário 2: Séries com episódios
    seriesWithEpisodes: {
        name: "Séries com Episódios",
        description: "Teste com séries organizadas por temporada",
        m3uContent: SAMPLE_M3U_STRUCTURES.series,
        expectedResults: {
            movies: 0,
            series: 2,
            channels: 0,
            totalEpisodes: 3
        },
        tableFields: [
            { name: "Nome", type: "text" },
            { name: "Link", type: "url" },
            { name: "Serie", type: "text" },
            { name: "Temporada", type: "number" },
            { name: "Episodio", type: "number" }
        ]
    },

    // Cenário 3: Canais ao vivo
    liveChannels: {
        name: "Canais ao Vivo",
        description: "Teste com canais de TV",
        m3uContent: SAMPLE_M3U_STRUCTURES.channels,
        expectedResults: {
            movies: 0,
            series: 0,
            channels: 2
        },
        tableFields: [
            { name: "Nome", type: "text" },
            { name: "Link", type: "url" },
            { name: "Logo", type: "url" },
            { name: "Categoria", type: "text" },
            { name: "Pais", type: "text" }
        ]
    },

    // Cenário 4: Conteúdo misto
    mixedContent: {
        name: "Conteúdo Misto",
        description: "Teste com filmes, séries e canais juntos",
        m3uContent: SAMPLE_M3U_STRUCTURES.mixed,
        expectedResults: {
            movies: 1,
            series: 1,
            channels: 1,
            totalEpisodes: 1
        },
        tableFields: [
            { name: "Nome", type: "text" },
            { name: "Link", type: "url" },
            { name: "Capa", type: "url" },
            { name: "Categoria", type: "text" },
            { name: "Tipo", type: "text" },
            { name: "Temporada", type: "number" },
            { name: "Episodio", type: "number" }
        ]
    }
};

/**
 * Função utilitária para criar blob URLs para testes
 */
export function createTestM3UBlob(scenario) {
    const content = TEST_SCENARIOS[scenario]?.m3uContent || SAMPLE_M3U_STRUCTURES.mixed;
    const blob = new Blob([content], { type: 'application/vnd.apple.mpegurl' });
    return URL.createObjectURL(blob);
}

/**
 * Função para executar teste automatizado
 */
export function runM3UTest(m3uManager, scenario = 'basicMovies') {
    console.log(`[M3U Test] Executando teste: ${scenario}`);
    
    const testData = TEST_SCENARIOS[scenario];
    if (!testData) {
        console.error(`[M3U Test] Cenário não encontrado: ${scenario}`);
        return false;
    }

    try {
        // Simular carregamento de M3U
        const mockPlaylist = m3uManager.parseM3U(testData.m3uContent);
        m3uManager.currentPlaylist = mockPlaylist;
        m3uManager.processContent();
        
        // Verificar resultados
        const results = m3uManager.processedContent;
        const expected = testData.expectedResults;
        
        const success = 
            results.movies.length === expected.movies &&
            Object.keys(results.series).length === expected.series &&
            results.channels.length === expected.channels;
        
        if (success) {
            console.log(`[M3U Test] ✅ Teste ${scenario} passou!`);
            console.log(`[M3U Test] Resultados:`, {
                movies: results.movies.length,
                series: Object.keys(results.series).length,
                channels: results.channels.length
            });
        } else {
            console.error(`[M3U Test] ❌ Teste ${scenario} falhou!`);
            console.error(`[M3U Test] Esperado:`, expected);
            console.error(`[M3U Test] Obtido:`, {
                movies: results.movies.length,
                series: Object.keys(results.series).length,
                channels: results.channels.length
            });
        }
        
        return success;
    } catch (error) {
        console.error(`[M3U Test] Erro no teste ${scenario}:`, error);
        return false;
    }
}

/**
 * Executar todos os testes
 */
export function runAllTests(m3uManager) {
    console.log('[M3U Test] Iniciando bateria de testes...');
    
    const scenarios = Object.keys(TEST_SCENARIOS);
    const results = {};
    
    scenarios.forEach(scenario => {
        results[scenario] = runM3UTest(m3uManager, scenario);
    });
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = scenarios.length;
    
    console.log(`[M3U Test] Testes concluídos: ${passed}/${total} passaram`);
    
    if (passed === total) {
        console.log('[M3U Test] 🎉 Todos os testes passaram!');
    } else {
        console.warn('[M3U Test] ⚠️ Alguns testes falharam');
    }
    
    return results;
}

/**
 * Função para popular campo de URL com exemplo
 */
export function populateWithExample(type = 'mixed') {
    const urlInput = document.getElementById('m3uUrl');
    if (urlInput) {
        const blobUrl = createTestM3UBlob(type);
        urlInput.value = blobUrl;
        urlInput.dispatchEvent(new Event('change'));
        
        // Mostrar dica
        const tooltip = document.createElement('div');
        tooltip.className = 'alert alert-info alert-sm mt-2';
        tooltip.innerHTML = `
            <i class="fas fa-info-circle me-1"></i>
            URL de exemplo carregada! Clique em "Carregar M3U" para testar.
        `;
        
        urlInput.parentNode.appendChild(tooltip);
        
        setTimeout(() => tooltip.remove(), 5000);
    }
}

// Exportar função global para uso no console
if (typeof window !== 'undefined') {
    window.M3UDemo = {
        populateExample: populateWithExample,
        runTests: runAllTests,
        scenarios: TEST_SCENARIOS
    };
}