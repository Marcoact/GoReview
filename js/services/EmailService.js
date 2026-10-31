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
     * Constrói o Assunto oficial de nível executivo para o e-mail do cliente.
     * @param {Object} report - Objeto consolidado do relatório.
     * @returns {string} Assunto profissional formatado.
     */
    buildExecutiveSubject(report) {
        const clientName = report.client?.name || 'Estabelecimento';
        const nif = report.client?.nif ? ` (NIF ${report.client.nif})` : '';
        const periodName = EmailService.formatPeriodName(report.monthFilter);
        return `[GoReview] Relatório Executivo Mensal de Avaliações & Reputação — ${clientName}${nif} • ${periodName}`;
    }

    /**
     * Constrói o Corpo completo de texto do e-mail corporativo em padrão executivo.
     * @param {Object} report - Objeto consolidado do relatório.
     * @returns {string} Texto estruturado e formal para envio por e-mail.
     */
    buildExecutiveEmailBody(report) {
        const client = report.client || {};
        const periodName = EmailService.formatPeriodName(report.monthFilter);
        const pdfFileName = EmailService.buildPdfFilename(report);

        // Formatação das críticas privadas na Caixa de Reclamações
        const complaintsText =
            report.complaintsList && report.complaintsList.length > 0
                ? report.complaintsList
                      .map((c, idx) => {
                          const dateStr = new Date(c.createdAt).toLocaleDateString('pt-PT');
                          const contactStr = c.customerContact ? `Contacto do Cliente: ${c.customerContact}` : 'Sem contacto facultado';
                          return `${idx + 1}. [Classificação: ${c.rating}★ | Data: ${dateStr}]\n` +
                                 `   Feedback Registado: "${c.comment || 'Sem comentário adicional'}"\n` +
                                 `   -> ${contactStr}`;
                      })
                      .join('\n\n')
                : 'Não foram registadas críticas negativas no período em análise. A sua equipa manteve 100% de satisfação!';

        const statusLabel =
            client.status === 'trial'
                ? 'Período Experimental (1º Mês Grátis GoReview)'
                : client.status === 'active'
                ? 'Subscrição Ativa'
                : 'Inativo';

        return (
            `Exmo.(a) Gerente e Equipa de Direção do ${client.name},\n\n` +
            `Esperamos que esta comunicação o(a) encontre bem.\n\n` +
            `Na qualidade de parceiro tecnológico de gestão de reputação e experiência do cliente da GoReview, temos a satisfação de enviar o seu Relatório Executivo Mensal de Avaliações referente a ${periodName}.\n\n` +
            `----------------------------------------------------------------------\n` +
            `DOCUMENTO EM ANEXO: [ ${pdfFileName} ]\n` +
            `Consulte o PDF oficial em anexo com os gráficos 3D de conversão,\n` +
            `estatísticas detalhadas e auditoria do Filtro Ético.\n` +
            `----------------------------------------------------------------------\n\n` +
            `======================================================================\n` +
            `1. RESUMO EXECUTIVO DE INDICADORES (KPIs)\n` +
            `======================================================================\n` +
            `• Estabelecimento: ${client.name}\n` +
            `• NIF: ${client.nif || 'N/A'} | Estado do Serviço: ${statusLabel}\n` +
            `• Total de Avaliações Registadas: ${report.total} interações\n` +
            `• Classificação Média Global: ${report.avgRating.toFixed(1)} / 5.0 ★\n` +
            `• Eficácia do Filtro Ético: ${report.positiveRate}% de satisfação canalizada\n\n` +
            `======================================================================\n` +
            `2. ANÁLISE DE IMPACTO DO FILTRO ÉTICO GOREVIEW\n` +
            `======================================================================\n` +
            `A) REPUTAÇÃO PÚBLICA (GOOGLE MAPS):\n` +
            `   • ${report.positiveCount} clientes (${report.positiveRate}%) atribuíram 4 ou 5 estrelas.\n` +
            `   • Estes clientes foram encaminhados diretamente para a sua página oficial do Google Maps,\n` +
            `     impulsionando a nota pública, o ranking de SEO local e a atração de novos visitantes.\n\n` +
            `B) PROTEÇÃO DE MARCA & RESOLUÇÃO INTERNA:\n` +
            `   • ${report.complaintsCount} clientes registaram notas entre 1 e 3 estrelas.\n` +
            `   • GRAÇAS AO FILTRO ÉTICO GOREVIEW, estas críticas NÃO foram publicadas no Google Maps,\n` +
            `     sendo retidas confidencialmente na sua Caixa de Reclamações privada para ação interna imediata.\n\n` +
            `======================================================================\n` +
            `3. AUDITORIA DE CRÍTICAS E RECLAMAÇÕES RETIDAS (CONFIDENCIAL)\n` +
            `======================================================================\n` +
            `${complaintsText}\n\n` +
            `======================================================================\n` +
            `4. RECOMENDAÇÕES ESTRATÉGICAS GOREVIEW\n` +
            `======================================================================\n` +
            `• Recuperação de Clientes: Recomendamos um contacto de cortesia aos clientes com contacto\n` +
            `  indicado acima, transformando uma experiência menos positiva numa relação de fidelização.\n` +
            `• Formação Contínua: Analisar os pontos operacionais sinalizados nos horários de maior afluência.\n` +
            `• Acesso ao Backoffice: Pode visualizar os gráficos 3D interativos e exportações a qualquer\n` +
            `  momento em: ${ENV.EMAIL_SERVICE?.SUPPORT_URL || 'https://goreview-review.netlify.app'}?admin=true\n\n` +
            `Ficamos à vossa inteira disposição para apoiar a expansão da reputação do vosso negócio.\n\n` +
            `Com os nossos melhores cumprimentos,\n\n` +
            `Equipa de Customer Success & Apoio à Gestão\n` +
            `GoReview — Gestão Ética de Avaliações NFC & Google Maps\n` +
            `E-mail de Suporte: ${ENV.EMAIL_SERVICE?.DEFAULT_SENDER_EMAIL || 'relatorios@goreview.pt'}\n` +
            `Website: ${ENV.EMAIL_SERVICE?.SUPPORT_URL || 'https://goreview-review.netlify.app'}`
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
                        ratingDistribution: report.ratingDistribution || {},
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

