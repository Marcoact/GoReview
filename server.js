/**
 * @fileoverview Servidor GoReview com API de Envio Automático de E-mails via Gmail SMTP (server.js)
 * Desenvolvido em Node.js nativo (Zero Dependências) para compatibilidade universal.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const tls = require('tls');

const PORT = process.env.PORT || 3001;
const GMAIL_USER = 'reviewgo29@gmail.com';
const GMAIL_APP_PASS = 'cyqiutwwmnkcozsg';

/**
 * Gera um ficheiro PDF 1.4 executivo nativo (sem dependências externas)
 * contendo o resumo de auditoria, KPIs, distribuição gráfica e reclamações.
 * @param {Object} reportData - Dados consolidados do relatório
 * @returns {Buffer} Buffer binário do PDF pronto para anexo ou download
 */
function generateReportPdfBuffer(reportData) {
    const data = reportData || {};
    const clientName = data.clientName || 'Estabelecimento';
    const clientNif = data.clientNif || 'N/A';
    const month = data.monthFilter || 'Relatório Mensal';
    const total = data.total || 0;
    const avgRating = typeof data.avgRating === 'number' ? data.avgRating.toFixed(1) : (data.avgRating || '0.0');
    const positiveCount = data.positiveCount || 0;
    const positiveRate = data.positiveRate || 0;
    const complaintsCount = data.complaintsCount || 0;
    const dist = data.starsBreakdown || data.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const complaints = data.complaintsList || [];

    const pageContent = [];

    // Conversão de coordenadas (A4: 595.28 x 841.89 pt)
    const rect = (x, y, w, h, fillRgb, strokeRgb, lineWidth = 1) => {
        const pdfY = 841.89 - y - h;
        let s = 'q\n';
        if (fillRgb) s += `${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg\n`;
        if (strokeRgb) s += `${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG ${lineWidth} w\n`;
        s += `${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re\n`;
        if (fillRgb && strokeRgb) s += 'B\n';
        else if (fillRgb) s += 'f\n';
        else s += 'S\n';
        s += 'Q\n';
        pageContent.push(s);
    };

    const text = (str, x, y, options = {}) => {
        const font = options.font || '/F1';
        const size = options.size || 10;
        const color = options.color || [0.1, 0.1, 0.1];
        const pdfY = 841.89 - y;

        const safeStr = String(str || '')
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        let s = 'BT\n';
        s += `${font} ${size} Tf\n`;
        s += `${color[0]} ${color[1]} ${color[2]} rg\n`;
        s += `${x.toFixed(2)} ${pdfY.toFixed(2)} Td\n`;
        s += `(${safeStr}) Tj\n`;
        s += 'ET\n';
        pageContent.push(s);
    };

    // 1. Cabeçalho Executivo GoReview
    rect(0, 0, 595.28, 92, [0.06, 0.09, 0.16]); // #0f172a
    rect(0, 92, 595.28, 3, [0.39, 0.4, 0.95]); // Linha indigo

    text('GOREVIEW - RELATORIO EXECUTIVO MENSAL', 36, 32, { font: '/F2', size: 15, color: [1, 1, 1] });
    text(`Estabelecimento: ${clientName} (NIF: ${clientNif})`, 36, 52, { font: '/F1', size: 10, color: [0.85, 0.9, 0.98] });
    text(`Periodo Oficial de Auditoria: ${month} | Emitido via GoReview Engine`, 36, 68, { font: '/F1', size: 8, color: [0.65, 0.75, 0.9] });

    // 2. 4 Caixas de KPIs
    const boxW = 122;
    const boxH = 58;
    const startY = 112;

    // KPI 1: Total
    rect(36, startY, boxW, boxH, [0.96, 0.97, 0.99], [0.82, 0.85, 0.92]);
    text('TOTAL AVALIACOES', 46, startY + 16, { font: '/F2', size: 7.5, color: [0.4, 0.45, 0.55] });
    text(String(total), 46, startY + 42, { font: '/F2', size: 20, color: [0.08, 0.1, 0.18] });

    // KPI 2: Média
    rect(168, startY, boxW, boxH, [0.94, 0.99, 0.96], [0.75, 0.9, 0.82]);
    text('MEDIA GLOBAL', 178, startY + 16, { font: '/F2', size: 7.5, color: [0.1, 0.55, 0.35] });
    text(`${avgRating} / 5.0`, 178, startY + 42, { font: '/F2', size: 18, color: [0.05, 0.48, 0.28] });

    // KPI 3: Google Maps
    rect(300, startY, boxW, boxH, [0.95, 0.96, 1.0], [0.8, 0.82, 0.95]);
    text('GOOGLE MAPS (4-5 Estrelas)', 310, startY + 16, { font: '/F2', size: 7.5, color: [0.35, 0.35, 0.75] });
    text(`${positiveCount} (${positiveRate}%)`, 310, startY + 42, { font: '/F2', size: 16, color: [0.25, 0.25, 0.65] });

    // KPI 4: Reclamações
    rect(432, startY, boxW + 4, boxH, [1.0, 0.96, 0.96], [0.95, 0.8, 0.8]);
    text('RECLAMACOES (1-3 Estrelas)', 442, startY + 16, { font: '/F2', size: 7.5, color: [0.75, 0.2, 0.25] });
    text(`${complaintsCount} Retidas`, 442, startY + 42, { font: '/F2', size: 16, color: [0.7, 0.15, 0.2] });

    // 3. Eficácia do Filtro Ético
    rect(36, 185, 524, 46, [0.98, 0.98, 1.0], [0.85, 0.88, 0.96]);
    text('IMPACTO DO FILTRO ETICO GOREVIEW', 48, 201, { font: '/F2', size: 9, color: [0.2, 0.25, 0.6] });
    text(
        `- ${positiveCount} clientes satisfeitos (${positiveRate}%) foram encaminhados diretamente para o Google Maps, impulsionando o SEO local.`,
        48,
        215,
        { font: '/F1', size: 8, color: [0.3, 0.35, 0.45] }
    );
    text(
        `- ${complaintsCount} criticas negativas foram retidas confidencialmente na Caixa de Reclamacoes, protegendo a pontuacao publica.`,
        48,
        225,
        { font: '/F1', size: 8, color: [0.3, 0.35, 0.45] }
    );

    // 4. Distribuição por Estrelas (Barras Gráficas)
    text('DISTRIBUICAO DE AVALIACOES POR ESTRELAS', 36, 252, { font: '/F2', size: 10, color: [0.1, 0.15, 0.25] });
    rect(36, 260, 524, 88, [1, 1, 1], [0.88, 0.9, 0.93]);

    const starKeys = [5, 4, 3, 2, 1];
    starKeys.forEach((star, idx) => {
        const rowY = 276 + idx * 14;
        const count = Number(dist[star] ?? dist[String(star)] ?? 0);
        const pct = total > 0 ? (count / total) : 0;
        const barMaxW = 320;
        const currentBarW = Math.max(pct * barMaxW, count > 0 ? 6 : 0);

        text(`${star} Estrelas`, 48, rowY, { font: '/F2', size: 8, color: [0.3, 0.35, 0.45] });

        rect(110, rowY - 7, barMaxW, 8, [0.93, 0.94, 0.96]);
        const barColor = star >= 4 ? [0.1, 0.72, 0.48] : star === 3 ? [0.95, 0.6, 0.1] : [0.9, 0.25, 0.3];
        if (currentBarW > 0) {
            rect(110, rowY - 7, currentBarW, 8, barColor);
        }
        text(`${count} (${Math.round(pct * 100)}%)`, 440, rowY, { font: '/F1', size: 8, color: [0.4, 0.45, 0.55] });
    });

    // 5. Auditoria de Críticas e Feedbacks Privados
    text('CRITICAS E RECLAMACOES PRIVADAS RECEBIDAS (CONFIDENCIAL)', 36, 370, { font: '/F2', size: 10, color: [0.1, 0.15, 0.25] });

    let compY = 382;
    if (complaints.length === 0) {
        rect(36, compY, 524, 40, [0.98, 0.99, 0.98], [0.85, 0.92, 0.85]);
        text('Nenhuma critica negativa registada no periodo em analise. Parabens a equipa!', 48, compY + 24, {
            font: '/F1',
            size: 9,
            color: [0.15, 0.55, 0.3]
        });
        compY += 50;
    } else {
        complaints.slice(0, 4).forEach((c, idx) => {
            const cardH = 46;
            rect(36, compY, 524, cardH, [0.99, 0.99, 1.0], [0.88, 0.9, 0.94]);

            const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-PT') : 'N/A';
            const contactStr = c.customerContact ? `Contacto: ${c.customerContact}` : 'Sem contacto indicado';

            text(`${idx + 1}. [${c.rating} Estrelas] - Data: ${dateStr} | ${contactStr}`, 46, compY + 16, {
                font: '/F2',
                size: 8,
                color: [0.75, 0.2, 0.25]
            });

            const safeComm = (c.comment || 'Sem comentario adicional').slice(0, 100);
            text(`"${safeComm}"`, 46, compY + 32, { font: '/F1', size: 8, color: [0.2, 0.25, 0.35] });

            compY += cardH + 6;
        });
    }

    // 6. Rodapé Oficial GoReview
    rect(36, 780, 524, 30, [0.97, 0.98, 1.0], [0.85, 0.88, 0.94]);
    text('GoReview Reports - Documento confidencial gerado automaticamente pelo Sistema de Gestao Etica NFC & Google Maps.', 46, 794, {
        font: '/F1',
        size: 7,
        color: [0.4, 0.45, 0.55]
    });
    text(`Data de Emissao: ${new Date().toLocaleDateString('pt-PT')} | Suporte: reviewgo29@gmail.com`, 46, 804, {
        font: '/F1',
        size: 6.5,
        color: [0.55, 0.6, 0.7]
    });

    const streamContent = pageContent.join('');
    const streamLen = Buffer.byteLength(streamContent, 'utf8');

    let out = '%PDF-1.4\n';
    const offsets = [];

    const appendObj = (id, body) => {
        offsets[id] = Buffer.byteLength(out, 'utf8');
        out += `${id} 0 obj\n${body}\nendobj\n`;
    };

    appendObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    appendObj(2, '<< /Type /Pages /Kids [5 0 R] /Count 1 >>');
    appendObj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    appendObj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    appendObj(5, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>');
    appendObj(6, `<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`);

    const startXref = Buffer.byteLength(out, 'utf8');
    out += 'xref\n';
    out += `0 7\n`;
    out += '0000000000 65535 f \n';
    for (let i = 1; i <= 6; i++) {
        out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    out += 'trailer\n';
    out += '<< /Size 7 /Root 1 0 R >>\n';
    out += 'startxref\n';
    out += `${startXref}\n`;
    out += '%%EOF\n';

    return Buffer.from(out, 'utf8');
}

/**
 * Envia um e-mail com anexo opcional através do protocolo SMTP seguro (TLS/SSL - porta 465) do Gmail.
 * @param {Object} options
 * @param {string} options.to - Destinatário
 * @param {string} options.subject - Assunto
 * @param {string} options.body - Corpo de texto
 * @param {string} [options.pdfBase64] - Conteúdo base64 do anexo
 * @param {string} [options.pdfFilename] - Nome do ficheiro em anexo
 * @returns {Promise<{ success: boolean, message: string }>}
 */
function sendGmailSmtp({ to, subject, body, pdfBase64, pdfFilename }) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect({
            host: 'smtp.gmail.com',
            port: 465,
            rejectUnauthorized: false
        }, () => {
            console.log(`[SMTP] Ligado a smtp.gmail.com:465 para envio para: ${to}`);
        });

        socket.setEncoding('utf8');

        let step = 0;
        let hasResolved = false;

        socket.on('data', (data) => {
            const code = parseInt(data.substring(0, 3), 10);
            if (code >= 400 && !hasResolved) {
                hasResolved = true;
                socket.destroy();
                return reject(new Error('Erro Gmail SMTP: ' + data.trim()));
            }

            if (step === 0 && code === 220) {
                socket.write('EHLO localhost\r\n');
                step = 1;
            } else if (step === 1 && code === 250) {
                socket.write('AUTH LOGIN\r\n');
                step = 2;
            } else if (step === 2 && code === 334) {
                socket.write(Buffer.from(GMAIL_USER).toString('base64') + '\r\n');
                step = 3;
            } else if (step === 3 && code === 334) {
                socket.write(Buffer.from(GMAIL_APP_PASS).toString('base64') + '\r\n');
                step = 4;
            } else if (step === 4 && code === 235) {
                socket.write(`MAIL FROM:<${GMAIL_USER}>\r\n`);
                step = 5;
            } else if (step === 5 && code === 250) {
                socket.write(`RCPT TO:<${to}>\r\n`);
                step = 6;
            } else if (step === 6 && code === 250) {
                socket.write('DATA\r\n');
                step = 7;
            } else if (step === 7 && code === 354) {
                const boundary = '----=_GoReviewBoundary_' + Date.now();
                const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@gmail.com>`;
                const dateHeader = new Date().toUTCString();

                let message = '';
                message += `From: "GoReview Reports" <${GMAIL_USER}>\r\n`;
                message += `To: <${to}>\r\n`;
                message += `Reply-To: <${GMAIL_USER}>\r\n`;
                message += `Date: ${dateHeader}\r\n`;
                message += `Message-ID: ${messageId}\r\n`;
                message += `X-Mailer: GoReview Executive Engine 1.0\r\n`;
                message += `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
                message += `MIME-Version: 1.0\r\n`;
                message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

                // Corpo de texto
                message += `--${boundary}\r\n`;
                message += `Content-Type: text/plain; charset=utf-8\r\n`;
                message += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
                message += body + '\r\n\r\n';

                // Anexo PDF opcional
                if (pdfBase64 && pdfFilename) {
                    message += `--${boundary}\r\n`;
                    message += `Content-Type: application/pdf; name="${pdfFilename}"\r\n`;
                    message += `Content-Disposition: attachment; filename="${pdfFilename}"\r\n`;
                    message += `Content-Transfer-Encoding: base64\r\n\r\n`;
                    message += pdfBase64 + '\r\n\r\n';
                }

                message += `--${boundary}--\r\n.\r\n`;

                socket.write(message);
                step = 8;
            } else if (step === 8 && code === 250) {
                console.log(`[SMTP] E-mail entregue com sucesso à fila de envio do Gmail para ${to}`);
                hasResolved = true;
                resolve({ success: true, message: `E-mail enviado com sucesso a partir de ${GMAIL_USER} para ${to}` });
                try {
                    socket.write('QUIT\r\n');
                    socket.end();
                } catch (_) {}
            }
        });

        socket.on('error', (err) => {
            if (hasResolved || err.code === 'ECONNRESET') {
                // A mensagem já foi entregue com sucesso à Google antes do encerramento da ligação TLS
                return;
            }
            console.error('[SMTP] Erro de Socket TLS:', err);
            reject(err);
        });
    });
}

