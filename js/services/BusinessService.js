/**
 * @fileoverview Serviço de Gestão de Estabelecimentos e Pesquisa por NIF (js/services/BusinessService.js)
 */

import { DEFAULT_MOCK_BUSINESSES, ENV, addDaysIso } from '../config/env.js';
import { Logger } from '../core/Logger.js';
import { SupabaseClient } from '../core/SupabaseClient.js';
import { Business } from '../models/Business.js';
import { ValidatorService } from './ValidatorService.js';

/**
 * Serviço responsável pelas operações de leitura e escrita (CRUD) de estabelecimentos (`Business`).
 */
export class BusinessService {
    /** @type {SupabaseClient} */
    #supabaseClient;

    /**
     * @param {SupabaseClient} [supabaseClientInstance=SupabaseClient.getInstance()] - Instância Singleton do SupabaseClient.
     */
    constructor(supabaseClientInstance = SupabaseClient.getInstance()) {
        this.#supabaseClient = supabaseClientInstance;
    }

    /**
     * Obtém a lista de estabelecimentos guardados localmente em Mock Mode.
     * @returns {Business[]}
     */
    #getMockStore() {
        try {
            const raw = localStorage.getItem(ENV.STORAGE_KEYS.CLIENTS);
            if (!raw) {
                localStorage.setItem(ENV.STORAGE_KEYS.CLIENTS, JSON.stringify(DEFAULT_MOCK_BUSINESSES));
                return DEFAULT_MOCK_BUSINESSES.map((row) => Business.fromDatabase(row));
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
                ? parsed.map((row) => Business.fromDatabase(row))
                : DEFAULT_MOCK_BUSINESSES.map((row) => Business.fromDatabase(row));
        } catch (error) {
            Logger.warn('BusinessService', 'Não foi possível ler o localStorage. A usar Mock Default.', error);
            return DEFAULT_MOCK_BUSINESSES.map((row) => Business.fromDatabase(row));
        }
    }

