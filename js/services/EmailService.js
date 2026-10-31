/**
 * @fileoverview Serviço de Composição e Envio de E-mails Executivos de Relatório (js/services/EmailService.js)
 */

import { ENV } from '../config/env.js';
import { Logger } from '../core/Logger.js';

/**
 * Serviço responsável por compor o e-mail executivo do relatório mensal,
 * estruturar assuntos e corpos de mensagem de nível corporativo e gerir o envio via mailto: / Webmail / API.
 */
export class EmailService {
    /**
     * Mapeia os códigos de mês (YYYY-MM) para designações formais em português.
     * @param {string} monthFilter - Código do mês (ex: "2026-10") ou "all".
     * @returns {string} Designação legível por humanos (ex: "Outubro de 2026").
     */
    static formatPeriodName(monthFilter) {
        if (!monthFilter || monthFilter === 'all') {
            return 'Todo o Histórico Acumulado';
        }

        const [year, month] = monthFilter.split('-');
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthIdx = parseInt(month, 10) - 1;
        const name = monthNames[monthIdx] || monthFilter;
        return `${name} de ${year}`;
    }

    /**
     * Gera o nome de ficheiro padronizado para o anexo em PDF.
     * @param {Object} report - Objeto consolidado do relatório.
     * @returns {string} Nome do ficheiro PDF (ex: "Relatorio-GoReview-Cafe-Central-Lisboa-2026-10.pdf").
     */
    static buildPdfFilename(report) {
        const cleanSlug = (report.client?.slug || 'empresa').replace(/[^a-zA-Z0-9_-]/g, '-');
        const period = report.monthFilter || 'global';
        return `Relatorio-GoReview-${cleanSlug}-${period}.pdf`;
    }

    /**
     * Constrói o Assunto oficial para o e-mail do cliente.
     * @param {Object} report - Objeto consolidado do relatório.
     * @returns {string} Assunto dinâmico formatado.
     */
    buildExecutiveSubject(report) {
        const periodName = EmailService.formatPeriodName(report.monthFilter);
        return `Envio do Relatório Mensal de Avaliações – ${periodName}`;
    }

    /**
     * Constrói o Corpo completo de texto do e-mail corporativo em padrão executivo.
     * @param {Object} report - Objeto consolidado do relatório.
     * @returns {string} Texto estruturado e formal para envio por e-mail.
     */
    buildExecutiveEmailBody(report) {
        const clientName = report.client?.name || 'Estabelecimento';
        const periodName = EmailService.formatPeriodName(report.monthFilter);
        const pdfFileName = EmailService.buildPdfFilename(report);

        return (
            `Exmo.(a) Gerente e Equipa de Direção do ${clientName},\n` +
            `Esperamos que este e-mail o(a) encontre bem.\n` +
            `Na GoReview, trabalhamos diariamente para ajudar o seu negócio a acompanhar a opinião e a experiência dos seus clientes. É com gosto que partilhamos o Relatório Executivo Mensal de Avaliações relativo ao mês de ${periodName}.\n\n` +
            `DOCUMENTO EM ANEXO: ${pdfFileName}\n\n` +
            `Neste documento vai encontrar o resumo do desempenho do vosso espaço no último mês, incluindo os principais destaques, a evolução da vossa pontuação e a análise detalhada das opiniões deixadas online.\n` +
            `Estamos à inteira disposição para esclarecer qualquer dúvida ou ajudar a analisar estes resultados.\n\n` +
            `Com os melhores cumprimentos,\n` +
            `Equipa GoReview`
        );
    }

    /**
     * Prepara os dados consolidados para o envio de e-mail a partir do relatório.
     * @param {Object} report - Objeto consolidado do relatório.
     * @returns {{ recipient: string, subject: string, body: string, pdfFilename: string }}
     */
    prepareReportEmail(report) {
        const clientEmail = (report.client?.email || '').trim();
        const recipient = clientEmail || 'marcoacteodoro@hotmail.com';
        const subject = this.buildExecutiveSubject(report);
        const body = this.buildExecutiveEmailBody(report);
        const pdfFilename = EmailService.buildPdfFilename(report);

        return {
            recipient,
            subject,
            body,
            pdfFilename
        };
    }

    /**
     * Envia o e-mail executivo de forma 100% automática através da API Gmail SMTP do servidor.
     * @param {Object} report - Objeto consolidado do relatório.
     * @returns {Promise<{ success: boolean, message: string, usedFallback?: boolean, emailData?: Object }>}
     */
    async sendAutomatedEmail(report) {
        const emailData = this.prepareReportEmail(report);
        const endpoint = ENV.EMAIL_SERVICE?.API_ENDPOINT || 'http://localhost:3001/api/send-email';

        try {
            Logger.info('EmailService', `A tentar envio automático via Gmail SMTP (${endpoint})...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: emailData.recipient,
                    subject: emailData.subject,
                    body: emailData.body,
                    pdfFilename: emailData.pdfFilename,
                    report: {
                        clientName: report.client?.name || 'Estabelecimento',
                        clientNif: report.client?.nif || 'N/A',
                        monthFilter: EmailService.formatPeriodName(report.monthFilter),
                        total: report.total || 0,
                        avgRating: report.avgRating || 0,
                        positiveCount: report.positiveCount || 0,
                        positiveRate: report.positiveRate || 0,
                        complaintsCount: report.complaintsCount || 0,
                        starsBreakdown: report.starsBreakdown || report.ratingDistribution || {},
                        ratingDistribution: report.starsBreakdown || report.ratingDistribution || {},
                        complaintsList: (report.complaintsList || []).map((c) => ({
                            rating: c.rating,
                            createdAt: c.createdAt,
                            comment: c.comment,
                            customerContact: c.customerContact
                        }))
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                Logger.info('EmailService', 'E-mail enviado com sucesso via Gmail SMTP:', data);
                return {
                    success: true,
                    message: data.message || `E-mail enviado com sucesso a partir de ${ENV.EMAIL_SERVICE.DEFAULT_SENDER_EMAIL}!`
                };
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Servidor respondeu com código ${response.status}`);
        } catch (apiError) {
            Logger.warn('EmailService', 'Servidor de envio automático indisponível. A recorrer a cliente local:', apiError);
            return {
                success: false,
                message: apiError.message,
                usedFallback: true,
                emailData
            };
        }
    }

    /**
     * Copia texto para a área de transferência com suporte cruzado entre navegadores.
     * @param {string} text - Texto a copiar.
     * @returns {Promise<boolean>} `true` se copiado com sucesso.
     */
    async copyToClipboard(text) {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_) {
            // Fallback para document.execCommand
        }

        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (err) {
            Logger.error('EmailService', 'Falha ao copiar para clipboard:', err);
            return false;
        }
    }
}

