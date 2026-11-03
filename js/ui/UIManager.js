/**
 * @fileoverview Camada de Apresentação e Manipulação Segura do DOM (js/ui/UIManager.js)
 */

import { QRCode } from '../utils/QRCode.js';

/**
 * Textos descritivos de apoio para cada classificação de 1 a 5 estrelas.
 * @type {Readonly<Record<number, string>>}
 */
export const RATING_LABELS = Object.freeze({
    1: '1 Estrela — Muito insatisfeito (Abrir Caixa de Reclamações)',
    2: '2 Estrelas — Insatisfeito (Abrir Caixa de Reclamações)',
    3: '3 Estrelas — Razoável, pode melhorar (Abrir Caixa de Reclamações)',
    4: '4 Estrelas — Gostei muito! (Publicar Opinião no Google)',
    5: '5 Estrelas — Excelente experiência! (Publicar Opinião no Google)'
});

/**
 * Classe responsável por gerir todas as transições de vistas, manipulação segura do DOM (`textContent` / `createElement`)
 * e desenho dos gráficos 3D nos relatórios mensais.
 */
export class UIManager {
    /** @type {Record<string, HTMLElement|null>} */
    views;

    /** @type {Record<string, any>} */
    elements;

    constructor() {
        this.views = {
            loading: document.getElementById('view-loading'),
            directory: document.getElementById('view-directory'),
            login: document.getElementById('view-login'),
            admin: document.getElementById('view-admin'),
            error: document.getElementById('view-error'),
            main: document.getElementById('view-main'),
            redirecting: document.getElementById('view-redirecting'),
            thankYou: document.getElementById('view-thank-you')
        };

        this.elements = {
            appCardContainer: document.getElementById('app-card-container'),
            directoryList: document.getElementById('test-companies-list'),
            errorMessage: document.getElementById('error-message'),
            clientLogo: document.getElementById('client-logo'),
            clientInitials: document.getElementById('client-initials'),
            clientName: document.getElementById('client-name'),
            clientNifBadge: document.getElementById('client-nif-badge'),
            mainClientMenuBtn: document.getElementById('main-client-menu-btn'),
            mainClientDropdown: document.getElementById('main-client-dropdown'),
            btnSentimentPositive: document.getElementById('btn-sentiment-positive'),
            btnSentimentNegative: document.getElementById('btn-sentiment-negative'),
            sentimentContainer: document.getElementById('sentiment-selector-container'),
            sentimentHelpLabel: document.getElementById('sentiment-help-label'),
            starsContainer: document.getElementById('stars-container'),
            starButtons: document.querySelectorAll('.star-btn'),
            ratingLabel: document.getElementById('rating-label') || document.getElementById('sentiment-help-label'),
            feedbackSection: document.getElementById('private-feedback-section'),
            feedbackForm: document.getElementById('private-feedback-form'),
            feedbackComment: document.getElementById('feedback-comment'),
            feedbackContact: document.getElementById('feedback-contact'),
            submitFeedbackBtn: document.getElementById('submit-feedback-btn'),
            submitBtnText: document.getElementById('submit-btn-text'),
            formErrorAlert: document.getElementById('form-error-alert'),
            manualGoogleLink: document.getElementById('manual-google-link'),
            btnOpenGoogleDirect: document.getElementById('btn-open-google-direct'),

            // Login de Administrador
            loginForm: document.getElementById('login-form'),
            loginUsername: document.getElementById('login-username'),
            loginPassword: document.getElementById('login-password'),
            btnTogglePassword: document.getElementById('btn-toggle-password'),
            togglePasswordIcon: document.getElementById('toggle-password-icon'),
            loginErrorAlert: document.getElementById('login-error-alert'),
            btnLoginSubmit: document.getElementById('btn-login-submit'),
            loginBtnText: document.getElementById('login-btn-text'),

            // Portal Admin
            btnOpenCreateClient: document.getElementById('btn-open-create-client'),
            btnAdminLogout: document.getElementById('btn-admin-logout'),
            adminKpiTotal: document.getElementById('admin-kpi-total'),
            adminKpiActive: document.getElementById('admin-kpi-active'),
            adminKpiTrial: document.getElementById('admin-kpi-trial'),
            adminKpiInactive: document.getElementById('admin-kpi-inactive'),
            adminSearchInput: document.getElementById('admin-search-input'),
            adminFilterBtns: document.querySelectorAll('.admin-filter-btn'),
            adminClientsList: document.getElementById('admin-clients-list'),

            // Modal Criar/Editar Cliente
            clientFormModal: document.getElementById('client-form-modal'),
            clientFormTitle: document.getElementById('client-form-title'),
            adminClientForm: document.getElementById('admin-client-form'),
            btnCloseClientForm: document.getElementById('btn-close-client-form'),
            btnCancelClientForm: document.getElementById('btn-cancel-client-form'),
            btnSaveClient: document.getElementById('btn-save-client'),
            clientFieldId: document.getElementById('client-field-id'),
            clientFieldName: document.getElementById('client-field-name'),
            clientFieldNif: document.getElementById('client-field-nif'),
            clientFieldCategory: document.getElementById('client-field-category'),
            clientFieldSlug: document.getElementById('client-field-slug'),
            clientFieldGoogleUrl: document.getElementById('client-field-google-url'),
            clientFieldLogo: document.getElementById('client-field-logo'),
            clientFieldEmail: document.getElementById('client-field-email'),
            clientFieldStatus: document.getElementById('client-field-status'),
            clientNfcPreview: document.getElementById('client-nfc-preview'),
            clientFormError: document.getElementById('client-form-error'),

            // Modal Relatório Mensal 3D
            reportModal: document.getElementById('report-modal'),
            reportClientLogo: document.getElementById('report-client-logo'),
            reportClientName: document.getElementById('report-client-name'),
            reportClientNif: document.getElementById('report-client-nif'),
            reportMonthSelect: document.getElementById('report-month-select'),
            btnSendEmailReport: document.getElementById('btn-send-email-report'),
            btnExportPdf: document.getElementById('btn-export-pdf'),
            btnExportCsv: document.getElementById('btn-export-csv'),
            btnExportSql: document.getElementById('btn-export-sql'),
            btnCloseReport: document.getElementById('btn-close-report'),
            btnCopySql: document.getElementById('btn-copy-sql'),
            btnMailtoClient: document.getElementById('btn-mailto-client'),
            kpiTotal: document.getElementById('kpi-total'),
            kpiAverage: document.getElementById('kpi-average'),
            kpiPositive: document.getElementById('kpi-positive'),
            kpiPositiveRate: document.getElementById('kpi-positive-rate'),
            kpiComplaints: document.getElementById('kpi-complaints'),
            complaintsContainer: document.getElementById('report-complaints-container'),
            reportSqlCode: document.getElementById('report-sql-code'),
            canvasStarsBar: document.getElementById('chart-stars-bar'),
            canvasFilterDoughnut: document.getElementById('chart-filter-doughnut'),

            // Modal Disparo de Relatório por E-mail
            emailDispatchModal: document.getElementById('email-dispatch-modal'),
            emailModalRecipient: document.getElementById('email-modal-recipient'),
            emailModalSubject: document.getElementById('email-modal-subject'),
            emailModalBody: document.getElementById('email-modal-body'),
            emailModalPdfName: document.getElementById('email-modal-pdf-name'),
            btnCopyEmailBody: document.getElementById('btn-copy-email-body'),
            btnDownloadReportPdf: document.getElementById('btn-download-report-pdf'),
            btnCloseEmailModal: document.getElementById('btn-close-email-modal'),
            emailCopyFeedback: document.getElementById('email-copy-feedback'),
            btnAutoSendGmail: document.getElementById('btn-auto-send-gmail'),
            autoSendGmailText: document.getElementById('auto-send-gmail-text'),
            emailSendStatusAlert: document.getElementById('email-send-status-alert'),

            // Modal QR Code & Placa de Mesa Oficial
            qrModal: document.getElementById('qr-modal'),
            btnCloseQrModal: document.getElementById('btn-close-qr-modal'),
            printableTableStand: document.getElementById('printable-table-stand'),
            qrModalLogo: document.getElementById('qr-modal-logo'),
            qrModalInitials: document.getElementById('qr-modal-initials'),
            qrModalClientName: document.getElementById('qr-modal-client-name'),
            qrModalNif: document.getElementById('qr-modal-nif'),
            qrCodeCanvas: document.getElementById('qr-code-canvas'),
            qrModalUrlInput: document.getElementById('qr-modal-url-input'),
            btnCopyQrLink: document.getElementById('btn-copy-qr-link'),
            btnDownloadQrPng: document.getElementById('btn-download-qr-png'),
            btnPrintTableStand: document.getElementById('btn-print-table-stand'),
            qrCopyFeedback: document.getElementById('qr-copy-feedback')
        };
    }

