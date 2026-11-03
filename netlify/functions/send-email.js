/**
 * Netlify Serverless Function: Envio de Relatório Mensal via Gmail SMTP
 * Executado na nuvem do Netlify com zero dependências externas.
 */

const tls = require('tls');

const GMAIL_USER = 'reviewgo29@gmail.com';
const GMAIL_APP_PASS = 'cyqiutwwmnkcozsg';

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
    rect(0, 0, 595.28, 92, [0.06, 0.09, 0.16]);
    rect(0, 92, 595.28, 3, [0.39, 0.4, 0.95]);

    text('GOREVIEW - RELATORIO EXECUTIVO MENSAL', 36, 32, { font: '/F2', size: 15, color: [1, 1, 1] });
    text(`Estabelecimento: ${clientName} (NIF: ${clientNif})`, 36, 52, { font: '/F1', size: 10, color: [0.85, 0.9, 0.98] });
    text(`Periodo Oficial de Auditoria: ${month} | Emitido via GoReview Engine`, 36, 68, { font: '/F1', size: 8, color: [0.65, 0.75, 0.9] });

    // 2. 4 Caixas de KPIs
    const boxW = 122;
    const boxH = 58;
    const startY = 112;

    rect(36, startY, boxW, boxH, [0.96, 0.97, 0.99], [0.82, 0.85, 0.92]);
    text('TOTAL AVALIACOES', 46, startY + 16, { font: '/F2', size: 7.5, color: [0.4, 0.45, 0.55] });
    text(String(total), 46, startY + 42, { font: '/F2', size: 20, color: [0.08, 0.1, 0.18] });

    rect(168, startY, boxW, boxH, [0.94, 0.99, 0.96], [0.75, 0.9, 0.82]);
    text('MEDIA GLOBAL', 178, startY + 16, { font: '/F2', size: 7.5, color: [0.1, 0.55, 0.35] });
    text(`${avgRating} / 5.0`, 178, startY + 42, { font: '/F2', size: 18, color: [0.05, 0.48, 0.28] });

    rect(300, startY, boxW, boxH, [0.95, 0.96, 1.0], [0.8, 0.82, 0.95]);
    text('OPINIOES NO GOOGLE (4-5★)', 310, startY + 16, { font: '/F2', size: 7.5, color: [0.35, 0.35, 0.75] });
    text(`${positiveCount} (${positiveRate}%)`, 310, startY + 42, { font: '/F2', size: 16, color: [0.25, 0.25, 0.65] });

    rect(432, startY, boxW + 4, boxH, [1.0, 0.96, 0.96], [0.95, 0.8, 0.8]);
    text('RECLAMACOES (1-3 Estrelas)', 442, startY + 16, { font: '/F2', size: 7.5, color: [0.75, 0.2, 0.25] });
    text(`${complaintsCount} Retidas`, 442, startY + 42, { font: '/F2', size: 16, color: [0.7, 0.15, 0.2] });

    // 3. Gestão Inteligente de Feedback
    rect(36, 185, 524, 50, [0.98, 0.98, 1.0], [0.85, 0.88, 0.96]);
    text('GESTAO INTELIGENTE DE FEEDBACK', 48, 201, { font: '/F2', size: 9, color: [0.2, 0.25, 0.6] });
    text(
        `* Avaliacoes Publicas: ${positiveCount} avaliacoes positivas (${positiveRate}%) foram publicadas diretamente no seu perfil online, atraindo novos clientes para o seu negocio.`,
        48,
        215,
        { font: '/F1', size: 7.5, color: [0.3, 0.35, 0.45] }
    );
    text(
        `* Alertas Privados: ${complaintsCount} criticas negativas foram retidas no seu canal confidencial para que possa resolver o problema internamente, sem afetar a sua imagem publica.`,
        48,
        226,
        { font: '/F1', size: 7.5, color: [0.3, 0.35, 0.45] }
    );

    // 4. Distribuição por Estrelas
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

    // 5. Auditoria de Críticas
    text('CRITICAS E RECLAMACOES PRIVADAS RECEBIDAS (CONFIDENCIAL)', 36, 370, { font: '/F2', size: 10, color: [0.1, 0.15, 0.25] });
    let compY = 382;
    if (complaints.length === 0) {
        rect(36, compY, 524, 40, [0.98, 0.99, 0.98], [0.85, 0.92, 0.85]);
        text('Nenhuma critica negativa registada no periodo em analise. Parabens a equipa!', 48, compY + 24, {
            font: '/F1',
            size: 9,
            color: [0.15, 0.55, 0.3]
        });
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
    text('GoReview Reports - Documento confidencial gerado automaticamente pelo Sistema GoReview de Gestao de Opinioes no Google.', 46, 794, {
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
    out += 'xref\n0 7\n0000000000 65535 f \n';
    for (let i = 1; i <= 6; i++) {
        out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    out += 'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n' + startXref + '\n%%EOF\n';

    return Buffer.from(out, 'utf8');
}

function sendGmailSmtp({ to, subject, body, pdfBase64, pdfFilename }) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect({
            host: 'smtp.gmail.com',
            port: 465,
            rejectUnauthorized: false
        }, () => {});

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
                message += `X-Mailer: GoReview Cloud Function 1.0\r\n`;
                message += `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
                message += `MIME-Version: 1.0\r\n`;
                message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

                message += `--${boundary}\r\n`;
                message += `Content-Type: text/plain; charset=utf-8\r\n`;
                message += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
                message += body + '\r\n\r\n';

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
                hasResolved = true;
                resolve({ success: true, message: `E-mail enviado com sucesso a partir de ${GMAIL_USER} para ${to}` });
                try {
                    socket.write('QUIT\r\n');
                    socket.end();
                } catch (_) {}
            }
        });

        socket.on('error', (err) => {
            if (hasResolved || err.code === 'ECONNRESET') return;
            reject(err);
        });
    });
}

exports.handler = async (event) => {
    // Tratamento de CORS Preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Método não permitido.' })
        };
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const to = (payload.to || '').trim();
        const subject = (payload.subject || '').trim();
        const body = (payload.body || '').trim();
        let pdfBase64 = payload.pdfBase64 || null;
        const pdfFilename = payload.pdfFilename || 'relatorio-goreview.pdf';

        if (!to || !subject || !body) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Campos "to", "subject" e "body" são obrigatórios.' })
            };
        }

        if (!pdfBase64 && payload.report) {
            try {
                const pdfBuf = generateReportPdfBuffer(payload.report);
                pdfBase64 = pdfBuf.toString('base64');
            } catch (errPdf) {
                console.error('[PDF] Falha ao sintetizar PDF:', errPdf);
            }
        }

        const result = await sendGmailSmtp({
            to,
            subject,
            body,
            pdfBase64,
            pdfFilename
        });

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        };
    } catch (err) {
        console.error('[Netlify Function] Erro:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'Falha ao processar envio de e-mail.' })
        };
    }
};

