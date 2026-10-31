/**
 * @fileoverview Configurações de Ambiente, Constantes e Dados Mock (js/config/env.js)
 * Centraliza todas as variáveis de configuração, flags de ambiente e dados de fallback.
 */

/**
 * Configurações de ligação ao projeto Supabase.
 * Para forçar o Modo de Demonstração (Mock Mode) local, defina `FORCE_MOCK_MODE: true`.
 */
export const ENV = Object.freeze({
    SUPABASE_URL: 'https://oiwfilizuyirpyrjawgy.supabase.co',
    SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pd2ZpbGl6dXlpcnB5cmphd2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzY0MTcsImV4cCI6MjEwODYxMjQxN30.buOW1OnK-gTr-1yJPLbe2cwgbe91dAYh4t-UbDGF4n4',
    FORCE_MOCK_MODE: false,
    ENABLE_DEBUG_LOGS: true,
    POSITIVE_RATING_THRESHOLD: 4,
    REDIRECT_DELAY_MS: 1200,
    ADMIN_AUTH: Object.freeze({
        USERNAME: 'admin',
        PASSWORD_HASH_SHA256: '7b4fa5e2b2d26c9c8ddd6b989f7b59fad844406e23496caf1d07c704bc23a829',
        MAX_ATTEMPTS: 5,
        LOCKOUT_MS: 60 * 1000,
        SESSION_TTL_MS: 4 * 60 * 60 * 1000 // 4 horas
    }),
    EMAIL_SERVICE: Object.freeze({
        DEFAULT_SENDER_NAME: 'GoReview Customer Success',
        DEFAULT_SENDER_EMAIL: 'reviewgo29@gmail.com',
        API_ENDPOINT: 'http://localhost:3001/api/send-email',
        SUPPORT_URL: 'https://goreview-review.netlify.app'
    }),
    STORAGE_KEYS: Object.freeze({
        CLIENTS: 'goreview_mock_clients_v4',
        REVIEWS: 'goreview_mock_reviews_v3',
        ADMIN_SESSION: 'goreview_admin_session_v1',
        ADMIN_LOCKOUT: 'goreview_admin_lockout_v1'
    })
});

/**
 * Determina dinamicamente se a aplicação deve correr em Mock Mode.
 * @returns {boolean}
 */
export function isMockEnvironment() {
    if (ENV.FORCE_MOCK_MODE) return true;
    return (
        !ENV.SUPABASE_URL ||
        !ENV.SUPABASE_ANON_KEY ||
        ENV.SUPABASE_URL.includes('SEU-PROJETO') ||
        ENV.SUPABASE_ANON_KEY.includes('SUA-CHAVE')
    );
}

/**
 * Flag booleana estática do estado inicial de Mock Mode.
 * @type {boolean}
 */
export const IS_MOCK_MODE = isMockEnvironment();

/**
 * Gera uma data ISO futura somando `days` dias à data atual.
 * @param {number} days - Número de dias a adicionar.
 * @returns {string} Data em formato ISO 8601.
 */
export function addDaysIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

/**
 * Lista de NIFs de teste conhecidos (incluindo o NIF de exemplo 501234567).
 * @type {ReadonlyArray<string>}
 */
export const TEST_NIFS_WHITELIST = Object.freeze([
    '501234567',
    '509123456',
    '510987654',
    '512345678',
    '514567890'
]);

/**
 * Estabelecimentos de demonstração para fallback e testes imediatos.
 */
