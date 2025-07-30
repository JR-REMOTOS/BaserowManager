/**
 * Mapeador de Campos M3U para Baserow
 * Converte um item de uma lista M3U para o formato de dados esperado pelo backend.
 */
class M3UFieldMapper {
    /**
     * Mapeia um item M3U para a estrutura de dados do Baserow.
     * @param {object} item - O item da lista M3U.
     * @param {string} itemType - O tipo de item ('movie' ou 'episode').
     * @param {object} mapping - O objeto de mapeamento definido pelo usuário.
     * @returns {object} - O objeto de dados formatado para o Baserow.
     */
    mapItemToBaserow(item, itemType = 'movie', mapping = {}) {
        const sourceData = {
            'Nome': item.name || item.tvgName || 'Sem Nome',
            'Capa': item.logo || '',
            'Categoria': item.group || 'Geral',
            'Sinopse': item.description || '',
            'Link': item.url || '',
            'Tipo': itemType === 'episode' ? 'Serie' : 'Filme',
            'Idioma': 'DUB',
            'Background': '',
            'Nota': 0,
            'Temporadas': item.season || null,
            'Tempo': item.duration || 0,
            'Valor': 0,
            'Tipo Conteudo': 'Gratuito',
            'Meu': false,
            'Destaque': false,
            'Data de Lançamento': new Date().toISOString().split('T')[0],
            'View': 0,
            'TMDB': '',
            'Episódio': item.episode || null,
        };

        const mappedData = {};
        for (const [key, value] of Object.entries(mapping)) {
            if (value && sourceData.hasOwnProperty(key)) {
                mappedData[value] = sourceData[key];
            }
        }

        return mappedData;
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