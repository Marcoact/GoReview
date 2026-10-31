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
                const pdfBase64 = payload.pdfBase64 || null;
                const pdfFilename = payload.pdfFilename || 'relatorio-goreview.pdf';

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