    /**
     * Alterna entre as vistas da aplicação (`loading`, `directory`, `login`, `admin`, `error`, `main`, `redirecting`, `thankYou`).
     * @param {'loading'|'directory'|'login'|'admin'|'error'|'main'|'redirecting'|'thankYou'} activeViewKey - Nome da vista ativa.
     * @returns {void}
     */
    showView(activeViewKey) {
        if (this.elements.appCardContainer) {
            if (activeViewKey === 'admin') {
                this.elements.appCardContainer.classList.remove('max-w-md');
                this.elements.appCardContainer.classList.add('max-w-4xl');
            } else {
                this.elements.appCardContainer.classList.remove('max-w-4xl');
                this.elements.appCardContainer.classList.add('max-w-md');
            }
        }

        Object.entries(this.views).forEach(([key, el]) => {
            if (!el) return;
            el.classList.toggle('hidden', key !== activeViewKey);
        });
    }

    /**
     * Define ou limpa a mensagem de erro no formulário de Login de Administrador.
     * @param {string|null} message - Mensagem de erro ou `null` para ocultar.
     * @returns {void}
     */
    setLoginFormError(message) {
        const alertEl = this.elements.loginErrorAlert;
        if (!alertEl) return;

        if (!message) {
            alertEl.textContent = '';
            alertEl.classList.add('hidden');
        } else {
            alertEl.textContent = message;
            alertEl.classList.remove('hidden');
        }
    }

    /**
     * Atualiza o estado de carregamento do botão de submissão do Login.
     * @param {boolean} isSubmitting - `true` se estiver a validar credenciais.
     * @returns {void}
     */
    setLoginSubmittingState(isSubmitting) {
        if (this.elements.btnLoginSubmit) {
            this.elements.btnLoginSubmit.disabled = isSubmitting;
        }
        if (this.elements.loginBtnText) {
            this.elements.loginBtnText.textContent = isSubmitting ? 'A verificar credenciais...' : 'Entrar no Portal Admin';
        }
    }

    /**
     * Limpa os campos e alertas do formulário de Login.
     * @returns {void}
     */
    resetLoginForm() {
        if (this.elements.loginForm) {
            this.elements.loginForm.reset();
        }
        if (this.elements.loginPassword) {
            this.elements.loginPassword.type = 'password';
        }
        if (this.elements.togglePasswordIcon) {
            this.elements.togglePasswordIcon.textContent = '👁️';
        }
        this.setLoginFormError(null);
        this.setLoginSubmittingState(false);
    }

    /**
     * Alterna a visibilidade do campo de palavra-passe entre `password` e `text`.
     * @returns {void}
     */
    togglePasswordVisibility() {
        const input = this.elements.loginPassword;
        const icon = this.elements.togglePasswordIcon;
        if (!input) return;

        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        if (icon) {
            icon.textContent = isHidden ? '🙈' : '👁️';
        }
    }

