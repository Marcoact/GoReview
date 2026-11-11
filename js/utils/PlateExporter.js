/**
 * @fileoverview Exportador de Placas de Mesa Oficiais em Alta Resolução (300 DPI) para Gráficas (js/utils/PlateExporter.js)
 * Reproduz o design de luxo (Marfim, Ouro Champagne e Ardósia) com logotipo dinâmico e QR Code nativo.
 */

import { QRCode } from './QRCode.js';

export class PlateExporter {
    /**
     * Gera e transfere um ficheiro PNG em ultra-alta definição (1800 x 2600 px) pronto para gráfica/impressão em acrílico.
     * @param {Object} options
     * @param {import('../models/Business.js').Business} options.business - Dados da empresa.
     * @param {string} options.url - URL oficial gravada no QR Code e na tag NFC.
     * @returns {Promise<void>}
     */
    static async exportToPng({ business, url }) {
        const canvas = document.createElement('canvas');
        canvas.width = 1800;
        canvas.height = 2600;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Fundo Marfim Elegante (#FAF8F5)
        ctx.fillStyle = '#FAF8F5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Linhas Geométricas Decorativas nos Cantos (Estilo Luxury Gold)
        this.#drawCornerAccents(ctx, canvas.width, canvas.height);

        // 3. Moldura Dupla com Dourado Champagne (#C5A880) e Filete Fino
        this.#drawDoubleBorder(ctx, canvas.width, canvas.height);

        // 4. Logótipo / Ícone Dinâmico em Medalhão Circular
        await this.#drawLogoBadge(ctx, business, 900, 360, 130);

        // 5. Nome do Estabelecimento e Frase de Convite
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Nome
        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 76px Inter, system-ui, -apple-system, sans-serif';
        const clientName = business.name || 'Estabelecimento';
        // Ajustar tamanho se for muito longo
        if (clientName.length > 24) {
            ctx.font = 'bold 62px Inter, system-ui, -apple-system, sans-serif';
        }
        ctx.fillText(clientName, 900, 560);

        // Pergunta de Convite
        ctx.fillStyle = '#475569';
        ctx.font = '500 42px Inter, system-ui, -apple-system, sans-serif';
        ctx.fillText('Gostou da sua visita connosco?', 900, 635);

        // 6. Caixa Branca do QR Code com Borda Dupla Arredondada
        const qrBoxSize = 980;
        const qrBoxX = (1800 - qrBoxSize) / 2;
        const qrBoxY = 720;
        this.#drawRoundedCard(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 40, '#FFFFFF', '#C5A880', 6);

        // 7. Desenhar QR Code em Alta Definição
        const qrCanvas = document.createElement('canvas');
        QRCode.renderToCanvas(qrCanvas, url, 860);
        ctx.drawImage(qrCanvas, qrBoxX + 60, qrBoxY + 60, 860, 860);

        // 8. Botão Pílula "Aproxime o telemóvel ou aponte a câmara"
        this.#drawNfcPill(ctx, 900, 1850, 1160, 140);

        // 9. 5 Estrelas Douradas de Avaliação
        this.#drawGoldStars(ctx, 900, 2060, 5, 52);

        // 10. Rodapé de Segurança e Autenticação
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 28px Inter, system-ui, -apple-system, sans-serif';
        ctx.fillText(`GoReview • Placa Oficial de Mesa • NIF: ${business.nif}`, 900, 2260);

        // 11. Descarregar o ficheiro PNG gerado
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const safeName = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Placa-Oficial-GoReview-${safeName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Desenha as linhas geométricas abstratas nos cantos da placa.
     */
    static #drawCornerAccents(ctx, w, h) {
        ctx.save();
        ctx.strokeStyle = 'rgba(197, 168, 128, 0.45)';
        ctx.lineWidth = 2.5;

        // Canto Superior Esquerdo
        ctx.strokeRect(40, 40, 160, 160);
        ctx.beginPath();
        ctx.moveTo(30, 120);
        ctx.lineTo(190, 40);
        ctx.stroke();

        // Canto Superior Direito
        ctx.strokeRect(w - 200, 40, 160, 160);
        ctx.beginPath();
        ctx.moveTo(w - 210, 40);
        ctx.lineTo(w - 50, 120);
        ctx.stroke();

        // Canto Inferior Esquerdo
        ctx.strokeRect(40, h - 200, 160, 160);
        ctx.beginPath();
        ctx.moveTo(30, h - 120);
        ctx.lineTo(190, h - 40);
        ctx.stroke();

        // Canto Inferior Direito
        ctx.strokeRect(w - 200, h - 200, 160, 160);
        ctx.beginPath();
        ctx.moveTo(w - 210, h - 40);
        ctx.lineTo(w - 50, h - 120);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Moldura exterior elegante com fio dourado duplo.
     */
    static #drawDoubleBorder(ctx, w, h) {
        ctx.save();
        // Moldura Exterior Dourada
        ctx.strokeStyle = '#C5A880';
        ctx.lineWidth = 5;
        this.#roundRect(ctx, 60, 60, w - 120, h - 120, 24);
        ctx.stroke();

        // Filete Interior Fino
        ctx.strokeStyle = 'rgba(44, 53, 63, 0.25)';
        ctx.lineWidth = 2;
        this.#roundRect(ctx, 74, 74, w - 148, h - 148, 18);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Desenha o medalhão circular com o logo dinâmico ou as iniciais com anel dourado e ardósia.
     */
    static async #drawLogoBadge(ctx, business, cx, cy, radius) {
        ctx.save();

        // Anel Exterior Ardósia Escura
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#2C353F';
        ctx.stroke();

        // Anel Interior Dourado Champagne
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#C5A880';
        ctx.stroke();

        // Conteúdo: Imagem do Logo se disponível ou Iniciais estilizadas
        let imgLoaded = false;
        if (business.logoUrl) {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = business.logoUrl;
                });

                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, radius - 16, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, cx - (radius - 16), cy - (radius - 16), (radius - 16) * 2, (radius - 16) * 2);
                ctx.restore();
                imgLoaded = true;
            } catch (_) {
                imgLoaded = false;
            }
        }

        if (!imgLoaded) {
            // Emblema elegante com ícone de categoria ou iniciais
            ctx.fillStyle = '#FAF8F5';
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 16, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2C353F';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 64px Inter, system-ui, sans-serif';
            ctx.fillText(business.getInitials(), cx, cy);
        }

        ctx.restore();
    }

    /**
     * Caixa arredondada com preenchimento e contorno.
     */
    static #drawRoundedCard(ctx, x, y, w, h, radius, fillColor, strokeColor, strokeWidth) {
        ctx.save();
        ctx.beginPath();
        this.#roundRect(ctx, x, y, w, h, radius);
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Filete de contorno dourado
        if (strokeColor && strokeWidth) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();

            // Segundo contorno subtil
            ctx.strokeStyle = 'rgba(44, 53, 63, 0.15)';
            ctx.lineWidth = 2;
            this.#roundRect(ctx, x - 4, y - 4, w + 8, h + 8, radius + 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Botão pílula com ícone NFC de telemóvel e texto nítido.
     */
    static #drawNfcPill(ctx, cx, cy, width, height) {
        const x = cx - width / 2;
        const y = cy - height / 2;
        const radius = height / 2;

        ctx.save();

        // Sombra suave
        ctx.shadowColor = 'rgba(30, 41, 59, 0.2)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;

        // Fundo Ardósia Profunda (#2C353F)
        ctx.beginPath();
        this.#roundRect(ctx, x, y, width, height, radius);
        ctx.fillStyle = '#2C353F';
        ctx.fill();

        // Bordo Dourado Champagne (#C5A880)
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#C5A880';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Ícone Telemóvel NFC (vetorial)
        const iconX = x + 75;
        const iconY = cy;
        this.#drawPhoneNfcIcon(ctx, iconX, iconY, 32);

        // Texto da instrução
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 44px Inter, system-ui, -apple-system, sans-serif';
        ctx.fillText('Aproxime o telemóvel ou aponte a câmara', cx + 25, cy);

        ctx.restore();
    }

    /**
     * Desenha o ícone do telemóvel com ondas NFC.
     */
    static #drawPhoneNfcIcon(ctx, x, y, size) {
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Corpo do telemóvel
        const pw = size * 0.75;
        const ph = size * 1.35;
        this.#roundRect(ctx, x - pw / 2, y - ph / 2, pw, ph, 6);
        ctx.stroke();

        // Botão home / barra superior
        ctx.beginPath();
        ctx.moveTo(x - pw / 4, y - ph / 2 + 5);
        ctx.lineTo(x + pw / 4, y - ph / 2 + 5);
        ctx.stroke();

        // Ondas NFC à esquerda e à direita
        // Esquerda
        ctx.beginPath();
        ctx.arc(x - pw / 2 - 12, y, 16, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - pw / 2 - 20, y, 24, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();

        // Direita
        ctx.beginPath();
        ctx.arc(x + pw / 2 + 12, y, 16, Math.PI * 0.65, Math.PI * 1.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + pw / 2 + 20, y, 24, Math.PI * 0.65, Math.PI * 1.35);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Desenha 5 estrelas perfeitas com cor dourada champagne.
     */
    static #drawGoldStars(ctx, cx, cy, count = 5, size = 48) {
        ctx.save();
        ctx.fillStyle = '#C5A880';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size}px "Segoe UI Symbol", "Apple Color Emoji", sans-serif`;

        const spacing = size * 1.6;
        const startX = cx - ((count - 1) * spacing) / 2;

        for (let i = 0; i < count; i++) {
            ctx.fillText('★', startX + i * spacing, cy);
        }
        ctx.restore();
    }

    /**
     * Utilitário para traçar retângulos com cantos arredondados compatível com qualquer browser.
     */
    static #roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

