/**
 * @fileoverview Serviço de Autenticação e Controlo de Sessão do Administrador (js/services/AuthService.js)
 */

import { ENV } from '../config/env.js';
import { Logger } from '../core/Logger.js';
import { ValidatorService } from './ValidatorService.js';

/**
 * Serviço responsável por autenticar o administrador (`admin` / `GoReview7032!`),
 * proteger contra ataques de força bruta (rate limiting) e gerir a sessão ativa.
 */
export class AuthService {
    /**
     * Verifica se existe uma sessão de administrador válida e não expirada.
     * @returns {boolean}
     */
    isAuthenticated() {
        try {
            const raw = sessionStorage.getItem(ENV.STORAGE_KEYS.ADMIN_SESSION);
            if (!raw) return false;

            const session = JSON.parse(raw);
            if (!session || !session.expiresAt || session.username !== ENV.ADMIN_AUTH.USERNAME) {
                this.logout();
                return false;
            }

            if (Date.now() > Number(session.expiresAt)) {
                Logger.warn('AuthService', 'Sessão de administrador expirada.');
                this.logout();
                return false;
            }

            return true;
        } catch (error) {
            Logger.error('AuthService', 'Erro ao validar sessão de administrador:', error);
            return false;
        }
    }

    /**
     * Verifica se o login está temporariamente bloqueado devido a excesso de tentativas falhadas.
     * @returns {number} Segundos restantes de bloqueio (0 se não estiver bloqueado).
     */
    getLockoutRemainingSeconds() {
        try {
            const raw = sessionStorage.getItem(ENV.STORAGE_KEYS.ADMIN_LOCKOUT);
            if (!raw) return 0;

            const state = JSON.parse(raw);
            if (!state.lockedUntil) return 0;

            const remainingMs = Number(state.lockedUntil) - Date.now();
            if (remainingMs <= 0) {
                sessionStorage.removeItem(ENV.STORAGE_KEYS.ADMIN_LOCKOUT);
                return 0;
            }

            return Math.ceil(remainingMs / 1000);
        } catch (_) {
            return 0;
        }
    }

    /**
     * Regista uma tentativa falhada de login e ativa o bloqueio temporário se atingir o limite.
     * @returns {{ attempts: number, lockedSeconds: number }}
     */
    #registerFailedAttempt() {
        try {
            const raw = sessionStorage.getItem(ENV.STORAGE_KEYS.ADMIN_LOCKOUT);
            const current = raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
            const attempts = (Number(current.attempts) || 0) + 1;

            let lockedUntil = null;
            if (attempts >= ENV.ADMIN_AUTH.MAX_ATTEMPTS) {
                lockedUntil = Date.now() + ENV.ADMIN_AUTH.LOCKOUT_MS;
                Logger.warn('AuthService', `Conta bloqueada temporariamente após ${attempts} tentativas falhadas.`);
            }

            sessionStorage.setItem(
                ENV.STORAGE_KEYS.ADMIN_LOCKOUT,
                JSON.stringify({ attempts, lockedUntil })
            );

            return {
                attempts,
                lockedSeconds: lockedUntil ? Math.ceil(ENV.ADMIN_AUTH.LOCKOUT_MS / 1000) : 0
            };
        } catch (_) {
            return { attempts: 1, lockedSeconds: 0 };
        }
    }

    /**
     * Limpa o contador de tentativas falhadas após um login com sucesso.
     * @returns {void}
     */
    #clearFailedAttempts() {
        try {
            sessionStorage.removeItem(ENV.STORAGE_KEYS.ADMIN_LOCKOUT);
        } catch (_) {
            // Ignorar
        }
    }

    /**
     * Calcula o hash SHA-256 hexadecimal de uma string (Web Crypto API com fallback para contextos HTTP locais).
     * @param {string} text - Texto de entrada.
     * @returns {Promise<string>} Hash SHA-256 em hexadecimal.
     */
    async #sha256Hex(text) {
        if (window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        }

        // Fallback caso esteja a correr em IP local HTTP sem Web Crypto API
        return text === 'GoReview7032!' ? ENV.ADMIN_AUTH.PASSWORD_HASH_SHA256 : 'invalid';
    }

    /**
     * Autentica o utilizador com nome de utilizador e palavra-passe.
     * @param {string} username - Nome de utilizador inserido.
     * @param {string} password - Palavra-passe inserida.
     * @returns {Promise<{ success: boolean, error: string|null }>}
     */
    async login(username, password) {
        const lockSeconds = this.getLockoutRemainingSeconds();
        if (lockSeconds > 0) {
            return {
                success: false,
                error: `Demasiadas tentativas falhadas. Aguarde ${lockSeconds} segundos antes de tentar novamente.`
            };
        }

        const cleanUser = ValidatorService.sanitizeText(username, 60);
        const rawPassword = String(password ?? '');

        if (!cleanUser || !rawPassword) {
            return {
                success: false,
                error: 'Por favor, preencha o utilizador e a palavra-passe.'
            };
        }

        const passwordHash = await this.#sha256Hex(rawPassword);
        const isUserValid = cleanUser === ENV.ADMIN_AUTH.USERNAME;
        const isPasswordValid = passwordHash === ENV.ADMIN_AUTH.PASSWORD_HASH_SHA256;

        if (!isUserValid || !isPasswordValid) {
            const { attempts, lockedSeconds } = this.#registerFailedAttempt();
            Logger.warn('AuthService', `Tentativa de login inválida para o utilizador "${cleanUser}" (${attempts}/${ENV.ADMIN_AUTH.MAX_ATTEMPTS}).`);

            if (lockedSeconds > 0) {
                return {
                    success: false,
                    error: `Limite de tentativas excedido. Acesso bloqueado por ${lockedSeconds} segundos.`
                };
            }

            const remaining = Math.max(0, ENV.ADMIN_AUTH.MAX_ATTEMPTS - attempts);
            return {
                success: false,
                error: `Credenciais inválidas. Verifique o utilizador e a palavra-passe (${remaining} tentativa(s) restante(s)).`
            };
        }

        this.#clearFailedAttempts();

        const sessionPayload = {
            username: ENV.ADMIN_AUTH.USERNAME,
            authenticatedAt: new Date().toISOString(),
            expiresAt: Date.now() + ENV.ADMIN_AUTH.SESSION_TTL_MS
        };

        try {
            sessionStorage.setItem(ENV.STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(sessionPayload));
        } catch (error) {
            Logger.error('AuthService', 'Não foi possível guardar a sessão no sessionStorage.', error);
        }

        Logger.info('AuthService', 'Administrador autenticado com sucesso.');
        return { success: true, error: null };
    }

    /**
     * Termina a sessão atual de administrador.
     * @returns {void}
     */
    logout() {
        try {
            sessionStorage.removeItem(ENV.STORAGE_KEYS.ADMIN_SESSION);
            Logger.info('AuthService', 'Sessão de administrador terminada.');
        } catch (_) {
            // Ignorar
        }
    }
}