    /**
     * Apresenta a vista de erro com uma mensagem segura (`textContent`).
     * @param {string} message - Mensagem de erro a exibir ao utilizador.
     * @returns {void}
     */
    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        this.showView('error');
    }

    /**
     * Preenche o cabeçalho e metadados do estabelecimento na vista principal de avaliação.
     * @param {import('../models/Business.js').Business} business - Instância do estabelecimento.
     * @returns {void}
     */
    renderBusinessProfile(business) {
        document.title = `Avaliar ${business.name} (NIF ${business.nif}) | GoReview`;
        this.elements.clientName.textContent = business.name;

        if (this.elements.clientNifBadge) {
            this.elements.clientNifBadge.textContent = `NIF: ${business.nif}`;
            this.elements.clientNifBadge.classList.remove('hidden');
        }

        if (business.logoUrl) {
            this.elements.clientLogo.src = business.logoUrl;
            this.elements.clientLogo.alt = `Logótipo ${business.name}`;
            this.elements.clientLogo.classList.remove('hidden');
            this.elements.clientInitials.classList.add('hidden');

            this.elements.clientLogo.onerror = () => {
                this.elements.clientLogo.classList.add('hidden');
                this.elements.clientInitials.textContent = business.getInitials();
                this.elements.clientInitials.classList.remove('hidden');
            };
        } else {
            this.elements.clientLogo.classList.add('hidden');
            this.elements.clientInitials.textContent = business.getInitials();
            this.elements.clientInitials.classList.remove('hidden');
        }
    }

    /**
     * Atualiza o estado visual dos botões de sentimento conversacional ('positive', 'negative' ou null).
     * @param {'positive'|'negative'|null} sentiment - Sentimento selecionado.
     * @returns {void}
     */
    setSentimentSelection(sentiment) {
        const { btnSentimentPositive, btnSentimentNegative, sentimentHelpLabel } = this.elements;

        if (btnSentimentPositive) {
            if (sentiment === 'positive') {
                btnSentimentPositive.classList.add('ring-4', 'ring-emerald-400/50', 'border-emerald-500', 'bg-emerald-50');
                btnSentimentPositive.classList.remove('opacity-60');
            } else if (sentiment === 'negative') {
                btnSentimentPositive.classList.remove('ring-4', 'ring-emerald-400/50', 'border-emerald-500', 'bg-emerald-50');
                btnSentimentPositive.classList.add('opacity-60');
            } else {
                btnSentimentPositive.classList.remove('ring-4', 'ring-emerald-400/50', 'border-emerald-500', 'bg-emerald-50', 'opacity-60');
            }
        }

        if (btnSentimentNegative) {
            if (sentiment === 'negative') {
                btnSentimentNegative.classList.add('ring-4', 'ring-amber-400/50', 'border-amber-500', 'bg-amber-50');
                btnSentimentNegative.classList.remove('opacity-60');
            } else if (sentiment === 'positive') {
                btnSentimentNegative.classList.remove('ring-4', 'ring-amber-400/50', 'border-amber-500', 'bg-amber-50');
                btnSentimentNegative.classList.add('opacity-60');
            } else {
                btnSentimentNegative.classList.remove('ring-4', 'ring-amber-400/50', 'border-amber-500', 'bg-amber-50', 'opacity-60');
            }
        }

        if (sentimentHelpLabel) {
            if (sentiment === 'positive') {
                sentimentHelpLabel.textContent = 'A preparar a sua Opinião no Google... ⭐';
                sentimentHelpLabel.classList.add('text-emerald-600', 'font-medium');
            } else if (sentiment === 'negative') {
                sentimentHelpLabel.textContent = 'A sua mensagem será enviada confidencialmente à gerência.';
                sentimentHelpLabel.classList.add('text-amber-600', 'font-medium');
            } else {
                sentimentHelpLabel.textContent = 'Toque numa opção para partilhar a sua opinião';
                sentimentHelpLabel.classList.remove('text-emerald-600', 'text-amber-600', 'font-medium');
            }
        }
    }

    /**
     * Atualiza visualmente o destaque das estrelas de 1 a 5.
     * @param {number} activeRating - Número de estrelas ativas (0 a 5).
     * @returns {void}
     */
    highlightStars(activeRating) {
        this.elements.starButtons.forEach((btn) => {
            const starRating = Number(btn.dataset.rating);
            const svg = btn.querySelector('svg');
            if (!svg) return;

            if (starRating <= activeRating) {
                svg.classList.remove('text-slate-200');
                svg.classList.add('text-amber-400', 'scale-110');
            } else {
                svg.classList.remove('text-amber-400', 'scale-110');
                svg.classList.add('text-slate-200');
            }
        });
    }

    /**
     * Atualiza a legenda por baixo das estrelas usando `textContent`.
     * @param {number} rating - Estrela selecionada ou em hover (0 para texto padrão).
     * @returns {void}
     */
    updateRatingLabel(rating) {
        if (!this.elements.ratingLabel) return;
        this.elements.ratingLabel.textContent =
            RATING_LABELS[rating] || 'Toque numa estrela para classificar de 1 a 5';
    }

    /**
     * Mostra ou esconde a secção da Caixa de Reclamações Interna (1 a 3 estrelas).
     * @param {boolean} visible - `true` para mostrar o formulário privado.
     * @returns {void}
     */
    togglePrivateFeedbackForm(visible) {
        if (!this.elements.feedbackSection) return;
        this.elements.feedbackSection.classList.toggle('hidden', !visible);
        if (visible && this.elements.feedbackComment) {
            setTimeout(() => {
                this.elements.feedbackComment.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                this.elements.feedbackComment.focus();
            }, 80);
        }
    }

    /**
     * Apresenta ou oculta um alerta de validação no formulário de reclamação.
     * @param {string|null} message - Mensagem de erro ou `null` para esconder.
     * @returns {void}
     */
    setFeedbackFormError(message) {
        if (!this.elements.formErrorAlert) return;
        if (!message) {
            this.elements.formErrorAlert.classList.add('hidden');
            this.elements.formErrorAlert.textContent = '';
            return;
        }
        this.elements.formErrorAlert.textContent = message;
        this.elements.formErrorAlert.classList.remove('hidden');
    }

    /**
     * Atualiza o estado de carregamento do botão de submissão da Caixa de Reclamações.
     * @param {boolean} isSubmitting - Indica se o envio está em curso.
     * @returns {void}
     */
    setSubmittingState(isSubmitting) {
        if (!this.elements.submitFeedbackBtn || !this.elements.submitBtnText) return;
        this.elements.submitFeedbackBtn.disabled = isSubmitting;
        this.elements.submitBtnText.textContent = isSubmitting
            ? 'A registar reclamação...'
            : 'Submeter na Caixa de Reclamações';
    }

    /**
     * Prepara e mostra a vista de redirecionamento para a Opinião no Google.
     * @param {string} googleReviewUrl - Endereço oficial de avaliação no Google.
     * @returns {void}
     */
    showRedirectingView(googleReviewUrl) {
        if (this.elements.manualGoogleLink) {
            this.elements.manualGoogleLink.href = googleReviewUrl;
        }
        if (this.elements.btnOpenGoogleDirect) {
            this.elements.btnOpenGoogleDirect.href = googleReviewUrl;
        }
        this.showView('redirecting');
    }

    /**
     * Cria um elemento de badge DOM seguro para o estado da empresa (`active`, `trial`, `inactive`).
     * @param {import('../models/Business.js').Business} business - Instância do estabelecimento.
     * @returns {HTMLSpanElement}
     */
    #createStatusBadgeElement(business) {
        const badge = document.createElement('span');
        if (business.status === 'trial') {
            const days = business.getRemainingTrialDays();
            badge.className =
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200';
            badge.textContent = `🎁 Experimental (${days}d grátis)`;
            return badge;
        }
        if (business.status === 'inactive') {
            badge.className =
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200';
            badge.textContent = '⏸️ Inativo';
            return badge;
        }
        badge.className =
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
        badge.textContent = '✅ Ativo';
        return badge;
    }

    /**
     * Cria um elemento de avatar (imagem ou iniciais) de forma segura.
     * @param {import('../models/Business.js').Business} business - Instância do estabelecimento.
     * @returns {HTMLElement}
     */
    #createAvatarElement(business) {
        if (business.logoUrl) {
            const img = document.createElement('img');
            img.src = business.logoUrl;
            img.alt = business.name;
            img.className = 'w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0';
            return img;
        }
        const div = document.createElement('div');
        div.className =
            'w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-sm flex items-center justify-center flex-shrink-0';
        div.textContent = business.getInitials();
        return div;
    }

    /**
     * Cria o menu dropdown dos 3 pontinhos (`⋯`) para exportação de relatórios.
     * @param {string} dropdownKey - Identificador único do dropdown.
     * @param {import('../models/Business.js').Business} business - Estabelecimento associado.
     * @returns {HTMLDivElement}
     */
    #createDotsDropdownElement(dropdownKey, business) {
        const dropdown = document.createElement('div');
        dropdown.id = `dropdown-${dropdownKey}`;
        dropdown.className =
            'company-dots-dropdown hidden absolute right-4 top-12 w-60 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 divide-y divide-slate-100 z-30';

        const header = document.createElement('div');
        header.className = 'px-3.5 py-2 bg-slate-50 rounded-t-xl';
        const headerTitle = document.createElement('p');
        headerTitle.className = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate';
        headerTitle.textContent = `Relatório 3D — ${business.name}`;
        header.appendChild(headerTitle);

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'py-1';

        const actions = [
            { action: 'open', icon: '📊', label: 'Ver Relatório & Gráficos 3D' },
            { action: 'qr', icon: '📱', label: 'Gerar QR Code & Placa de Mesa' },
            { action: 'pdf', icon: '🖨️', label: 'Exportar Relatório (PDF)' },
            { action: 'csv', icon: '📥', label: 'Exportar Críticas (CSV / Excel)' },
            { action: 'sql', icon: '🗄️', label: 'Exportar Relatório SQL (.sql)' }
        ];

        actions.forEach(({ action, icon, label }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.companyId = business.id || '';
            btn.dataset.companyNif = business.nif;
            btn.dataset.reportAction = action;
            btn.className =
                'w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition text-left';

            const iconSpan = document.createElement('span');
            iconSpan.textContent = icon;
            const textSpan = document.createElement('span');
            textSpan.textContent = label;

            btn.append(iconSpan, textSpan);
            actionsContainer.appendChild(btn);
        });

        dropdown.append(header, actionsContainer);
        return dropdown;
    }

    /**
     * Cria um botão de 3 pontinhos (`⋯`) seguro.
     * @param {string} dropdownKey - Chave do dropdown alvo.
     * @param {string} businessName - Nome do estabelecimento para acessibilidade.
     * @returns {HTMLButtonElement}
     */
    #createDotsTriggerButton(dropdownKey, businessName) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.dotsToggle = dropdownKey;
        btn.title = `Opções e Relatório Mensal 3D de ${businessName}`;
        btn.className = 'p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition flex-shrink-0';
        btn.textContent = '⋯';
        return btn;
    }

    /**
     * Renderiza a lista de estabelecimentos no Diretório Inicial usando criação segura de nós DOM.
     * @param {import('../models/Business.js').Business[]} businesses - Lista de empresas ativas.
     * @returns {void}
     */
    renderDirectoryList(businesses) {
        const container = this.elements.directoryList;
        if (!container) return;
        container.replaceChildren();

        if (!businesses || businesses.length === 0) {
            const emptyBox = document.createElement('div');
            emptyBox.className = 'p-6 text-center rounded-xl border border-dashed border-slate-200 space-y-2';
            const msg = document.createElement('p');
            msg.className = 'text-xs font-medium text-slate-500';
            msg.textContent = 'Nenhuma empresa ativa neste momento.';
            const link = document.createElement('a');
            link.href = '?admin=true';
            link.className = 'inline-block text-xs font-semibold text-indigo-600 underline';
            link.textContent = 'Ir ao Portal Admin para criar ou ativar empresas →';
            emptyBox.append(msg, link);
            container.appendChild(emptyBox);
            return;
        }

        businesses.forEach((biz) => {
            const card = document.createElement('div');
            card.className =
                'relative flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white transition text-left';

            const leftGroup = document.createElement('div');
            leftGroup.className = 'flex items-center gap-3.5 min-w-0 flex-1';

            const avatarLink = document.createElement('a');
            avatarLink.href = `?nif=${encodeURIComponent(biz.nif)}`;
            avatarLink.appendChild(this.#createAvatarElement(biz));

            const infoCol = document.createElement('div');
            infoCol.className = 'min-w-0 flex-1';

            const titleRow = document.createElement('div');
            titleRow.className = 'flex items-center gap-1.5';

            const nameLink = document.createElement('a');
            nameLink.href = `?nif=${encodeURIComponent(biz.nif)}`;
            nameLink.className = 'text-sm font-bold text-slate-900 hover:text-indigo-600 transition truncate';
            nameLink.textContent = biz.name;

            const dropdownKey = `dir-${biz.nif}`;
            const dotsBtn = this.#createDotsTriggerButton(dropdownKey, biz.name);
            titleRow.append(nameLink, dotsBtn);

            const categoryP = document.createElement('p');
            categoryP.className = 'text-xs text-slate-500 truncate';
            categoryP.textContent = biz.category;

            const badgesRow = document.createElement('div');
            badgesRow.className = 'flex flex-wrap items-center gap-1.5 mt-1';

            const nifBadge = document.createElement('span');
            nifBadge.className =
                'inline-block text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded';
            nifBadge.textContent = `?nif=${biz.nif}`;

            badgesRow.append(nifBadge, this.#createStatusBadgeElement(biz));
            infoCol.append(titleRow, categoryP, badgesRow);
            leftGroup.append(avatarLink, infoCol);

            const testLink = document.createElement('a');
            testLink.href = `?nif=${encodeURIComponent(biz.nif)}`;
            testLink.className = 'text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition flex-shrink-0 ml-2';
            testLink.textContent = 'Testar →';

            card.append(leftGroup, testLink, this.#createDotsDropdownElement(dropdownKey, biz));
            container.appendChild(card);
        });
    }

    /**
     * Renderiza os contadores KPI e a tabela de clientes no Portal de Administração Interna.
     * @param {import('../models/Business.js').Business[]} allBusinesses - Todos os estabelecimentos.
     * @param {string} activeFilter - Filtro ativo (`'all' | 'active' | 'trial' | 'inactive'`).
     * @param {string} searchQuery - Texto de pesquisa.
     * @returns {void}
     */
    renderAdminPortal(allBusinesses, activeFilter = 'all', searchQuery = '') {
        const total = allBusinesses.length;
        const activeCount = allBusinesses.filter((c) => c.status === 'active').length;
        const trialCount = allBusinesses.filter((c) => c.status === 'trial').length;
        const inactiveCount = allBusinesses.filter((c) => c.status === 'inactive').length;

        if (this.elements.adminKpiTotal) this.elements.adminKpiTotal.textContent = String(total);
        if (this.elements.adminKpiActive) this.elements.adminKpiActive.textContent = String(activeCount);
        if (this.elements.adminKpiTrial) this.elements.adminKpiTrial.textContent = String(trialCount);
        if (this.elements.adminKpiInactive) this.elements.adminKpiInactive.textContent = String(inactiveCount);

        const container = this.elements.adminClientsList;
        if (!container) return;
        container.replaceChildren();

        const query = searchQuery.trim().toLowerCase();
        const filtered = allBusinesses.filter((c) => {
            if (activeFilter !== 'all' && c.status !== activeFilter) return false;
            if (!query) return true;
            return (
                c.name.toLowerCase().includes(query) ||
                c.nif.toLowerCase().includes(query) ||
                c.slug.toLowerCase().includes(query) ||
                c.category.toLowerCase().includes(query)
            );
        });

        if (filtered.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'p-10 text-center space-y-1';
            const title = document.createElement('p');
            title.className = 'text-sm font-semibold text-slate-600';
            title.textContent = 'Nenhum cliente encontrado para este filtro.';
            emptyDiv.appendChild(title);
            container.appendChild(emptyDiv);
            return;
        }

        filtered.forEach((biz) => {
            const row = document.createElement('div');
            row.className =
                'relative p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4';

            const left = document.createElement('div');
            left.className = 'flex items-start sm:items-center gap-3.5 min-w-0 flex-1';
            left.appendChild(this.#createAvatarElement(biz));

            const metaCol = document.createElement('div');
            metaCol.className = 'min-w-0 flex-1 space-y-1';

            const topLine = document.createElement('div');
            topLine.className = 'flex flex-wrap items-center gap-2';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-sm font-bold text-slate-900 truncate';
            nameSpan.textContent = biz.name;

            const dropdownKey = `adm-${biz.nif}`;
            const dotsBtn = this.#createDotsTriggerButton(dropdownKey, biz.name);

            topLine.append(nameSpan, dotsBtn, this.#createStatusBadgeElement(biz));

            const subLine = document.createElement('div');
            subLine.className = 'flex flex-wrap items-center gap-2 text-xs text-slate-500';

            const catSpan = document.createElement('span');
            catSpan.textContent = biz.category;

            const nifSpan = document.createElement('span');
            nifSpan.className = 'font-mono font-semibold text-slate-700';
            nifSpan.textContent = `NIF: ${biz.nif}`;

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.dataset.copyNfc = biz.nif;
            copyBtn.className = 'text-indigo-600 hover:text-indigo-800 font-semibold underline';
            copyBtn.textContent = `Copiar Link NFC (?nif=${biz.nif})`;

            subLine.append(catSpan, nifSpan, copyBtn);
            metaCol.append(topLine, subLine);
            left.appendChild(metaCol);

            // Controlos de Administração
            const controls = document.createElement('div');
            controls.className = 'flex flex-wrap items-center gap-1.5 flex-shrink-0';

            const statusSelect = document.createElement('select');
            statusSelect.dataset.adminStatusSelect = biz.id || '';
            statusSelect.className =
                'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer';
            [
                { value: 'active', label: '✅ Ativo' },
                { value: 'trial', label: '🎁 1º Mês Grátis' },
                { value: 'inactive', label: '⏸️ Inativo' }
            ].forEach((optData) => {
                const opt = document.createElement('option');
                opt.value = optData.value;
                opt.textContent = optData.label;
                if (biz.status === optData.value) opt.selected = true;
                statusSelect.appendChild(opt);
            });

            const openLink = document.createElement('a');
            openLink.href = `?nif=${encodeURIComponent(biz.nif)}`;
            openLink.className =
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 transition';
            openLink.textContent = '🔗 Abrir';

            const qrBtn = document.createElement('button');
            qrBtn.type = 'button';
            qrBtn.dataset.companyNif = biz.nif;
            qrBtn.dataset.qrAction = 'open';
            qrBtn.className =
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition';
            qrBtn.textContent = '📱 Placa / QR';

            const reportBtn = document.createElement('button');
            reportBtn.type = 'button';
            reportBtn.dataset.companyId = biz.id || '';
            reportBtn.dataset.companyNif = biz.nif;
            reportBtn.dataset.reportAction = 'open';
            reportBtn.className =
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition';
            reportBtn.textContent = '📊 Relatório 3D';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.dataset.adminEdit = biz.id || '';
            editBtn.className =
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition';
            editBtn.textContent = '✏️ Editar';

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.dataset.adminDelete = biz.id || '';
            deleteBtn.className =
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition';
            deleteBtn.textContent = '🗑️';

            controls.append(statusSelect, openLink, qrBtn, reportBtn, editBtn, deleteBtn);
            row.append(left, controls, this.#createDotsDropdownElement(dropdownKey, biz));
            container.appendChild(row);
        });
    }

    /**
     * Fecha todos os menus dropdown de 3 pontinhos abertos.
     * @returns {void}
     */
    closeAllDropdowns() {
        document.querySelectorAll('.company-dots-dropdown').forEach((el) => el.classList.add('hidden'));
        if (this.elements.mainClientDropdown) {
            this.elements.mainClientDropdown.classList.add('hidden');
        }
    }

    /**
     * Abre e preenche o Modal de Relatório Mensal 3D com KPIs, críticas e gráficos.
     * @param {Object} report - Dados agregados devolvidos por `ReviewService.getMonthlyReport`.
     * @returns {void}
     */
    renderReportModal(report) {
        const { client } = report;
        this.elements.reportClientLogo.src =
            client.logoUrl ||
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80';
        this.elements.reportClientName.textContent = client.name;
        this.elements.reportClientNif.textContent = `NIF: ${client.nif}`;

        this.elements.kpiTotal.textContent = String(report.total);
        this.elements.kpiAverage.textContent = `${report.avgRating.toFixed(1)} ★`;
        this.elements.kpiPositive.textContent = String(report.positiveCount);
        this.elements.kpiPositiveRate.textContent = `${report.positiveRate}% redirecionadas`;
        this.elements.kpiComplaints.textContent = String(report.complaintsCount);
        this.elements.reportSqlCode.textContent = report.sqlQuery;

        this.#renderComplaintsListSafe(report.complaintsList, client?.name);

        this.elements.reportModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.renderReportCharts3D(report);
        });
    }

    /**
     * Renderiza a lista de reclamações no modal usando `createElement` e `textContent` (proteção contra XSS).
     * @param {import('../models/Review.js').Review[]} complaints - Lista de reclamações (1-3 estrelas).
     * @returns {void}
     */
    #renderComplaintsListSafe(complaints, clientName = 'estabelecimento') {
        const container = this.elements.complaintsContainer;
        if (!container) return;
        container.replaceChildren();

        if (!complaints || complaints.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'p-8 text-center text-xs text-slate-400';
            empty.textContent = 'Nenhuma crítica ou reclamação registada neste período.';
            container.appendChild(empty);
            return;
        }

        complaints.forEach((item) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'p-4 hover:bg-slate-50/80 transition space-y-1.5';

            const topBar = document.createElement('div');
            topBar.className = 'flex flex-wrap items-center justify-between gap-2';

            const leftGroup = document.createElement('div');
            leftGroup.className = 'flex items-center gap-2';

            const badge = document.createElement('span');
            const colorClasses =
                item.rating === 1
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : item.rating === 2
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200';
            badge.className = `inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${colorClasses}`;
            badge.textContent = `${item.rating} ★`;

            const dateSpan = document.createElement('span');
            dateSpan.className = 'text-xs font-medium text-slate-400';
            dateSpan.textContent = new Date(item.createdAt).toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            leftGroup.append(badge, dateSpan);

            const contactSpan = document.createElement('span');
            contactSpan.className = 'text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded';
            contactSpan.textContent = `Contacto: ${item.customerContact || 'Não indicado'}`;

            const rightGroup = document.createElement('div');
            rightGroup.className = 'flex items-center gap-2';
            rightGroup.appendChild(contactSpan);

            const digitsOnly = String(item.customerContact || '').replace(/\D/g, '');
            if (digitsOnly.length >= 9) {
                const cleanPhone = digitsOnly.length === 9 ? `351${digitsOnly}` : digitsOnly;
                const businessName = clientName || 'estabelecimento';
                const waText = encodeURIComponent(
                    `Olá! Somos da gerência do ${businessName}. Lemos o seu comentário confidencial e gostaríamos de pedir as mais sinceras desculpas pelo sucedido. Como podemos compensar a sua experiência?`
                );
                const waBtn = document.createElement('a');
                waBtn.href = `https://wa.me/${cleanPhone}?text=${waText}`;
                waBtn.target = '_blank';
                waBtn.rel = 'noopener noreferrer';
                waBtn.className =
                    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition';
                waBtn.innerHTML = '<span>💬</span><span>WhatsApp</span>';
                rightGroup.appendChild(waBtn);
            }

            topBar.append(leftGroup, rightGroup);

            const commentP = document.createElement('p');
            commentP.className = 'text-sm text-slate-800 leading-relaxed';
            commentP.textContent = `"${item.comment || 'Sem comentário escrito.'}"`;

            wrapper.append(topBar, commentP);
            container.appendChild(wrapper);
        });
    }

    /**
     * Abre e preenche os dados do Modal Executivo de Envio de E-mail.
     * @param {{ recipient: string, subject: string, body: string, pdfFilename: string }} emailData
     * @returns {void}
     */
    openEmailDispatchModal(emailData) {
        if (!this.elements.emailDispatchModal) return;

        if (this.elements.emailModalRecipient) {
            this.elements.emailModalRecipient.textContent = emailData.recipient;
        }
        if (this.elements.emailModalSubject) {
            this.elements.emailModalSubject.textContent = emailData.subject;
        }
        if (this.elements.emailModalPdfName) {
            this.elements.emailModalPdfName.textContent = emailData.pdfFilename;
        }
        if (this.elements.emailModalBody) {
            this.elements.emailModalBody.textContent = emailData.body;
        }

        if (this.elements.emailCopyFeedback) {
            this.elements.emailCopyFeedback.classList.add('hidden');
        }

        this.elements.emailDispatchModal.classList.remove('hidden');
    }

    /**
     * Fecha o Modal Executivo de Envio de E-mail.
     * @returns {void}
     */
    closeEmailDispatchModal() {
        if (this.elements.emailDispatchModal) {
            this.elements.emailDispatchModal.classList.add('hidden');
        }
    }

    /**
     * Abre e preenche o Modal de QR Code e Placa de Mesa Oficial com o link híbrido (NFC + QR).
     * @param {import('../models/Business.js').Business} business - Instância do estabelecimento.
     * @param {string} fullUrl - URL oficial gravado no QR Code.
     * @returns {void}
     */
    openQrModal(business, fullUrl) {
        if (!this.elements.qrModal) return;

        if (this.elements.qrModalClientName) {
            this.elements.qrModalClientName.textContent = business.name;
        }

        if (this.elements.qrModalNif) {
            this.elements.qrModalNif.textContent = `NIF: ${business.nif}`;
        }

        if (this.elements.qrModalUrlInput) {
            this.elements.qrModalUrlInput.value = fullUrl;
        }

        if (this.elements.qrCopyFeedback) {
            this.elements.qrCopyFeedback.classList.add('hidden');
        }

        // Logótipo ou Iniciais
        if (this.elements.qrModalLogo && this.elements.qrModalInitials) {
            if (business.logoUrl) {
                this.elements.qrModalLogo.src = business.logoUrl;
                this.elements.qrModalLogo.classList.remove('hidden');
                this.elements.qrModalInitials.classList.add('hidden');
                this.elements.qrModalLogo.onerror = () => {
                    this.elements.qrModalLogo.classList.add('hidden');
                    this.elements.qrModalInitials.textContent = business.getInitials();
                    this.elements.qrModalInitials.classList.remove('hidden');
                };
            } else {
                this.elements.qrModalLogo.classList.add('hidden');
                this.elements.qrModalInitials.textContent = business.getInitials();
                this.elements.qrModalInitials.classList.remove('hidden');
            }
        }

        // Renderizar o QR Code no Canvas em alta definição (600x600)
        if (this.elements.qrCodeCanvas) {
            QRCode.renderToCanvas(this.elements.qrCodeCanvas, fullUrl, 600);
        }

        this.elements.qrModal.classList.remove('hidden');
    }

    /**
     * Fecha o Modal de QR Code e Placa de Mesa Oficial.
     * @returns {void}
     */
    closeQrModal() {
        if (this.elements.qrModal) {
            this.elements.qrModal.classList.add('hidden');
        }
    }

    /**
     * Apresenta temporariamente a indicação de texto copiado no modal.
     * @returns {void}
     */
    showEmailCopyFeedback() {
        const feedback = this.elements.emailCopyFeedback;
        if (!feedback) return;
        feedback.classList.remove('hidden');
        setTimeout(() => feedback.classList.add('hidden'), 2500);
    }

    /**
     * Atualiza o estado de envio automático no botão do modal.
     * @param {boolean} isSending - `true` se estiver a processar o envio via Gmail.
     * @param {string} [loadingText='A enviar via Gmail...'] - Texto a apresentar no botão.
     * @returns {void}
     */
    setEmailSendingState(isSending, loadingText = 'A enviar via Gmail...') {
        if (this.elements.btnAutoSendGmail) {
            this.elements.btnAutoSendGmail.disabled = isSending;
        }
        if (this.elements.autoSendGmailText) {
            this.elements.autoSendGmailText.textContent = isSending ? loadingText : 'Enviar Automático (Gmail)';
        }
    }

    /**
     * Define ou limpa o alerta de estado de envio de e-mail no modal.
     * @param {'success'|'error'|null} type - Tipo de alerta.
     * @param {string} [message=''] - Mensagem informativa.
     * @returns {void}
     */
    setEmailStatusAlert(type, message = '') {
        const alertEl = this.elements.emailSendStatusAlert;
        if (!alertEl) return;

        if (!type || !message) {
            alertEl.textContent = '';
            alertEl.className = 'hidden rounded-xl p-3.5 text-xs font-semibold';
            return;
        }

        alertEl.textContent = message;
        if (type === 'success') {
            alertEl.className = 'rounded-xl p-3.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
        } else {
            alertEl.className = 'rounded-xl p-3.5 text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200';
        }
    }

    /**
     * Desenha os 2 gráficos 3D estilo Excel (Colunas 3D e Circular 3D).
     * @param {Object} report - Dados agregados do relatório.
     * @returns {void}
     */
    renderReportCharts3D(report) {
        this.#drawExcel3DColumnsChart(this.elements.canvasStarsBar, report);
        this.#drawExcel3DPieChart(this.elements.canvasFilterDoughnut, report);
    }

    /**
     * Prepara um elemento `<canvas>` com resolução HiDPI/Retina.
     * @param {HTMLCanvasElement} canvas
     * @returns {{ ctx: CanvasRenderingContext2D, width: number, height: number }}
     */
    #prepareHiDPICanvas(canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(rect.width || 360, 280);
        const height = Math.max(rect.height || 240, 220);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, width, height };
    }

    /**
     * Desenha o Gráfico de Colunas 3D estilo Excel.
     * @param {HTMLCanvasElement|null} canvas
     * @param {Object} report
     * @returns {void}
     */
    #drawExcel3DColumnsChart(canvas, report) {
        if (!canvas) return;
        const { ctx, width, height } = this.#prepareHiDPICanvas(canvas);
        ctx.clearRect(0, 0, width, height);

        const items = [
            { label: '5 ★', value: report.starsBreakdown[5] || 0, front: '#10b981', top: '#6ee7b7', side: '#047857' },
            { label: '4 ★', value: report.starsBreakdown[4] || 0, front: '#22c55e', top: '#86efac', side: '#15803d' },
            { label: '3 ★', value: report.starsBreakdown[3] || 0, front: '#f59e0b', top: '#fcd34d', side: '#b45309' },
            { label: '2 ★', value: report.starsBreakdown[2] || 0, front: '#f97316', top: '#fdba74', side: '#c2410c' },
            { label: '1 ★', value: report.starsBreakdown[1] || 0, front: '#f43f5e', top: '#fda4af', side: '#be123c' }
        ];

        const maxVal = Math.max(...items.map((i) => i.value), 4);
        const depthX = 14;
        const depthY = -10;

        const chartLeft = 38;
        const chartRight = width - 26;
        const chartTop = 34;
        const chartBottom = height - 38;
        const chartWidth = chartRight - chartLeft;
        const chartHeight = chartBottom - chartTop;

        ctx.save();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(chartLeft + depthX, chartTop + depthY);
        ctx.lineTo(chartRight + depthX, chartTop + depthY);
        ctx.lineTo(chartRight + depthX, chartBottom + depthY);
        ctx.lineTo(chartLeft + depthX, chartBottom + depthY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(chartLeft, chartBottom);
        ctx.lineTo(chartLeft + depthX, chartBottom + depthY);
        ctx.lineTo(chartRight + depthX, chartBottom + depthY);
        ctx.lineTo(chartRight, chartBottom);
        ctx.closePath();
        ctx.fill();

        const steps = 4;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';

        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const y = chartBottom - ratio * chartHeight;
            ctx.beginPath();
            ctx.moveTo(chartLeft, y);
            ctx.lineTo(chartLeft + depthX, y + depthY);
            ctx.lineTo(chartRight + depthX, y + depthY);
            ctx.stroke();
            ctx.fillText(String(Math.round(ratio * maxVal)), chartLeft - 6, y + 3);
        }
        ctx.restore();

        const slotWidth = chartWidth / items.length;
        const barW = Math.min(34, slotWidth * 0.48);

        items.forEach((item, idx) => {
            const barH = Math.max((item.value / maxVal) * (chartHeight - 10), item.value > 0 ? 8 : 3);
            const x = chartLeft + idx * slotWidth + (slotWidth - barW) / 2;
            const y = chartBottom - barH;

            const frontGrad = ctx.createLinearGradient(x, y, x, chartBottom);
            frontGrad.addColorStop(0, item.front);
            frontGrad.addColorStop(1, item.side);
            ctx.fillStyle = frontGrad;
            ctx.fillRect(x, y, barW, barH);

            ctx.fillStyle = item.top;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + depthX, y + depthY);
            ctx.lineTo(x + barW + depthX, y + depthY);
            ctx.lineTo(x + barW, y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = item.side;
            ctx.beginPath();
            ctx.moveTo(x + barW, y);
            ctx.lineTo(x + barW + depthX, y + depthY);
            ctx.lineTo(x + barW + depthX, chartBottom + depthY);
            ctx.lineTo(x + barW, chartBottom);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(item.value), x + barW / 2 + depthX / 2, y + depthY - 6);

            ctx.fillStyle = '#334155';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText(item.label, x + barW / 2, chartBottom + 18);
        });
    }

    /**
     * Desenha o Gráfico Circular (Pie) 3D estilo Excel com extrusão cilíndrica.
     * @param {HTMLCanvasElement|null} canvas
     * @param {Object} report
     * @returns {void}
     */
    #drawExcel3DPieChart(canvas, report) {
        if (!canvas) return;
        const { ctx, width, height } = this.#prepareHiDPICanvas(canvas);
        ctx.clearRect(0, 0, width, height);

        const pos = report.positiveCount || 0;
        const neg = report.complaintsCount || 0;
        const total = pos + neg;

        const cx = width / 2;
        const cy = height / 2 - 18;
        const rx = Math.min(width * 0.31, 108);
        const ry = rx * 0.56;
        const depth3D = 22;

        if (total === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sem avaliações registadas no período', cx, cy + 10);
            return;
        }

        const slices = [
            {
                value: pos,
                pct: Math.round((pos / total) * 100),
                topColor: '#10b981',
                highlightColor: '#34d399',
                sideColor: '#047857',
                explode: 5
            },
            {
                value: neg,
                pct: Math.round((neg / total) * 100),
                topColor: '#f43f5e',
                highlightColor: '#fb7185',
                sideColor: '#be123c',
                explode: 5
            }
        ].filter((s) => s.value > 0);

        let startAngle = -Math.PI * 0.15;
        slices.forEach((s) => {
            const sweep = (s.value / total) * Math.PI * 2;
            s.start = startAngle;
            s.end = startAngle + sweep;
            s.mid = startAngle + sweep / 2;
            startAngle += sweep;
        });

        for (let z = depth3D; z >= 0; z--) {
            const isTopFace = z === 0;
            slices.forEach((s) => {
                const offsetX = slices.length > 1 ? Math.cos(s.mid) * s.explode : 0;
                const offsetY = slices.length > 1 ? Math.sin(s.mid) * (s.explode * 0.56) : 0;
                const sx = cx + offsetX;
                const sy = cy + offsetY + z;

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.ellipse(sx, sy, rx, ry, 0, s.start, s.end);
                ctx.closePath();

                if (isTopFace) {
                    const grad = ctx.createRadialGradient(sx - rx * 0.25, sy - ry * 0.25, 6, sx, sy, rx);
                    grad.addColorStop(0, s.highlightColor);
                    grad.addColorStop(1, s.topColor);
                    ctx.fillStyle = grad;
                    ctx.fill();
                } else {
                    ctx.fillStyle = s.sideColor;
                    ctx.fill();
                }
            });
        }

        slices.forEach((s) => {
            const labelDist = slices.length === 1 ? 0 : 0.55;
            const lx = cx + Math.cos(s.mid) * (rx * labelDist + s.explode);
            const ly = cy + Math.sin(s.mid) * (ry * labelDist + s.explode * 0.56);
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${s.pct}%`, lx, ly + 4);
        });

        const legendY = height - 18;
        const legendItems = [
            { color: '#10b981', text: `Opinião no Google: ${pos} (${Math.round((pos / total) * 100)}%)` },
            { color: '#f43f5e', text: `Reclamações: ${neg} (${Math.round((neg / total) * 100)}%)` }
        ];

        ctx.font = '600 11px Inter, sans-serif';
        const spacing = width / 2;
        legendItems.forEach((leg, i) => {
            const lx = i === 0 ? spacing * 0.5 : spacing * 1.5;
            const textW = ctx.measureText(leg.text).width;
            const boxX = lx - (textW + 16) / 2;
            ctx.fillStyle = leg.color;
            ctx.fillRect(boxX, legendY - 9, 10, 10);
            ctx.fillStyle = '#334155';
            ctx.textAlign = 'left';
            ctx.fillText(leg.text, boxX + 15, legendY);
        });
    }
}

