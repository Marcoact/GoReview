/**
 * @fileoverview Entidade de Domínio do Estabelecimento (js/models/Business.js)
 */

import { addDaysIso } from '../config/env.js';

/**
 * Representa um estabelecimento/empresa cliente no domínio GoReview.
 */
export class Business {
    /**
     * @param {Object} params - Propriedades do estabelecimento.
     * @param {string|null} [params.id=null] - UUID único do estabelecimento.
     * @param {string} params.nif - NIF português de 9 dígitos.
     * @param {string} params.name - Nome comercial do estabelecimento.
     * @param {string} [params.slug=''] - Identificador URL amigável.
     * @param {string|null} [params.email=null] - E-mail de contacto para envio de relatórios e notificações.
     * @param {string} [params.category='Estabelecimento'] - Categoria ou ramo de atividade.
     * @param {string|null} [params.logoUrl=null] - URL do logótipo da empresa.
     * @param {string} params.googleReviewUrl - URL oficial de avaliação no Google Maps.
     * @param {'active'|'trial'|'inactive'} [params.status='trial'] - Estado da subscrição (`active`, `trial`, `inactive`).
     * @param {string|null} [params.trialEndsAt=null] - Data ISO de fim do período experimental (1º mês grátis).
     * @param {boolean} [params.isActive=true] - Indica se a Tag NFC do estabelecimento aceita avaliações.
     * @param {string|null} [params.createdAt=null] - Data ISO de criação do registo.
     */
    constructor({
        id = null,
        nif,
        name,
        slug = '',
        email = null,
        category = 'Estabelecimento',
        logoUrl = null,
        googleReviewUrl,
        status = 'trial',
        trialEndsAt = null,
        isActive = true,
        createdAt = null
    }) {
        const resolvedStatus = status || (isActive === false ? 'inactive' : 'active');

        /** @type {string|null} */
        this.id = id;
        /** @type {string} */
        this.nif = String(nif || '').trim();
        /** @type {string} */
        this.name = String(name || '').trim();
        /** @type {string} */
        this.slug = String(slug || '').trim().toLowerCase() || Business.slugify(this.name);
        /** @type {string|null} */
        this.email = email ? String(email).trim().toLowerCase() : null;
        /** @type {string} */
        this.category = String(category || 'Estabelecimento').trim();
        /** @type {string|null} */
        this.logoUrl = logoUrl ? String(logoUrl).trim() : null;
        /** @type {string} */
        this.googleReviewUrl = String(googleReviewUrl || '').trim();
        /** @type {'active'|'trial'|'inactive'} */
        this.status = resolvedStatus;
        /** @type {string|null} */
        this.trialEndsAt = resolvedStatus === 'trial' ? (trialEndsAt || addDaysIso(30)) : null;
        /** @type {boolean} */
        this.isActive = resolvedStatus !== 'inactive' && Boolean(isActive);
        /** @type {string} */
        this.createdAt = createdAt || new Date().toISOString();
    }

    /**
     * Cria uma instância de `Business` a partir de um registo da base de dados (Supabase / snake_case).
     * @param {Object} row - Linha devolvida pela tabela `public.clients`.
     * @returns {Business}
     */
    static fromDatabase(row) {
        if (!row) {
            throw new Error('Registo de base de dados inválido para instanciar Business.');
        }

        const resolvedStatus = row.status || (row.active === false ? 'inactive' : 'active');
        return new Business({
            id: row.id || null,
            nif: row.nif,
            name: row.name,
            slug: row.slug,
            email: row.email ?? null,
            category: row.category || 'Estabelecimento',
            logoUrl: row.logo_url ?? row.logoUrl ?? null,
            googleReviewUrl: row.google_review_url ?? row.googleReviewUrl ?? '',
            status: resolvedStatus,
            trialEndsAt: row.trial_ends_at ?? row.trialEndsAt ?? null,
            isActive: resolvedStatus !== 'inactive' && row.active !== false,
            createdAt: row.created_at ?? row.createdAt ?? null
        });
    }

    /**
     * Converte a instância atual para o formato de colunas da tabela `public.clients` no Supabase.
     * @returns {Object}
     */
    toDatabase() {
        return {
            name: this.name,
            category: this.category,
            nif: this.nif,
            slug: this.slug,
            email: this.email,
            logo_url: this.logoUrl,
            google_review_url: this.googleReviewUrl,
            status: this.status,
            trial_ends_at: this.trialEndsAt,
            active: this.isActive
        };
    }

    /**
     * Gera as iniciais do nome do estabelecimento (ex.: "Café Central" -> "CC").
     * @returns {string}
     */
    getInitials() {
        const initials = this.name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0].toUpperCase())
            .join('');
        return initials || 'GR';
    }

    /**
     * Calcula o número de dias restantes do período experimental gratuito (30 dias).
     * @returns {number}
     */
    getRemainingTrialDays() {
        if (this.status !== 'trial' || !this.trialEndsAt) return 0;
        const diffMs = new Date(this.trialEndsAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    /**
     * Converte um texto num identificador URL amigável (`slug`).
     * @param {string} text - Texto de origem.
     * @returns {string}
     */
    static slugify(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}