// Mapa de tipos MIME para servir ficheiros estáticos da aplicação
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.sql': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
    // Configuração de cabeçalhos CORS (permite que o Live Server ou app local aceda)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // ROTA DA API: Envio Automático de E-mails
    if (pathname === '/api/send-email' && req.method === 'POST') {
        let bodyRaw = '';
        req.on('data', (chunk) => bodyRaw += chunk);
        req.on('end', async () => {
            try {
                const payload = JSON.parse(bodyRaw || '{}');
                const to = (payload.to || '').trim();
                const subject = (payload.subject || '').trim();
                const body = (payload.body || '').trim();
                let pdfBase64 = payload.pdfBase64 || null;
                const pdfFilename = payload.pdfFilename || 'relatorio-goreview.pdf';

                if (!pdfBase64 && payload.report) {
                    try {
                        const pdfBuf = generateReportPdfBuffer(payload.report);
                        pdfBase64 = pdfBuf.toString('base64');
                        console.log(`[PDF] Relatório gerado com sucesso (${pdfBuf.length} bytes) para anexo via Gmail SMTP.`);
                    } catch (errPdf) {
                        console.error('[PDF] Erro ao sintetizar buffer PDF para o e-mail:', errPdf);
                    }
                }

                if (!to || !subject || !body) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Campos "to", "subject" e "body" são obrigatórios.' }));
                    return;
                }

                console.log(`[API] A disparar e-mail de ${GMAIL_USER} para ${to}...`);
                const result = await sendGmailSmtp({
                    to,
                    subject,
                    body,
                    pdfBase64,
                    pdfFilename
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error('[API] Falha no envio do e-mail:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message || 'Falha ao enviar e-mail via Gmail SMTP.' }));
            }
        });
        return;
    }

    // Servir ficheiros estáticos do GoReview (index.html, js/..., etc.)
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Ficheiro não encontrado.');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 Servidor GoReview Ativo em: http://localhost:${PORT}`);
    console.log(`✉️  Motor Gmail SMTP: Ligado a ${GMAIL_USER}`);
    console.log(`📡 Endpoint de Envio: http://localhost:${PORT}/api/send-email`);
    console.log(`================================================================`);
});

