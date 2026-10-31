/**
 * @fileoverview Serviço de Lógica do Filtro Ético, Gravação de Avaliações e Relatórios (js/services/ReviewService.js)
 */

import { DEFAULT_MOCK_REVIEWS, ENV } from '../config/env.js';
import { Logger } from '../core/Logger.js';
import { SupabaseClient } from '../core/SupabaseClient.js';
import { Review } from '../models/Review.js';
import { ValidatorService } from './ValidatorService.js';

/**
 * Serviço responsável pela regra de negócio do "Filtro Ético" e persistência de avaliações.
 */
export class ReviewService {
    /** @type {SupabaseClient} */
    #supabaseClient;

    /**
     * @param {SupabaseClient} [supabaseClientInstance=SupabaseClient.getInstance()] - Instância Singleton do SupabaseClient.
     */
    constructor(supabaseClientInstance = SupabaseClient.getInstance()) {
        this.#supabaseClient = supabaseClientInstance;
    }

    /**
     * Avalia a classificação escolhida pelo utilizador segundo a regra do "Filtro Ético".
     * - 4 ou 5 estrelas: Positiva -> grava imediatamente e redireciona para o Google Maps.
     * - 1, 2 ou 3 estrelas: Retida -> bloqueia redirecionamento e abre a Caixa de Reclamações Interna.
     * @param {number} rating - Classificação de 1 a 5 estrelas.
     * @returns {{ isValid: boolean, isPositive: boolean, shouldRedirectToGoogle: boolean, shouldOpenPrivateForm: boolean }}
     */
    processRating(rating) {
        const numericRating = Number(rating);
        const isValid = ValidatorService.isValidRating(numericRating);

        if (!isValid) {
            Logger.warn('ReviewService', `Classificação inválida recebida em processRating: ${rating}`);
            return {
                isValid: false,
                isPositive: false,
                shouldRedirectToGoogle: false,
                shouldOpenPrivateForm: false
            };
        }

        const isPositive = numericRating >= ENV.POSITIVE_RATING_THRESHOLD;
        Logger.info(
            'ReviewService',
            `Filtro Ético processou ${numericRating}★ -> ${isPositive ? 'Redirecionar Google Maps' : 'Abrir Caixa de Reclamações'}`
        );

        return {
            isValid: true,
            isPositive,
            shouldRedirectToGoogle: isPositive,
            shouldOpenPrivateForm: !isPositive
        };
    }

    /**
     * Persiste uma instância de `Review` na base de dados Supabase (com fallback para Mock Store).
     * @param {Review} reviewModel - Instância do modelo `Review`.
     * @returns {Promise<{ success: boolean, error: string|null }>}
     */
    async submitReview(reviewModel) {
        if (!(reviewModel instanceof Review)) {
            throw new Error('O parâmetro enviado para submitReview deve ser uma instância da classe Review.');
        }

        if (!ValidatorService.isValidRating(reviewModel.rating)) {
            return { success: false, error: 'A classificação deve ser um valor inteiro entre 1 e 5 estrelas.' };
        }

        // Sanitizar inputs de texto contra XSS antes de persistir
        reviewModel.comment = reviewModel.comment ? ValidatorService.sanitizeText(reviewModel.comment, 1000) : null;
        reviewModel.customerContact = reviewModel.customerContact
            ? ValidatorService.sanitizeText(reviewModel.customerContact, 160)
            : null;

        const payload = reviewModel.toDatabase();
        Logger.info('ReviewService', 'A submeter avaliação:', payload);

        if (this.#supabaseClient.isMockMode()) {
            this.#saveToMockReviews(payload);
            return { success: true, error: null };
        }

        try {
            const db = this.#supabaseClient.getClient();
            const { error } = await db.from('reviews').insert([payload]);

            if (error) {
                Logger.error('ReviewService', 'Falha ao gravar avaliação no Supabase. A guardar em Mock Store.', error);
                this.#saveToMockReviews(payload);
                return { success: true, error: null };
            }

            Logger.info('ReviewService', 'Avaliação registada com sucesso no Supabase.');
            return { success: true, error: null };
        } catch (unexpectedError) {
            Logger.error('ReviewService', 'Exceção em submitReview:', unexpectedError);
            this.#saveToMockReviews(payload);
            return { success: true, error: null };
        }
    }

