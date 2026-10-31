/**
 * @fileoverview Sistema centralizado de logging para debugging no browser (js/core/Logger.js)
 */

import { ENV } from '../config/env.js';

/**
 * Classe utilitária estática para registo estruturado de eventos na consola (`[INFO]`, `[WARN]`, `[ERROR]`).
 */
export class Logger {
    /**
     * Formata o carimbo de hora atual em formato local.
     * @returns {string}
     */
    static #getTimestamp() {
        return new Date().toLocaleTimeString('pt-PT', { hour12: false });
    }

    /**
     * Regista uma mensagem informativa (`[INFO]`) na consola.
     * @param {string} context - Nome da classe ou módulo emissor.
     * @param {string} message - Mensagem descritiva do evento.
     * @param {*} [payload] - Dados adicionais opcionais para inspeção.
     * @returns {void}
     */
    static info(context, message, payload = undefined) {
        if (!ENV.ENABLE_DEBUG_LOGS) return;
        const prefix = `[INFO][${Logger.#getTimestamp()}][${context}]`;
        if (payload !== undefined) {
            console.info(`%c${prefix}%c ${message}`, 'color:#4f46e5;font-weight:bold', 'color:inherit', payload);
        } else {
            console.info(`%c${prefix}%c ${message}`, 'color:#4f46e5;font-weight:bold', 'color:inherit');
        }
    }

    /**
     * Regista um aviso (`[WARN]`) na consola.
     * @param {string} context - Nome da classe ou módulo emissor.
     * @param {string} message - Mensagem de aviso.
     * @param {*} [payload] - Dados adicionais opcionais.
     * @returns {void}
     */
    static warn(context, message, payload = undefined) {
        const prefix = `[WARN][${Logger.#getTimestamp()}][${context}]`;
        if (payload !== undefined) {
            console.warn(`%c${prefix}%c ${message}`, 'color:#d97706;font-weight:bold', 'color:inherit', payload);
        } else {
            console.warn(`%c${prefix}%c ${message}`, 'color:#d97706;font-weight:bold', 'color:inherit');
        }
    }

    /**
     * Regista um erro crítico ou exceção (`[ERROR]`) na consola.
     * @param {string} context - Nome da classe ou módulo onde ocorreu o erro.
     * @param {string} message - Descrição clara do erro.
     * @param {Error|*} [error] - Objeto de erro ou detalhe técnico.
     * @returns {void}
     */
    static error(context, message, error = undefined) {
        const prefix = `[ERROR][${Logger.#getTimestamp()}][${context}]`;
        if (error !== undefined) {
            console.error(`%c${prefix}%c ${message}`, 'color:#e11d48;font-weight:bold', 'color:inherit', error);
        } else {
            console.error(`%c${prefix}%c ${message}`, 'color:#e11d48;font-weight:bold', 'color:inherit');
        }
    }
}

