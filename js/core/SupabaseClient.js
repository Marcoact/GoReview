/**
 * @fileoverview Singleton de gestão da instância e ligação ao Supabase (js/core/SupabaseClient.js)
 */

import { ENV, isMockEnvironment } from '../config/env.js';
import { Logger } from './Logger.js';

/**
 * Classe Singleton responsável por inicializar e fornecer a instância única do cliente Supabase.
 */
export class SupabaseClient {
    /** @type {SupabaseClient|null} */
    static #instance = null;

    /** @type {Object|null} */
    #client = null;

    /** @type {boolean} */
    #mockMode = false;

    /**
     * Construtor privado do Singleton.
     * Inicializa o SDK do Supabase ou ativa o Mock Mode caso não esteja configurado.
     */
    constructor() {
        if (SupabaseClient.#instance) {
            throw new Error('Use SupabaseClient.getInstance() em vez de instanciar com new.');
        }

        this.#initialize();
    }

    /**
     * Devolve a instância única (Singleton) de `SupabaseClient`.
     * @returns {SupabaseClient}
     */
    static getInstance() {
        if (!SupabaseClient.#instance) {
            SupabaseClient.#instance = new SupabaseClient();
        }
        return SupabaseClient.#instance;
    }

    /**
     * Inicializa a ligação ao Supabase ou ativa o modo de demonstração (Mock Mode).
     * @returns {void}
     */
    #initialize() {
        try {
            if (isMockEnvironment()) {
                this.#mockMode = true;
                Logger.warn(
                    'SupabaseClient',
                    'Credenciais Supabase em modo demonstração. A utilizar Mock Mode local.'
                );
                return;
            }

            if (!window.supabase || typeof window.supabase.createClient !== 'function') {
                this.#mockMode = true;
                Logger.warn(
                    'SupabaseClient',
                    'SDK @supabase/supabase-js indisponível na janela global. Fallback automático para Mock Mode.'
                );
                return;
            }

            this.#client = window.supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
            this.#mockMode = false;
            Logger.info('SupabaseClient', 'Ligação ao Supabase inicializada com sucesso.', {
                url: ENV.SUPABASE_URL
            });
        } catch (error) {
            this.#mockMode = true;
            Logger.error('SupabaseClient', 'Falha ao inicializar cliente Supabase. A ativar Mock Mode.', error);
        }
    }

    /**
     * Devolve o cliente nativo do Supabase (`@supabase/supabase-js`) ou `null` se estiver em Mock Mode.
     * @returns {Object|null}
     */
    getClient() {
        return this.#client;
    }

    /**
     * Indica se a aplicação está a correr em Modo de Demonstração (Mock Mode).
     * @returns {boolean}
     */
    isMockMode() {
        return this.#mockMode || !this.#client;
    }
}

