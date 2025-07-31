// m3u-worker.js - Processamento pesado da lista M3U em segundo plano

self.onmessage = function(event) {
    const playlist = event.data;
    const processedContent = processContent(playlist);
    self.postMessage(processedContent);
};

function processContent(playlist) {
    const processed = {
        movies: [],
        series: {},
        channels: []
    };

    if (!playlist) {
        return processed;
    }

    playlist.forEach(item => {
        const category = categorizeItem(item);
        switch (category.type) {
            case 'movie':
                processed.movies.push({
                    ...item,
                    category: category.category || item.group || 'Filmes'
                });
                break;
            case 'series':
                if (!processed.series[category.seriesName]) {
                    processed.series[category.seriesName] = {
                        name: category.seriesName,
                        logo: item.logo,
                        episodes: [],
                        group: item.group || 'Séries'
                    };
                }
                processed.series[category.seriesName].episodes.push({
                    ...item,
                    season: category.season,
                    episode: category.episode,
                    episodeName: category.episodeName,
                    seriesName: category.seriesName
                });
                break;
            case 'channel':
                processed.channels.push({
                    ...item,
                    category: item.group || 'Canais'
                });
                break;
        }
    });

    // Ordenar episódios
    Object.values(processed.series).forEach(series => {
        series.episodes.sort((a, b) => {
            if ((a.season || 0) !== (b.season || 0)) {
                return (a.season || 0) - (b.season || 0);
            }
            return (a.episode || 0) - (b.episode || 0);
        });
    });

    return processed;
}

function categorizeItem(item) {
    const name = (item.name || '').toLowerCase();
    const originalType = item.type || item.originalType || '';

    if (originalType === 'movies') {
        return { type: 'movie', category: item.group || 'Filmes' };
    }
    if (originalType === 'series') {
        return categorizeSeries(item);
    }
    
    // Fallback para categorização baseada no nome
    return categorizeSeries(item, { type: 'movie', category: item.group || 'Filmes' });
}

function categorizeSeries(item, fallback = null) {
    const name = (item.name || '').toLowerCase();
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

    if (item.originalType === 'series') {
        return {
            type: 'series',
            seriesName: item.name || 'Série Desconhecida',
            season: 1,
            episode: 1,
            episodeName: item.name || 'Episódio 1'
        };
    }

    return fallback;
}
