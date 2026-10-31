/**
 * @fileoverview Serviço de Validação de NIF (Módulo 11) e Sanitização contra XSS (js/services/ValidatorService.js)
 */

import { TEST_NIFS_WHITELIST } from '../config/env.js';
import { Logger } from '../core/Logger.js';

/**
 * Serviço responsável por validar NIFs portugueses (algoritmo Módulo 11) e sanitizar inputs de texto.
 */
export class ValidatorService {
    /**
     * Valida estritamente o algoritmo Módulo 11 de um NIF português de 9 dígitos.
     * @param {string} nif - NIF com 9 dígitos numéricos.
     * @returns {boolean} `true` se o dígito de controlo respeitar o algoritmo Módulo 11.
     */
    static isValidModulo11(nif) {
        const clean = String(nif || '').trim();
        if (!/^\d{9}$/.test(clean)) {
            return false;
        }

        const digits = clean.split('').map(Number);
        let sum = 0;
        for (let i = 0; i < 8; i++) {
            sum += digits[i] * (9 - i);
        }

        const remainder = sum % 11;
        const expectedCheckDigit = remainder < 2 ? 0 : 11 - remainder;
        return digits[8] === expectedCheckDigit;
    }

    /**
     * Valida um NIF português (9 dígitos numéricos + algoritmo Módulo 11 ou NIF de demonstração autorizado).
     * @param {string} nif - NIF a validar.
     * @param {Object} [options] - Opções adicionais.
     * @param {boolean} [options.allowTestNifs=true] - Permitir NIFs de demonstração presentes na whitelist.
     * @returns {{ isValid: boolean, cleanNif: string, isTestNif: boolean, reason: string|null }}
     */
    static validateNif(nif, { allowTestNifs = true } = {}) {
        const cleanNif = String(nif || '').trim().replace(/\s+/g, '');

        if (!/^\d{9}$/.test(cleanNif)) {
            return {
                isValid: false,
                cleanNif,
                isTestNif: false,
                reason: 'O NIF deve conter exatamente 9 dígitos numéricos.'
            };
        }

        const passesModulo11 = ValidatorService.isValidModulo11(cleanNif);
        if (passesModulo11) {
            return {
                isValid: true,
                cleanNif,
                isTestNif: false,
                reason: null
            };
        }

        if (allowTestNifs && TEST_NIFS_WHITELIST.includes(cleanNif)) {
            Logger.warn(
                'ValidatorService',
                `NIF "${cleanNif}" aceite através da Whitelist de Demonstração (dígito de controlo de teste).`
            );
            return {
                isValid: true,
                cleanNif,
                isTestNif: true,
                reason: null
            };
        }

        return {
            isValid: false,
            cleanNif,
            isTestNif: false,
            reason: `O NIF "${cleanNif}" falhou na validação do dígito de controlo (Módulo 11).`
        };
    }

    /**
     * Sanitiza uma string de entrada do utilizador removendo tags HTML/scripts maliciosos (prevenção de XSS).
     * @param {string|null|undefined} input - Texto inserido pelo utilizador.
     * @param {number} [maxLength=1000] - Comprimento máximo permitido.
     * @returns {string} Texto limpo e seguro.
     */
    static sanitizeText(input, maxLength = 1000) {
        if (input === null || input === undefined) {
            return '';
        }

        return String(input)
            .replace(/<[^>]*>?/gm, '') // Remove tags HTML
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove caracteres de controlo
            .trim()
            .slice(0, maxLength);
    }

    /**
     * Valida se uma classificação de estrelas é um número inteiro entre 1 e 5.
     * @param {number|string} rating - Valor da classificação.
     * @returns {boolean}
     */
    static isValidRating(rating) {
        const num = Number(rating);
        return Number.isInteger(num) && num >= 1 && num <= 5;
    }

    /**
     * Valida se uma string corresponde a um endereço URL HTTP/HTTPS válido.
     * @param {string} urlString - URL a validar.
     * @returns {boolean}
     */
    static isValidUrl(urlString) {
        try {
            const parsed = new URL(String(urlString || '').trim());
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
}