    /**
     * Guarda a lista de estabelecimentos no armazenamento local (Mock Mode).
     * @param {Business[]} businesses - Lista de modelos Business.
     * @returns {void}
     */
    #saveMockStore(businesses) {
        try {
            const serialized = businesses.map((b) => ({
                id: b.id,
                ...b.toDatabase(),
                created_at: b.createdAt
            }));
            localStorage.setItem(ENV.STORAGE_KEYS.CLIENTS, JSON.stringify(serialized));
        } catch (error) {
            Logger.warn('BusinessService', 'Não foi possível persistir no localStorage.', error);
        }
    }

    /**
     * Procura um estabelecimento pelo seu NIF (ou Slug) com fallback automático para Mock Data.
     * @param {string} identifier - NIF (ex: "501234567") ou Slug do estabelecimento.
     * @returns {Promise<{ business: Business|null, error: string|null }>}
     */
    async getByNif(identifier) {
        const cleanId = ValidatorService.sanitizeText(identifier, 60).toLowerCase();
        Logger.info('BusinessService', `A consultar estabelecimento com identificador: "${cleanId}"`);

        if (!cleanId) {
            return { business: null, error: 'Nenhum NIF ou identificador de empresa foi indicado na URL.' };
        }

        // Se for composto apenas por dígitos, validar através do ValidatorService (9 dígitos + Mod 11 / Whitelist)
        if (/^\d+$/.test(cleanId)) {
            const validation = ValidatorService.validateNif(cleanId, { allowTestNifs: true });
            if (!validation.isValid) {
                Logger.warn('BusinessService', `Validação de NIF falhou para "${cleanId}": ${validation.reason}`);
                return { business: null, error: validation.reason };
            }
        }

        // 1. Modo Mock direto
        if (this.#supabaseClient.isMockMode()) {
            return this.#findInMockByIdentifier(cleanId);
        }

        // 2. Modo Produção (Supabase) com fallback para Mock se for um NIF de demonstração local
        try {
            const db = this.#supabaseClient.getClient();
            const { data, error } = await db
                .from('clients')
                .select('id, name, category, nif, slug, email, logo_url, google_review_url, status, trial_ends_at, active, created_at')
                .or(`nif.eq.${cleanId},slug.eq.${cleanId}`)
                .maybeSingle();

            if (error) {
                Logger.error('BusinessService', 'Erro ao consultar Supabase. A tentar fallback Mock Data.', error);
                return this.#findInMockByIdentifier(cleanId);
            }

            if (!data) {
                // Fallback para Mock Data caso o utilizador esteja a testar um NIF de demonstração (ex: 501234567)
                const mockFallback = this.#findInMockByIdentifier(cleanId);
                if (mockFallback.business) {
                    Logger.info('BusinessService', `NIF "${cleanId}" carregado via Fallback de Demonstração.`);
                    return mockFallback;
                }
                return { business: null, error: `Não foi encontrado nenhum estabelecimento registado com o NIF "${cleanId}".` };
            }

            const business = Business.fromDatabase(data);
            if (!business.isActive || business.status === 'inactive') {
                return {
                    business: null,
                    error: `O estabelecimento "${business.name}" encontra-se atualmente inativo.`
                };
            }

            Logger.info('BusinessService', 'Estabelecimento carregado do Supabase com sucesso.', business);
            return { business, error: null };
        } catch (unexpectedError) {
            Logger.error('BusinessService', 'Exceção inesperada em getByNif. A ativar fallback.', unexpectedError);
            return this.#findInMockByIdentifier(cleanId);
        }
    }

    /**
     * Procura um estabelecimento na lista Mock local.
     * @param {string} cleanId - NIF ou Slug normalizado.
     * @returns {{ business: Business|null, error: string|null }}
     */
    #findInMockByIdentifier(cleanId) {
        const list = this.#getMockStore();
        const found = list.find(
            (b) => b.nif.toLowerCase() === cleanId || b.slug.toLowerCase() === cleanId || b.id === cleanId
        );

        if (!found) {
            return { business: null, error: `Estabelecimento com NIF "${cleanId}" não encontrado.` };
        }

        if (!found.isActive || found.status === 'inactive') {
            return { business: null, error: `O estabelecimento "${found.name}" encontra-se atualmente inativo.` };
        }

        return { business: found, error: null };
    }

    /**
     * Lista todos os estabelecimentos registados (para o Portal Admin ou Diretório de Teste).
     * @param {Object} [options] - Opções de filtragem.
     * @param {boolean} [options.onlyActive=false] - Se `true`, devolve apenas estabelecimentos operacionais (`active` ou `trial`).
     * @returns {Promise<{ businesses: Business[], error: string|null }>}
     */
    async getAll({ onlyActive = false } = {}) {
        if (this.#supabaseClient.isMockMode()) {
            const all = this.#getMockStore();
            const filtered = onlyActive ? all.filter((b) => b.isActive) : all;
            return { businesses: filtered, error: null };
        }

        try {
            const db = this.#supabaseClient.getClient();
            let query = db
                .from('clients')
                .select('id, name, category, nif, slug, email, logo_url, google_review_url, status, trial_ends_at, active, created_at')
                .order('created_at', { ascending: false });

            if (onlyActive) {
                query = query.neq('status', 'inactive');
            }

            const { data, error } = await query;
            if (error) {
                Logger.error('BusinessService', 'Erro ao listar estabelecimentos no Supabase:', error);
                const fallback = this.#getMockStore();
                return { businesses: onlyActive ? fallback.filter((b) => b.isActive) : fallback, error: error.message };
            }

            const businesses = (data || []).map((row) => Business.fromDatabase(row));
            return { businesses, error: null };
        } catch (error) {
            Logger.error('BusinessService', 'Exceção em getAll:', error);
            return { businesses: this.#getMockStore(), error: error.message };
        }
    }

    /**
     * Cria um novo estabelecimento na base de dados (Portal Admin).
     * @param {Object} payload - Dados do novo cliente.
     * @returns {Promise<{ business: Business|null, error: string|null }>}
     */
    async create(payload) {
        const cleanNif = ValidatorService.sanitizeText(payload.nif, 15).replace(/\s+/g, '');
        if (!/^\d{9}$/.test(cleanNif)) {
            return { business: null, error: 'O NIF deve conter exatamente 9 dígitos numéricos.' };
        }

        const googleUrl = ValidatorService.sanitizeText(payload.googleReviewUrl || payload.google_review_url, 500);
        if (!ValidatorService.isValidUrl(googleUrl)) {
            return { business: null, error: 'Indique um endereço URL válido (http:// ou https://) para o Google Maps.' };
        }

        const model = new Business({
            nif: cleanNif,
            name: ValidatorService.sanitizeText(payload.name, 120),
            category: ValidatorService.sanitizeText(payload.category || 'Estabelecimento', 80),
            slug: Business.slugify(payload.slug || payload.name),
            email: payload.email ? ValidatorService.sanitizeText(payload.email, 160).toLowerCase() : null,
            logoUrl: payload.logoUrl || payload.logo_url ? ValidatorService.sanitizeText(payload.logoUrl || payload.logo_url, 500) : null,
            googleReviewUrl: googleUrl,
            status: payload.status || 'trial'
        });

        if (this.#supabaseClient.isMockMode()) {
            const store = this.#getMockStore();
            if (store.some((b) => b.nif === model.nif)) {
                return { business: null, error: `Já existe um estabelecimento com o NIF ${model.nif}.` };
            }
            model.id = crypto.randomUUID ? crypto.randomUUID() : `biz-${Date.now()}`;
            store.unshift(model);
            this.#saveMockStore(store);
            Logger.info('BusinessService', 'Novo estabelecimento criado em Mock Mode:', model);
            return { business: model, error: null };
        }

        try {
            const db = this.#supabaseClient.getClient();
            const { data, error } = await db
                .from('clients')
                .insert([model.toDatabase()])
                .select()
                .single();

            if (error) {
                Logger.error('BusinessService', 'Erro ao criar estabelecimento no Supabase:', error);
                return { business: null, error: error.message || 'Erro ao gravar cliente no Supabase.' };
            }

            const created = Business.fromDatabase(data);
            Logger.info('BusinessService', 'Novo estabelecimento criado no Supabase:', created);
            return { business: created, error: null };
        } catch (error) {
            Logger.error('BusinessService', 'Exceção ao criar estabelecimento:', error);
            return { business: null, error: error.message };
        }
    }

    /**
     * Atualiza os dados de um estabelecimento existente.
     * @param {string} id - UUID do estabelecimento.
     * @param {Object} updates - Campos a atualizar.
     * @returns {Promise<{ business: Business|null, error: string|null }>}
     */
    async update(id, updates) {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = ValidatorService.sanitizeText(updates.name, 120);
        if (updates.category !== undefined) dbUpdates.category = ValidatorService.sanitizeText(updates.category, 80);
        if (updates.nif !== undefined) dbUpdates.nif = ValidatorService.sanitizeText(updates.nif, 15).replace(/\s+/g, '');
        if (updates.slug !== undefined) dbUpdates.slug = Business.slugify(updates.slug);
        if (updates.email !== undefined) {
            dbUpdates.email = updates.email ? ValidatorService.sanitizeText(updates.email, 160).toLowerCase() : null;
        }
        if (updates.logoUrl !== undefined || updates.logo_url !== undefined) {
            const rawLogo = updates.logoUrl ?? updates.logo_url;
            dbUpdates.logo_url = rawLogo ? ValidatorService.sanitizeText(rawLogo, 500) : null;
        }
        if (updates.googleReviewUrl !== undefined || updates.google_review_url !== undefined) {
            dbUpdates.google_review_url = ValidatorService.sanitizeText(
                updates.googleReviewUrl ?? updates.google_review_url,
                500
            );
        }
        if (updates.status !== undefined) {
            dbUpdates.status = updates.status;
            dbUpdates.active = updates.status !== 'inactive';
            if (updates.status === 'trial') {
                dbUpdates.trial_ends_at = addDaysIso(30);
            }
        }

        if (this.#supabaseClient.isMockMode()) {
            const store = this.#getMockStore();
            const idx = store.findIndex((b) => b.id === id);
            if (idx === -1) return { business: null, error: 'Estabelecimento não encontrado.' };

            const current = store[idx];
            const updated = Business.fromDatabase({
                id: current.id,
                ...current.toDatabase(),
                ...dbUpdates,
                created_at: current.createdAt
            });
            store[idx] = updated;
            this.#saveMockStore(store);
            return { business: updated, error: null };
        }

        try {
            const db = this.#supabaseClient.getClient();
            const { data, error } = await db
                .from('clients')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                Logger.error('BusinessService', 'Erro ao atualizar estabelecimento no Supabase:', error);
                return { business: null, error: error.message };
            }
            return { business: Business.fromDatabase(data), error: null };
        } catch (error) {
            Logger.error('BusinessService', 'Exceção ao atualizar estabelecimento:', error);
            return { business: null, error: error.message };
        }
    }

    /**
     * Elimina um estabelecimento pelo seu UUID.
     * @param {string} id - UUID do estabelecimento.
     * @returns {Promise<{ success: boolean, error: string|null }>}
     */
    async delete(id) {
        if (this.#supabaseClient.isMockMode()) {
            const store = this.#getMockStore().filter((b) => b.id !== id);
            this.#saveMockStore(store);
            return { success: true, error: null };
        }

        try {
            const db = this.#supabaseClient.getClient();
            const { error } = await db.from('clients').delete().eq('id', id);
            if (error) {
                Logger.error('BusinessService', 'Erro ao eliminar estabelecimento:', error);
                return { success: false, error: error.message };
            }
            return { success: true, error: null };
        } catch (error) {
            Logger.error('BusinessService', 'Exceção ao eliminar estabelecimento:', error);
            return { success: false, error: error.message };
        }
    }
}

