/**
 * @fileoverview Entidade de Domínio da Avaliação / Reclamação (js/models/Review.js)
 */

import { ENV } from '../config/env.js';

/**
 * Representa uma avaliação ou reclamação submetida por um cliente.
 */
export class Review {
    /**
     * @param {Object} params - Propriedades da avaliação.
     * @param {string|null} [params.id=null] - UUID do registo.
     * @param {string} params.businessId - UUID do estabelecimento (`client_id`).
     * @param {number} params.rating - Classificação atribuída de 1 a 5 estrelas.
     * @param {string|null} [params.comment=null] - Comentário ou reclamação privada (1 a 3 estrelas).
     * @param {string|null} [params.customerContact=null] - Contacto opcional do cliente para resposta da gerência.
     * @param {boolean} [params.redirectedToGoogle=false] - Indica se foi encaminhada para o Google Maps.
     * @param {string|null} [params.createdAt=null] - Data ISO da avaliação.
     */
    constructor({
        id = null,
        businessId,
        rating,
        comment = null,
        customerContact = null,
        redirectedToGoogle = false,
        createdAt = null
    }) {
        /** @type {string|null} */
        this.id = id;
        /** @type {string} */
        this.businessId = String(businessId || '').trim();
        /** @type {number} */
        this.rating = Number(rating);
        /** @type {string|null} */
        this.comment = comment ? String(comment).trim() : null;
        /** @type {string|null} */
        this.customerContact = customerContact ? String(customerContact).trim() : null;
        /** @type {boolean} */
        this.redirectedToGoogle = Boolean(redirectedToGoogle);
        /** @type {string} */
        this.createdAt = createdAt || new Date().toISOString();
    }

    /**
     * Verifica se a avaliação é positiva (igual ou superior ao limiar definido, por defeito 4 estrelas).
     * @returns {boolean}
     */
    isPositive() {
        return this.rating >= ENV.POSITIVE_RATING_THRESHOLD;
    }

    /**
     * Converte a instância atual para o formato de colunas da tabela `public.reviews` no Supabase.
     * @returns {Object}
     */
    toDatabase() {
        return {
            client_id: this.businessId,
            rating: this.rating,
            comment: this.comment,
            contact_info: this.customerContact,
            redirected_to_google: this.redirectedToGoogle
        };
    }

    /**
     * Cria uma instância de `Review` a partir de um registo da base de dados (`public.reviews`).
     * @param {Object} row - Linha devolvida pelo Supabase ou Mock Store.
     * @returns {Review}
     */
    static fromDatabase(row) {
        return new Review({
            id: row.id || null,
            businessId: row.client_id ?? row.businessId,
            rating: Number(row.rating),
            comment: row.comment ?? null,
            customerContact: row.contact_info ?? row.customerContact ?? null,
            redirectedToGoogle: Boolean(row.redirected_to_google ?? row.redirectedToGoogle),
            createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString()
        });
    }
}

