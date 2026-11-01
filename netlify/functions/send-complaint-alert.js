/**
 * Netlify Serverless Function: Alerta Crítico de Reclamação com Ação WhatsApp
 * Executado na nuvem do Netlify com zero dependências externas.
 */

const tls = require('tls');

const GMAIL_USER = 'reviewgo29@gmail.com';
const GMAIL_APP_PASS = 'cyqiutwwmnkcozsg';

function sendGmailSmtp({ to, subject, body, htmlBody }) {
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
                const altBoundary = '----=_GoReviewAlt_' + Date.now();
                const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@gmail.com>`;
                const dateHeader = new Date().toUTCString();

                let message = '';
                message += `From: "GoReview Alertas" <${GMAIL_USER}>\r\n`;
                message += `To: <${to}>\r\n`;
                message += `Reply-To: <${GMAIL_USER}>\r\n`;
                message += `Date: ${dateHeader}\r\n`;
                message += `Message-ID: ${messageId}\r\n`;
                message += `X-Mailer: GoReview Cloud Alert Engine 1.0\r\n`;
                message += `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
                message += `MIME-Version: 1.0\r\n`;
                message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

                if (htmlBody) {
                    message += `--${boundary}\r\n`;
                    message += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;
                    message += `--${altBoundary}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${body}\r\n\r\n`;
                    message += `--${altBoundary}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${htmlBody}\r\n\r\n`;
                    message += `--${altBoundary}--\r\n\r\n`;
                } else {
                    message += `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${body}\r\n\r\n`;
                }

                message += `--${boundary}--\r\n.\r\n`;
                socket.write(message);
                step = 8;
            } else if (step === 8 && code === 250) {
                hasResolved = true;
                resolve({ success: true, message: `Alerta enviado com sucesso para ${to}` });
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
        const businessName = (payload.businessName || 'Estabelecimento').trim();
        const businessEmail = (payload.businessEmail || GMAIL_USER).trim();
        const rating = Number(payload.rating) || 1;
        const comment = (payload.comment || 'Sem comentário escrito.').trim();
        const customerContact = (payload.customerContact || '').trim();

        const digits = customerContact.replace(/\D/g, '');
        let cleanPhone = null;
        let waUrl = null;
        if (digits.length >= 9) {
            cleanPhone = digits.length === 9 ? `351${digits}` : digits;
            const waText = encodeURIComponent(
                `Olá! Somos da gerência do ${businessName}. Lemos o seu comentário e gostaríamos de pedir as mais sinceras desculpas pelo sucedido. Como podemos compensar a sua experiência connosco?`
            );
            waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;
        }

        const starsText = '⭐'.repeat(rating);
        const subject = `🚨 [Alerta Crítico GoReview] Nova Reclamação – ${businessName} (${rating}★)`;

        let textBody = `🚨 ALERTA CRÍTICO GOREVIEW — NOVA RECLAMAÇÃO PRIVADA\n\n`;
        textBody += `Estabelecimento: ${businessName}\n`;
        textBody += `Classificação: ${rating} de 5 Estrelas (${starsText})\n`;
        textBody += `Data e Hora: ${new Date().toLocaleString('pt-PT')}\n\n`;
        textBody += `----------------------------------------------------------------------\n`;
        textBody += `MENSAGEM DO CLIENTE:\n"${comment}"\n`;
        textBody += `----------------------------------------------------------------------\n\n`;
        textBody += `CONTACTO DO CLIENTE: ${customerContact || 'Sem contacto facultado'}\n\n`;
        if (waUrl) {
            textBody += `👉 RESPONDER IMEDIATAMENTE VIA WHATSAPP:\n${waUrl}\n\n`;
        }
        textBody += `🔒 Esta crítica NÃO foi publicada no Google Maps. Foi retida no seu canal confidencial GoReview.\n`;

        let htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #ef4444;">
                <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px;">🚨 Alerta Crítico GoReview</span>
                <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0;">Nova Reclamação Privada Registada</h1>
                <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">${businessName}</p>
            </div>
            <div style="padding: 24px;">
                <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <div style="margin-bottom: 8px;">
                        <span style="font-size: 16px; font-weight: bold; color: #9f1239;">Classificação: ${starsText} (${rating}★)</span>
                        <span style="display: inline-block; margin-left: 8px; font-size: 11px; color: #e11d48; font-weight: 600; background: #ffe4e6; padding: 2px 8px; border-radius: 6px;">Retida no Filtro Confidencial</span>
                    </div>
                    <p style="font-size: 15px; color: #1e293b; line-height: 1.5; margin: 10px 0; font-style: italic;">"${comment}"</p>
                </div>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Contacto Indicado pelo Cliente</span>
                    <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 6px 0 0 0;">${customerContact || 'Sem contacto facultado'}</p>
                </div>
                ${waUrl ? `
                <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${waUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(37, 211, 102, 0.3);">
                        💬 Responder no WhatsApp com 1 Clique
                    </a>
                    <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Abre a conversa no WhatsApp já com mensagem de recuperação pré-escrita.</p>
                </div>
                ` : ''}
                <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #64748b; line-height: 1.6;">
                    <p style="margin: 0 0 6px 0;">🛡️ <strong>Proteção de Marca:</strong> Esta crítica <strong>NÃO</strong> foi publicada no Google Maps e foi guardada exclusivamente na sua Caixa de Reclamações privada.</p>
                    <p style="margin: 0;">⏱️ <strong>Compromisso de Resposta:</strong> O cliente foi informado de uma resolução em até 7 dias.</p>
                </div>
            </div>
            <div style="background-color: #f8fafc; padding: 12px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
                GoReview — Gestão Inteligente de Reputação NFC & Google Maps
            </div>
        </div>
        `;

        const result = await sendGmailSmtp({
            to: businessEmail,
            subject,
            body: textBody,
            htmlBody
        });

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        };
    } catch (err) {
        console.error('[Netlify Function Alert] Erro:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'Falha ao disparar alerta.' })
        };
    }
};

