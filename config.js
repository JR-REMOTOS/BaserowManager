// Configurações dos sites Baserow
const BASEROW_CONFIGS = {
    oficial: {
        name: 'Baserow Oficial',
        apiUrl: 'https://api.baserow.io',
        databaseId: '136515',
        tables: {
            banners: { id: 350829, name: 'Banners' },
            categorias: { id: 350830, name: 'Categorias' },
            conteudos: { id: 350831, name: 'Conteúdos' },
            episodios: { id: 350832, name: 'Episódios' },
            usuarios: { id: 350833, name: 'Usuários' }
        },
        fields: {
            banners: ['Nome', 'Imagem', 'ID', 'Link', 'Externo?', 'Data'],
            categorias: ['Nome'],
            conteudos: ['Nome', 'Capa', 'Categoria', 'Sinopse', 'Link', 'Tipo', 'Temporadas', 'Idioma', 'Views', 'Data'],
            episodios: ['Nome', 'Link', 'Temporada', 'Episódio', 'Data'],
            usuarios: ['Nome', 'Email', 'Senha', 'Logins', 'IMEI', 'Dias', 'Pagamento', 'Hoje', 'Restam']
        }
    },
    vps: {
        name: 'Baserow VPS',
        apiUrl: 'http://basebanco.site',
        databaseId: '128',
        tables: {
            banners: { id: 620, name: 'Banners' },
            canais: { id: 621, name: 'Canais' },
            conteudos: { id: 622, name: 'Conteúdos' },
            episodios: { id: 623, name: 'Episodios' },
            pagamentos: { id: 624, name: 'Pagamentos' },
            planos: { id: 625, name: 'Planos' },
            tvCategoria: { id: 626, name: 'Tv Categoria' },
            usuarios: { id: 627, name: 'Usuários' }
        },
        fields: {
            banners: ['id 2', 'Nome', 'Imagem', 'ID', 'Categoria', 'Link', 'Externo?', 'Data'],
            canais: ['id 2', 'Nome', 'Categoria', 'Capa', 'Link'],
            conteudos: ['id 2', 'Nome', 'Capa', 'Categoria', 'Sinopse', 'Link', 'Tipo', 'Idioma', 'Views', 'Temporadas', 'Favoritos', 'Histórico', 'Data', 'Background', 'Tempo', 'Nota', 'Valor', 'Tipo_Conteudo', 'Meu', 'Destaque', 'Lançamento', 'tmdb', 'Lancamento_destaque'],
            episodios: ['id 2', 'Nome', 'Link', 'Temporada', 'Episódio', 'Histórico', 'Data', 'Plost', 'Nota', 'Cover', 'Duracao', 'Title', 'Data_Lancamento'],
            pagamentos: ['id 2', 'Nome', 'Email', 'txid', 'Valor', 'Created on', 'Plano', 'Status', 'Id'],
            planos: ['id 2', 'name', 'Valor', 'features', 'Periudo', 'description', 'buttonText', 'permission', 'Acesso'],
            tvCategoria: ['id 2', 'Nome', 'Categoria'],
            usuarios: ['id 2', 'Nome', 'Email', 'Senha', 'Logins', 'IMEI', 'Dias', 'Pagamento', 'Hoje', 'Restam', 'Revendedor', 'Data', 'Tipo', 'Status', 'Acesso', 'Created on', 'Vencimento', 'Valor']
        }
    }
};

// Configuração padrão
const DEFAULT_CONFIG = {
    recordsPerPage: 20,
    requestTimeout: 30000,
    maxRetries: 3
};

// Ícones específicos para cada tabela
const TABLE_ICONS = {
    banners: 'fas fa-image',
    categorias: 'fas fa-tags',
    canais: 'fas fa-broadcast-tower',
    conteudos: 'fas fa-film',
    episodios: 'fas fa-play-circle',
    pagamentos: 'fas fa-credit-card',
    planos: 'fas fa-star',
    tvCategoria: 'fas fa-tv',
    usuarios: 'fas fa-users'
};

// URLs de teste comuns para cada site
const QUICK_TEST_URLS = {
    oficial: [
        'https://api.baserow.io',
        'https://app.baserow.io/api',
        'https://baserow.io/api'
    ],
    vps: [
        'http://basebanco.site',
        'http://basebanco.site/api'
    ]
};

// Validações de campo por tipo
const FIELD_VALIDATIONS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/,
    number: /^\d+$/
};

export { BASEROW_CONFIGS, DEFAULT_CONFIG, TABLE_ICONS, QUICK_TEST_URLS, FIELD_VALIDATIONS };