    /**
     * Guarda um registo de avaliação no armazenamento local (Mock Mode).
     * @param {Object} dbRecord - Registo formatado para a tabela `reviews`.
     * @returns {void}
     */
    #saveToMockReviews(dbRecord) {
        try {
            const raw = localStorage.getItem(ENV.STORAGE_KEYS.REVIEWS);
            const list = raw ? JSON.parse(raw) : [];
            list.unshift({
                id: crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}`,
                ...dbRecord,
                created_at: new Date().toISOString()
            });
            localStorage.setItem(ENV.STORAGE_KEYS.REVIEWS, JSON.stringify(list.slice(0, 300)));
        } catch (error) {
            Logger.warn('ReviewService', 'Não foi possível guardar avaliação no localStorage.', error);
        }
    }

    /**
     * Gera o relatório mensal agregado e a query SQL de um estabelecimento.
     * @param {import('../models/Business.js').Business} business - Instância do estabelecimento.
     * @param {string} [monthFilter='2026-10'] - Filtro de mês (`YYYY-MM`) ou `'all'`.
     * @returns {Promise<{ report: Object|null, error: string|null }>}
     */
    async getMonthlyReport(business, monthFilter = '2026-10') {
        Logger.info('ReviewService', `A gerar relatório mensal para "${business.name}" (${monthFilter})`);
        let rawReviews = [];

        if (!this.#supabaseClient.isMockMode()) {
            try {
                const db = this.#supabaseClient.getClient();
                const { data, error } = await db
                    .from('reviews')
                    .select('id, client_id, rating, comment, contact_info, redirected_to_google, created_at')
                    .eq('client_id', business.id)
                    .order('created_at', { ascending: false });

                if (!error && Array.isArray(data)) {
                    rawReviews = data;
                }
            } catch (error) {
                Logger.warn('ReviewService', 'Falha ao obter reviews do Supabase; a usar dados locais.', error);
            }
        }

        // Fallback para Mock Reviews caso a empresa seja de demonstração local ou esteja em Mock Mode
        if (rawReviews.length === 0) {
            try {
                const localRaw = JSON.parse(localStorage.getItem(ENV.STORAGE_KEYS.REVIEWS) || '[]');
                const combined = [...localRaw, ...DEFAULT_MOCK_REVIEWS];
                rawReviews = combined.filter((r) => r.client_id === business.id);
            } catch (_) {
                rawReviews = DEFAULT_MOCK_REVIEWS.filter((r) => r.client_id === business.id);
            }
        }

        let reviews = rawReviews.map((row) => Review.fromDatabase(row));
        if (monthFilter && monthFilter !== 'all') {
            reviews = reviews.filter((r) => (r.createdAt || '').startsWith(monthFilter));
        }

        reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const total = reviews.length;
        const sumRatings = reviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = total > 0 ? Number((sumRatings / total).toFixed(2)) : 0;

        /** @type {Record<number, number>} */
        const starsBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            if (starsBreakdown[r.rating] !== undefined) {
                starsBreakdown[r.rating] += 1;
            }
        });

        const positiveCount = starsBreakdown[4] + starsBreakdown[5];
        const complaintsCount = starsBreakdown[1] + starsBreakdown[2] + starsBreakdown[3];
        const complaintsList = reviews.filter((r) => !r.isPositive());

        return {
            report: {
                client: business,
                monthFilter,
                generatedAt: new Date().toISOString(),
                total,
                avgRating,
                positiveCount,
                complaintsCount,
                positiveRate: total > 0 ? Math.round((positiveCount / total) * 100) : 0,
                starsBreakdown,
                complaintsList,
                allReviews: reviews,
                sqlQuery: this.buildReportSqlQuery(business, monthFilter)
            },
            error: null
        };
    }

    /**
     * Constrói a query SQL oficial para extração do relatório no Supabase.
     * @param {import('../models/Business.js').Business} business - Estabelecimento alvo.
     * @param {string} [monthFilter='all'] - Mês no formato `YYYY-MM` ou `'all'`.
     * @returns {string} Script SQL formatado.
     */
    buildReportSqlQuery(business, monthFilter = 'all') {
        const whereMonth =
            monthFilter && monthFilter !== 'all'
                ? `\n  AND to_char(r.created_at, 'YYYY-MM') = '${monthFilter}'`
                : '';

        return `-- ============================================================================
-- Relatório Mensal GoReview — ${business.name} (NIF: ${business.nif})
-- Período: ${monthFilter === 'all' ? 'Histórico Completo' : monthFilter}
-- ============================================================================

-- 1. Métricas Agregadas e Distribuição de Estrelas
SELECT
    c.name AS estabelecimento,
    c.nif,
    c.status AS estado_conta,
    COUNT(r.id) AS total_avaliacoes,
    ROUND(AVG(r.rating)::numeric, 2) AS media_estrelas,
    COUNT(r.id) FILTER (WHERE r.rating >= 4) AS enviadas_google_maps,
    COUNT(r.id) FILTER (WHERE r.rating <= 3) AS retidas_caixa_reclamacoes,
    COUNT(r.id) FILTER (WHERE r.rating = 5) AS estrelas_5,
    COUNT(r.id) FILTER (WHERE r.rating = 4) AS estrelas_4,
    COUNT(r.id) FILTER (WHERE r.rating = 3) AS estrelas_3,
    COUNT(r.id) FILTER (WHERE r.rating = 2) AS estrelas_2,
    COUNT(r.id) FILTER (WHERE r.rating = 1) AS estrelas_1
FROM public.clients c
LEFT JOIN public.reviews r ON r.client_id = c.id
WHERE c.nif = '${business.nif}'${whereMonth}
GROUP BY c.id, c.name, c.nif, c.status;

-- 2. Listagem Detalhada de Críticas e Feedbacks Internos (1 a 3 Estrelas)
SELECT
    to_char(r.created_at, 'DD/MM/YYYY HH24:MI') AS data_hora,
    r.rating AS classificacao,
    r.comment AS critica_feedback,
    COALESCE(r.contact_info, 'Anónimo') AS contacto_cliente
FROM public.reviews r
JOIN public.clients c ON c.id = r.client_id
WHERE c.nif = '${business.nif}'
  AND r.rating <= 3${whereMonth}
ORDER BY r.created_at DESC;`;
    }
}