export const DEFAULT_MOCK_BUSINESSES = Object.freeze([
    {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Café Central Lisboa',
        category: 'Cafetaria & Pastelaria',
        nif: '509123456',
        slug: 'cafe-central',
        email: 'marcoacteodoro@hotmail.com',
        logo_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=240&q=80',
        google_review_url: 'https://www.google.com/maps/search/?api=1&query=Cafe+Central+Lisboa',
        status: 'active',
        trial_ends_at: null,
        active: true,
        created_at: '2026-10-01T09:00:00Z'
    },
    {
        id: '00000000-0000-0000-0000-000000000005',
        name: 'Pastelaria Belém Dourado',
        category: 'Pastelaria Tradicional',
        nif: '501234567',
        slug: 'pastelaria-belem-dourado',
        email: 'belem.dourado@pastelariabelem.pt',
        logo_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=240&q=80',
        google_review_url: 'https://www.google.com/maps/search/?api=1&query=Pastelaria+Belem+Lisboa',
        status: 'trial',
        trial_ends_at: addDaysIso(30),
        active: true,
        created_at: '2026-10-01T09:02:00Z'
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Restaurante O Marinheiro',
        category: 'Restauração & Marisqueira',
        nif: '510987654',
        slug: 'restaurante-marinheiro',
        email: 'reservas@omarinheiro.pt',
        logo_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=240&q=80',
        google_review_url: 'https://www.google.com/maps/search/?api=1&query=Restaurante+O+Marinheiro+Porto',
        status: 'trial',
        trial_ends_at: addDaysIso(24),
        active: true,
        created_at: '2026-10-01T09:05:00Z'
    },
    {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Clínica Dentária Sorriso',
        category: 'Saúde & Medicina Dentária',
        nif: '512345678',
        slug: 'clinica-sorriso',
        email: 'contacto@clinicasorriso.pt',
        logo_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=240&q=80',
        google_review_url: 'https://www.google.com/maps/search/?api=1&query=Clinica+Dentaria+Lisboa',
        status: 'active',
        trial_ends_at: null,
        active: true,
        created_at: '2026-10-01T09:10:00Z'
    },
    {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Barbearia Dom Bigode',
        category: 'Estética & Barbearia',
        nif: '514567890',
        slug: 'barbearia-dom-bigode',
        email: 'geral@dombigode.pt',
        logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=240&q=80',
        google_review_url: 'https://www.google.com/maps/search/?api=1&query=Barbearia+Coimbra',
        status: 'trial',
        trial_ends_at: addDaysIso(30),
        active: true,
        created_at: '2026-10-01T09:15:00Z'
    }
]);

/**
 * Avaliações de demonstração para relatórios mensais em Mock Mode.
 */
export const DEFAULT_MOCK_REVIEWS = Object.freeze([
    { id: 'r-101', client_id: '00000000-0000-0000-0000-000000000001', rating: 5, comment: null, contact_info: null, redirected_to_google: true, created_at: '2026-10-03T09:15:00Z' },
    { id: 'r-102', client_id: '00000000-0000-0000-0000-000000000001', rating: 5, comment: null, contact_info: null, redirected_to_google: true, created_at: '2026-10-05T10:40:00Z' },
    { id: 'r-103', client_id: '00000000-0000-0000-0000-000000000001', rating: 4, comment: null, contact_info: null, redirected_to_google: true, created_at: '2026-10-08T11:20:00Z' },
    { id: 'r-104', client_id: '00000000-0000-0000-0000-000000000001', rating: 2, comment: 'O café veio frio e demoraram 20 minutos a atender na esplanada.', contact_info: 'joao.silva@email.pt', redirected_to_google: false, created_at: '2026-10-11T16:05:00Z' },
    { id: 'r-105', client_id: '00000000-0000-0000-0000-000000000001', rating: 5, comment: null, contact_info: null, redirected_to_google: true, created_at: '2026-10-14T08:50:00Z' },
    { id: 'r-106', client_id: '00000000-0000-0000-0000-000000000001', rating: 3, comment: 'Pastel de nata excelente, mas a música estava demasiado alta no interior.', contact_info: '912 345 678', redirected_to_google: false, created_at: '2026-10-18T15:30:00Z' },
    { id: 'r-107', client_id: '00000000-0000-0000-0000-000000000001', rating: 1, comment: 'Erro na conta ao balcão e pouca simpatia do funcionário da tarde.', contact_info: 'marta.costa@email.pt', redirected_to_google: false, created_at: '2026-10-21T18:10:00Z' },
    { id: 'r-108', client_id: '00000000-0000-0000-0000-000000000001', rating: 5, comment: null, contact_info: null, redirected_to_google: true, created_at: '2026-10-22T09:30:00Z' },
    { id: 'r-109', client_id: '00000000-0000-0000-0000-000000000001', rating: 4, comment: null, contact_info: null, redirected_to_google: true, created_at: '2026-10-23T14:00:00Z' },

    { id: 'r-501', client_id: '00000000-0000-0000-0000-000000000005', rating: 5, comment: null, contact_info: null, redirected_to_google: true, created_at: '2026-10-10T10:00:00Z' },
    { id: 'r-502', client_id: '00000000-0000-0000-0000-000000000005', rating: 4, comment: null, contact_info: null, redirected_to_google: true, created_at: '2026-10-12T11:30:00Z' },
    { id: 'r-503', client_id: '00000000-0000-0000-0000-000000000005', rating: 2, comment: 'Fila muito demorada ao domingo de manhã.', contact_info: 'ana.pereira@email.pt', redirected_to_google: false, created_at: '2026-10-19T11:45:00Z' }
]);

