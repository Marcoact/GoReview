/**
 * @fileoverview Gestor de rotas e parâmetros da URL (js/core/Router.js)
 */

import { Logger } from './Logger.js';

/**
 * Classe responsável por extrair, limpar e validar parâmetros de query string da URL.
 */
export class Router {
    /** @type {URLSearchParams} */
    #searchParams;

    /**
     * Cria uma instância do Router com base na query string atual da janela.
     * @param {string} [searchString=window.location.search] - Query string a analisar.
     */
    constructor(searchString = window.location.search) {
        this.#searchParams = new URLSearchParams(searchString);
    }

    /**
     * Extrai e limpa o parâmetro `?nif=` (ou `?client=` se contiver um NIF numérico).
     * Remove espaços e caracteres invisíveis.
     * @returns {string|null} O NIF limpo ou `null` se não estiver presente na URL.
     */
    getNif() {
        const rawNif = this.#searchParams.get('nif') || this.#searchParams.get('client');
        if (!rawNif) {
            return null;
        }
        const cleaned = rawNif.trim().replace(/\s+/g, '');
        Logger.info('Router', `Parâmetro de identificação extraído da URL: "${cleaned}"`);
        return cleaned || null;
    }

    /**
     * Verifica se a rota atual corresponde ao Portal de Administração Interna (`?admin=true`).
     * @returns {boolean}
     */
    isAdminRoute() {
        return this.#searchParams.has('admin');
    }

    /**
     * Devolve o endereço base da aplicação (sem query string).
     * @returns {string}
     */
    getBaseUrl() {
        return `${window.location.origin}${window.location.pathname}`;
    }

    /**
     * Constrói um link completo para gravar numa Tag NFC com o NIF especificado.
     * @param {string} nif - NIF do estabelecimento.
     * @returns {string} URL completa com `?nif=...`
     */
    buildNfcUrl(nif) {
        const cleanNif = String(nif || '').trim();
        return `${this.getBaseUrl()}?nif=${encodeURIComponent(cleanNif)}`;
    }

    /**
     * Redireciona o navegador para um URL externo (ex.: Google Maps oficial do cliente).
     * @param {string} targetUrl - Endereço de destino.
     * @param {number} [delayMs=0] - Atraso opcional em milissegundos antes do redirecionamento.
     * @returns {void}
     */
    redirectTo(targetUrl, delayMs = 0) {
        if (!targetUrl || typeof targetUrl !== 'string') {
            Logger.error('Router', 'Tentativa de redirecionamento para um URL inválido.', targetUrl);
            return;
        }

        Logger.info('Router', `A agendar redirecionamento para: ${targetUrl} (em ${delayMs}ms)`);
        if (delayMs > 0) {
            window.setTimeout(() => {
                window.location.href = targetUrl;
            }, delayMs);
        } else {
            window.location.href = targetUrl;
        }
    }
}

