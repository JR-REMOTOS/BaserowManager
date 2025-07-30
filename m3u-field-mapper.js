/**
 * Mapeador de Campos M3U para Baserow
 * Converte um item de uma lista M3U para o formato de dados esperado pelo backend.
 */
class M3UFieldMapper {
    /**
     * Mapeia um item M3U para a estrutura de dados do Baserow.
     * @param {object} item - O item da lista M3U.
     * @param {string} itemType - O tipo de item ('movie' ou 'episode').
     * @returns {object} - O objeto de dados formatado para o Baserow.
     */
    mapItemToBaserow(item, itemType = 'movie') {
        if (itemType === 'episode') {
            return this.mapEpisode(item);
        }
        return this.mapMovie(item);
    }

    /**
     * Mapeia um item do tipo Filme ou Série.
     * @param {object} item - O item da lista M3U.
     * @returns {object} - O objeto de dados para a tabela de filmes/conteúdos.
     */
    mapMovie(item) {
        return {
            'Nome': item.name || item.tvgName || 'Sem Nome',
            'Views': 0,
            'Capa': item.logo || '',
            'Categoria': item.group || 'Geral',
            'Sinopse': item.description || '', // O M3U padrão não tem sinopse
            'Tipo': 'Filme', // Assumindo 'Filme' como padrão
            'Temporadas': null, // Não aplicável para filmes
            'Idioma': 'DUB', // Valor padrão, como no código PHP
            'VideoURL': item.url || '', // URL original do stream
            'Link': item.url || '' // Link do stream
        };
    }

    /**
     * Mapeia um item do tipo Episódio.
     * @param {object} item - O item da lista M3U (episódio).
     * @returns {object} - O objeto de dados para a tabela de episódios.
     */
    mapEpisode(item) {
        return {
            'VideoURL': item.url || '',
            'Link': item.url || '',
            'Nome': item.seriesName || 'Série Desconhecida',
            'Temporada': item.season || 1,
            'Episódio': item.episode || 1,
        };
    }

    /**
     * Prepara os dados para a entrada principal da série (na tabela de filmes/conteúdos).
     * @param {object} series - O objeto da série.
     * @returns {Array} - Um array de objetos, um para cada temporada.
     */
    mapSeriesHeader(series) {
        const seriesData = [];
        const seasons = [...new Set(series.episodes.map(ep => ep.season || 1))]; // Pega temporadas únicas

        for (const season of seasons) {
            seriesData.push({
                'Nome': series.name,
                'Views': 0,
                'Capa': series.logo || (series.episodes[0] ? series.episodes[0].logo : ''),
                'Categoria': series.group || 'Séries',
                'Sinopse': '', // O M3U padrão não tem sinopse
                'Tipo': 'Serie',
                'Temporadas': season,
                'Idioma': 'DUB' // Valor padrão
            });
        }
        return seriesData;
    }
}

export default M3UFieldMapper;