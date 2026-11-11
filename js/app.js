/**
 * @fileoverview Entrypoint / Bootstrapper Principal da Aplicação (js/app.js)
 * Inicializa a aplicação com Injeção de Dependências (DI), trata erros globais via Logger
 * e gere os Event Listeners da interface.
 */

import { ENV } from './config/env.js';
import { Logger } from './core/Logger.js';
import { Router } from './core/Router.js';
import { SupabaseClient } from './core/SupabaseClient.js';
import { Business } from './models/Business.js';
import { Review } from './models/Review.js';
import { AuthService } from './services/AuthService.js';
import { BusinessService } from './services/BusinessService.js';
import { EmailService } from './services/EmailService.js';
import { ReviewService } from './services/ReviewService.js';
import { ValidatorService } from './services/ValidatorService.js';
import { UIManager } from './ui/UIManager.js';
import { PlateExporter } from './utils/PlateExporter.js';

/**
 * Classe orquestradora da aplicação GoReview (Clean Architecture / SOLID).
 */
export class App {
    /** @type {Router} */
    #router;
    /** @type {AuthService} */
    #authService;
    /** @type {BusinessService} */
    #businessService;
    /** @type {ReviewService} */
    #reviewService;
    /** @type {EmailService} */
    #emailService;
    /** @type {UIManager} */
    #ui;

    /** @type {Business|null} */
    #currentBusiness = null;
    /** @type {number} */
    #selectedRating = 0;
    /** @type {boolean} */
    #isSubmitting = false;
    /** @type {boolean} */
    #isLoggingIn = false;
    /** @type {Business[]} */
    #adminBusinesses = [];
    /** @type {string} */
    #adminFilter = 'all';
    /** @type {string} */
    #adminSearch = '';
    /** @type {boolean} */
    #slugManuallyEdited = false;
    /** @type {Business|null} */
    #reportBusiness = null;
    /** @type {Object|null} */
    #currentReportData = null;
    /** @type {Business|null} */
    #activeQrBusiness = null;

    /**
     * @param {Object} dependencies - Dependências injetadas.
     * @param {Router} dependencies.router - Instância do Router.
     * @param {AuthService} dependencies.authService - Serviço de autenticação do Administrador.
     * @param {BusinessService} dependencies.businessService - Serviço de estabelecimentos.
     * @param {ReviewService} dependencies.reviewService - Serviço de avaliações e relatórios.
     * @param {EmailService} dependencies.emailService - Serviço de e-mails executivos.
     * @param {UIManager} dependencies.uiManager - Gestor da camada de apresentação DOM.
     */
    constructor({ router, authService, businessService, reviewService, emailService, uiManager }) {
        this.#router = router;
        this.#authService = authService;
        this.#businessService = businessService;
        this.#reviewService = reviewService;
        this.#emailService = emailService;
        this.#ui = uiManager;
    }

    /**
     * Inicializa o fluxo principal da aplicação com tratamento global de exceções.
     * @returns {Promise<void>}
     */
    async init() {
        try {
            Logger.info('App', 'A iniciar aplicação GoReview (ES6 Modules)...');
            this.#bindGlobalListeners();
            this.#bindAuthListeners();
            this.#bindReportListeners();
            this.#bindAdminListeners();

            // Rota 1: Portal de Administração Interna (?admin=true) — Protegido por Login
            if (this.#router.isAdminRoute()) {
                if (this.#authService.isAuthenticated()) {
                    await this.#loadAdminPortal();
                    this.#ui.showView('admin');
                } else {
                    document.title = 'Login de Administrador | GoReview';
                    this.#ui.resetLoginForm();
                    this.#ui.showView('login');
                    setTimeout(() => this.#ui.elements.loginUsername?.focus(), 50);
                }
                return;
            }

            // Rota 2: Avaliação por NIF/Slug (?nif=509123456) — Prioridade Máxima NFC & QR (Carregamento Ultrarrápido)
            const nifParam = this.#router.getNif();
            if (nifParam) {
                const { business, error } = await this.#businessService.getByNif(nifParam);
                if (error || !business) {
                    Logger.warn('App', `Não foi possível carregar empresa para "${nifParam}": ${error}`);
                    this.#ui.showError(error || 'Estabelecimento não encontrado ou inativo.');
                    return;
                }

                this.#currentBusiness = business;
                this.#ui.renderBusinessProfile(business);
                this.#ui.setSentimentSelection(null);
                this.#ui.togglePrivateFeedbackForm(false);
                this.#bindSentimentListeners();
                this.#bindStarRatingListeners();
                this.#bindPrivateFeedbackFormListener();
                this.#ui.showView('main');
                return;
            }

            // Rota 3: Diretório Oficial de Estabelecimentos (sem ?nif= na URL)
            const { businesses: activeList } = await this.#businessService.getAll({ onlyActive: true });
            this.#ui.renderDirectoryList(activeList);
            this.#ui.showView('directory');
        } catch (fatalError) {
            Logger.error('App', 'Erro crítico durante a inicialização da aplicação:', fatalError);
            this.#ui.showError('Ocorreu um erro inesperado ao iniciar a aplicação.');
        }
    }

    /**
     * Liga os ouvintes dos botões de sentimento conversacional ("Sim, foi excelente!" e "Poderia ter sido melhor...").
     * @returns {void}
     */
    #bindSentimentListeners() {
        const { btnSentimentPositive, btnSentimentNegative } = this.#ui.elements;

        if (btnSentimentPositive && !btnSentimentPositive.dataset.bound) {
            btnSentimentPositive.dataset.bound = 'true';
            btnSentimentPositive.addEventListener('click', async () => {
                if (this.#isSubmitting) return;
                await this.#handleSentimentSelection('positive');
            });
        }

        if (btnSentimentNegative && !btnSentimentNegative.dataset.bound) {
            btnSentimentNegative.dataset.bound = 'true';
            btnSentimentNegative.addEventListener('click', async () => {
                if (this.#isSubmitting) return;
                await this.#handleSentimentSelection('negative');
            });
        }
    }

    /**
     * Processa a escolha de sentimento do cliente (Filtro Ético Conversacional).
     * @param {'positive'|'negative'} type - Tipo de sentimento escolhido.
     * @returns {Promise<void>}
     */
    async #handleSentimentSelection(type) {
        try {
            if (!this.#currentBusiness) return;

            if (type === 'positive') {
                this.#selectedRating = 5;
                this.#ui.setSentimentSelection('positive');
                this.#ui.togglePrivateFeedbackForm(false);
                this.#ui.setFeedbackFormError(null);
                this.#isSubmitting = true;

                Logger.info('App', `Cliente escolheu "Sim, foi excelente!" -> Redirecionamento 5★ para Opinião no Google de ${this.#currentBusiness.name}`);
                this.#ui.showRedirectingView(this.#currentBusiness.googleReviewUrl);

                const positiveReview = new Review({
                    businessId: this.#currentBusiness.id,
                    rating: 5,
                    comment: null,
                    customerContact: null,
                    redirectedToGoogle: true
                });

                await this.#reviewService.submitReview(positiveReview);
                this.#router.redirectTo(this.#currentBusiness.googleReviewUrl, ENV.REDIRECT_DELAY_MS);
                return;
            }

            if (type === 'negative') {
                this.#selectedRating = 2;
                this.#ui.setSentimentSelection('negative');
                this.#ui.setFeedbackFormError(null);
                this.#ui.togglePrivateFeedbackForm(true);
                Logger.info('App', `Cliente escolheu "Poderia ter sido melhor..." -> Caixa de Reclamações Interna aberta para ${this.#currentBusiness.name}`);
            }
        } catch (error) {
            Logger.error('App', 'Erro ao processar seleção de sentimento:', error);
            this.#isSubmitting = false;
        }
    }

    /**
     * Liga os eventos das estrelas de avaliação (1 a 5) e executa o Filtro Ético.
     * @returns {void}
     */
    #bindStarRatingListeners() {
        const { starButtons, starsContainer } = this.#ui.elements;

        starButtons.forEach((btn) => {
            const ratingValue = Number(btn.dataset.rating);

            btn.addEventListener('mouseenter', () => {
                if (this.#isSubmitting) return;
                this.#ui.highlightStars(ratingValue);
                this.#ui.updateRatingLabel(ratingValue);
            });

            btn.addEventListener('click', async () => {
                if (this.#isSubmitting) return;
                await this.#handleStarSelection(ratingValue);
            });
        });

        if (starsContainer) {
            starsContainer.addEventListener('mouseleave', () => {
                if (this.#isSubmitting) return;
                this.#ui.highlightStars(this.#selectedRating);
                this.#ui.updateRatingLabel(this.#selectedRating);
            });
        }
    }

    /**
     * Processa a seleção de uma classificação através do `ReviewService` (Filtro Ético).
     * @param {number} rating - Classificação escolhida (1 a 5).
     * @returns {Promise<void>}
     */
    async #handleStarSelection(rating) {
        try {
            this.#selectedRating = rating;
            this.#ui.highlightStars(rating);
            this.#ui.updateRatingLabel(rating);
            this.#ui.setFeedbackFormError(null);

            const decision = this.#reviewService.processRating(rating);
            if (!decision.isValid || !this.#currentBusiness) return;

            if (decision.shouldRedirectToGoogle) {
                this.#ui.togglePrivateFeedbackForm(false);
                this.#isSubmitting = true;
                this.#ui.showRedirectingView(this.#currentBusiness.googleReviewUrl);

                const positiveReview = new Review({
                    businessId: this.#currentBusiness.id,
                    rating,
                    comment: null,
                    customerContact: null,
                    redirectedToGoogle: true
                });

                await this.#reviewService.submitReview(positiveReview);
                this.#router.redirectTo(this.#currentBusiness.googleReviewUrl, ENV.REDIRECT_DELAY_MS);
                return;
            }

            if (decision.shouldOpenPrivateForm) {
                this.#ui.togglePrivateFeedbackForm(true);
            }
        } catch (error) {
            Logger.error('App', 'Erro ao processar seleção de estrelas:', error);
            this.#isSubmitting = false;
        }
    }

    /**
     * Liga o evento de submissão do formulário da Caixa de Reclamações Interna (1 a 3 estrelas).
     * @returns {void}
     */
    #bindPrivateFeedbackFormListener() {
        const { feedbackForm, feedbackComment, feedbackContact } = this.#ui.elements;
        if (!feedbackForm) return;

        feedbackForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (this.#isSubmitting || !this.#currentBusiness) return;

            try {
                const sanitizedComment = ValidatorService.sanitizeText(feedbackComment.value, 1000);
                const sanitizedContact = ValidatorService.sanitizeText(feedbackContact.value, 160);

                if (!sanitizedComment) {
                    this.#ui.setFeedbackFormError(
                        'Por favor, descreva a sua reclamação ou sugestão para que a gerência possa analisar.'
                    );
                    feedbackComment.focus();
                    return;
                }

                this.#isSubmitting = true;
                this.#ui.setFeedbackFormError(null);
                this.#ui.setSubmittingState(true);

                const complaintModel = new Review({
                    businessId: this.#currentBusiness.id,
                    rating: this.#selectedRating,
                    comment: sanitizedComment,
                    customerContact: sanitizedContact || null,
                    redirectedToGoogle: false
                });

                const { success, error } = await this.#reviewService.submitReview(complaintModel);
                this.#isSubmitting = false;
                this.#ui.setSubmittingState(false);

                if (!success || error) {
                    this.#ui.setFeedbackFormError(
                        error || 'Não foi possível registar a sua reclamação. Tente novamente.'
                    );
                    return;
                }

                // Disparo em tempo real do Alerta Crítico para o Proprietário com atalho WhatsApp
                this.#emailService.sendComplaintAlert({
                    business: this.#currentBusiness,
                    rating: this.#selectedRating,
                    comment: sanitizedComment,
                    customerContact: sanitizedContact || null
                }).catch((alertErr) => {
                    Logger.warn('App', 'Erro ao processar disparo de alerta em tempo real:', alertErr);
                });

                this.#ui.showView('thankYou');
            } catch (error) {
                this.#isSubmitting = false;
                this.#ui.setSubmittingState(false);
                Logger.error('App', 'Exceção ao submeter reclamação privada:', error);
                this.#ui.setFeedbackFormError('Ocorreu um erro inesperado ao enviar a mensagem.');
            }
        });
    }

    /**
     * Liga eventos de relatórios (3 pontinhos `⋯`, exportação PDF, CSV, SQL e gráficos 3D).
     * @returns {void}
     */
    #bindReportListeners() {
        const el = this.#ui.elements;

        if (el.mainClientMenuBtn) {
            el.mainClientMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = el.mainClientDropdown.classList.contains('hidden');
                this.#ui.closeAllDropdowns();
                if (isHidden) {
                    el.mainClientDropdown.classList.remove('hidden');
                }
            });
        }

        document.addEventListener('click', async (e) => {
            const toggleBtn = e.target.closest('[data-dots-toggle]');
            if (toggleBtn) {
                e.preventDefault();
                e.stopPropagation();
                const key = toggleBtn.getAttribute('data-dots-toggle');
                const dropdown = document.getElementById(`dropdown-${key}`);
                const wasHidden = dropdown && dropdown.classList.contains('hidden');
                this.#ui.closeAllDropdowns();
                if (dropdown && wasHidden) {
                    dropdown.classList.remove('hidden');
                }
                return;
            }

            const actionBtn = e.target.closest('[data-report-action]');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                const action = actionBtn.getAttribute('data-report-action');
                const companyNif = actionBtn.getAttribute('data-company-nif');
                this.#ui.closeAllDropdowns();

                let targetBusiness = this.#currentBusiness;
                if (companyNif) {
                    const { businesses } = await this.#businessService.getAll({ onlyActive: false });
                    targetBusiness = businesses.find((b) => b.nif === companyNif) || null;
                }

                if (targetBusiness) {
                    if (action === 'qr') {
                        this.#openQrModalForBusiness(targetBusiness);
                        return;
                    }
                    await this.#executeReportAction(targetBusiness, action);
                }
                return;
            }

            this.#ui.closeAllDropdowns();
        });

        if (el.reportMonthSelect) {
            el.reportMonthSelect.addEventListener('change', async () => {
                if (this.#reportBusiness) {
                    await this.#openReportModal(this.#reportBusiness, el.reportMonthSelect.value);
                }
            });
        }

        if (el.btnCloseReport) {
            el.btnCloseReport.addEventListener('click', () => el.reportModal.classList.add('hidden'));
        }

        if (el.reportModal) {
            el.reportModal.addEventListener('click', (e) => {
                if (e.target === el.reportModal) el.reportModal.classList.add('hidden');
            });
        }

        if (el.btnExportPdf) {
            el.btnExportPdf.addEventListener('click', () => this.#downloadReportAsPdf());
        }

        if (el.btnSendEmailReport) {
            el.btnSendEmailReport.addEventListener('click', () => this.#handleSendReportEmail());
        }

        if (el.btnMailtoClient) {
            el.btnMailtoClient.addEventListener('click', (e) => {
                e.preventDefault();
                this.#handleSendReportEmail();
            });
        }

        if (el.btnAutoSendGmail) {
            el.btnAutoSendGmail.addEventListener('click', async () => {
                await this.#executeAutomatedGmailSend();
            });
        }

        if (el.btnCopyEmailBody) {
            el.btnCopyEmailBody.addEventListener('click', async () => {
                if (!this.#currentReportData) return;
                const emailData = this.#emailService.prepareReportEmail(this.#currentReportData);
                const success = await this.#emailService.copyToClipboard(emailData.body);
                if (success) {
                    this.#ui.showEmailCopyFeedback();
                }
            });
        }

        if (el.btnDownloadReportPdf) {
            el.btnDownloadReportPdf.addEventListener('click', () => {
                this.#downloadReportAsPdf();
            });
        }

        if (el.btnCloseEmailModal) {
            el.btnCloseEmailModal.addEventListener('click', () => {
                this.#ui.closeEmailDispatchModal();
            });
        }

        if (el.emailDispatchModal) {
            el.emailDispatchModal.addEventListener('click', (e) => {
                if (e.target === el.emailDispatchModal) {
                    this.#ui.closeEmailDispatchModal();
                }
            });
        }

        if (el.btnExportCsv) {
            el.btnExportCsv.addEventListener('click', () => {
                if (this.#currentReportData) this.#downloadCsv(this.#currentReportData);
            });
        }

        if (el.btnExportSql) {
            el.btnExportSql.addEventListener('click', () => {
                if (this.#currentReportData) this.#downloadSql(this.#currentReportData);
            });
        }

        if (el.btnCopySql) {
            el.btnCopySql.addEventListener('click', async () => {
                if (!this.#currentReportData) return;
                try {
                    await navigator.clipboard.writeText(this.#currentReportData.sqlQuery);
                    el.btnCopySql.textContent = 'SQL Copiado! ✓';
                    setTimeout(() => {
                        el.btnCopySql.textContent = 'Copiar SQL';
                    }, 2000);
                } catch (_) {
                    // Ignorar se clipboard não for permitido
                }
            });
        }

        window.addEventListener('resize', () => {
            if (this.#currentReportData && !el.reportModal.classList.contains('hidden')) {
                this.#ui.renderReportCharts3D(this.#currentReportData);
            }
        });
    }

    /**
     * Executa uma ação do menu de relatório (`open`, `pdf`, `csv`, `sql`).
     * @param {Business} business - Estabelecimento alvo.
     * @param {string} action - Ação pretendida.
     * @returns {Promise<void>}
     */
    async #executeReportAction(business, action) {
        const month = this.#ui.elements.reportMonthSelect ? this.#ui.elements.reportMonthSelect.value : '2026-10';
        const { report } = await this.#reviewService.getMonthlyReport(business, month);
        if (!report) return;

        this.#reportBusiness = business;
        this.#currentReportData = report;

        if (action === 'csv') {
            this.#downloadCsv(report);
            return;
        }
        if (action === 'sql') {
            this.#downloadSql(report);
            return;
        }

        await this.#openReportModal(business, month);
        if (action === 'pdf') {
            setTimeout(() => window.print(), 450);
        }
    }

    /**
     * Abre o modal de relatório 3D para um estabelecimento.
     * @param {Business} business
     * @param {string} monthFilter
     * @returns {Promise<void>}
     */
    async #openReportModal(business, monthFilter = '2026-10') {
        this.#reportBusiness = business;
        const { report } = await this.#reviewService.getMonthlyReport(business, monthFilter);
        if (!report) return;
        this.#currentReportData = report;
        this.#ui.renderReportModal(report);
    }

    /**
     * Aciona a exportação/impressão limpa do relatório oficial em PDF.
     * @returns {void}
     */
    #downloadReportAsPdf() {
        if (!this.#currentReportData) return;
        Logger.info('App', 'A iniciar exportação do relatório mensal para PDF...');
        setTimeout(() => window.print(), 250);
    }

    /**
     * Orquestra o envio do relatório executivo por e-mail:
     * Apresenta o Modal Executivo e dispara o envio automático via Gmail SMTP.
     * @returns {Promise<void>}
     */
    async #handleSendReportEmail() {
        if (!this.#currentReportData) return;
        const emailData = this.#emailService.prepareReportEmail(this.#currentReportData);

        // 1. Apresenta o Modal Executivo com o resumo completo e ações
        this.#ui.setEmailStatusAlert(null);
        this.#ui.openEmailDispatchModal(emailData);

        // 2. Aciona o disparo automático imediato via Gmail SMTP
        await this.#executeAutomatedGmailSend();
    }

    /**
     * Executa o disparo 100% automático do e-mail através da API Gmail SMTP do servidor backend.
     * @returns {Promise<void>}
     */
    async #executeAutomatedGmailSend() {
        if (!this.#currentReportData) return;

        this.#ui.setEmailStatusAlert(null);
        this.#ui.setEmailSendingState(true, 'A enviar via reviewgo29@gmail.com...');

        try {
            const result = await this.#emailService.sendAutomatedEmail(this.#currentReportData);
            this.#ui.setEmailSendingState(false);

            if (result.success) {
                this.#ui.setEmailStatusAlert('success', `✅ ${result.message}`);
            } else if (result.usedFallback) {
                this.#ui.setEmailStatusAlert(
                    'error',
                    `⚠️ O servidor de envio automático (node server.js) não está a correr. No seu terminal execute "node server.js" para que o e-mail seja disparado 100% em segundo plano sem abrir o Outlook.`
                );
            } else {
                this.#ui.setEmailStatusAlert('error', `❌ Falha no envio: ${result.message}`);
            }
        } catch (err) {
            this.#ui.setEmailSendingState(false);
            this.#ui.setEmailStatusAlert('error', `❌ Ocorreu um erro inesperado: ${err.message}`);
        }
    }

    /**
     * Carrega e atualiza a vista do Portal de Administração Interna.
     * @returns {Promise<void>}
     */
    async #loadAdminPortal() {
        const { businesses } = await this.#businessService.getAll({ onlyActive: false });
        this.#adminBusinesses = businesses;
        this.#ui.renderAdminPortal(this.#adminBusinesses, this.#adminFilter, this.#adminSearch);

        const { businesses: activeOnly } = await this.#businessService.getAll({ onlyActive: true });
        this.#ui.renderDirectoryList(activeOnly);
    }

    /**
     * Liga todos os eventos do Portal de Administração Interna (Pesquisa, Filtros e CRUD).
     * @returns {void}
     */
    #bindAdminListeners() {
        const el = this.#ui.elements;

        if (el.adminSearchInput) {
            el.adminSearchInput.addEventListener('input', (e) => {
                this.#adminSearch = e.target.value;
                this.#ui.renderAdminPortal(this.#adminBusinesses, this.#adminFilter, this.#adminSearch);
            });
        }

        el.adminFilterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.#adminFilter = btn.getAttribute('data-admin-filter') || 'all';
                el.adminFilterBtns.forEach((b) => {
                    b.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
                    b.classList.add('text-slate-600');
                });
                btn.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
                btn.classList.remove('text-slate-600');
                this.#ui.renderAdminPortal(this.#adminBusinesses, this.#adminFilter, this.#adminSearch);
            });
        });

        if (el.btnOpenCreateClient) {
            el.btnOpenCreateClient.addEventListener('click', () => this.#openClientFormModal(null));
        }

        [el.btnCloseClientForm, el.btnCancelClientForm].forEach((btn) => {
            if (btn) btn.addEventListener('click', () => el.clientFormModal.classList.add('hidden'));
        });

        if (el.clientFieldName) {
            el.clientFieldName.addEventListener('input', () => {
                if (!this.#slugManuallyEdited && !el.clientFieldId.value) {
                    el.clientFieldSlug.value = Business.slugify(el.clientFieldName.value);
                }
            });
        }

        if (el.clientFieldSlug) {
            el.clientFieldSlug.addEventListener('input', () => {
                this.#slugManuallyEdited = true;
            });
        }

        if (el.clientFieldNif) {
            el.clientFieldNif.addEventListener('input', () => {
                const nifVal = el.clientFieldNif.value.trim() || 'SEU_NIF';
                el.clientNfcPreview.textContent = this.#router.buildNfcUrl(nifVal);
            });
        }

        if (el.adminClientForm) {
            el.adminClientForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.#handleSaveClientForm();
            });
        }

        if (el.adminClientsList) {
            el.adminClientsList.addEventListener('change', async (e) => {
                const statusSelect = e.target.closest('[data-admin-status-select]');
                if (statusSelect) {
                    const id = statusSelect.getAttribute('data-admin-status-select');
                    await this.#businessService.update(id, { status: statusSelect.value });
                    await this.#loadAdminPortal();
                }
            });

            el.adminClientsList.addEventListener('click', async (e) => {
                const copyBtn = e.target.closest('[data-copy-nfc]');
                if (copyBtn) {
                    const nif = copyBtn.getAttribute('data-copy-nfc');
                    const nfcUrl = this.#router.buildNfcUrl(nif);
                    try {
                        await navigator.clipboard.writeText(nfcUrl);
                        const original = copyBtn.textContent;
                        copyBtn.textContent = 'Link Copiado! ✓';
                        setTimeout(() => {
                            copyBtn.textContent = original;
                        }, 1800);
                    } catch (_) {
                        // Ignorar
                    }
                    return;
                }

                const qrBtn = e.target.closest('[data-qr-action="open"]');
                if (qrBtn) {
                    const nif = qrBtn.getAttribute('data-company-nif');
                    const target = this.#adminBusinesses.find((b) => b.nif === nif);
                    if (target) {
                        this.#openQrModalForBusiness(target);
                    }
                    return;
                }

                const editBtn = e.target.closest('[data-admin-edit]');
                if (editBtn) {
                    const id = editBtn.getAttribute('data-admin-edit');
                    const target = this.#adminBusinesses.find((b) => b.id === id);
                    if (target) this.#openClientFormModal(target);
                    return;
                }

                const deleteBtn = e.target.closest('[data-admin-delete]');
                if (deleteBtn) {
                    const id = deleteBtn.getAttribute('data-admin-delete');
                    const target = this.#adminBusinesses.find((b) => b.id === id);
                    if (!target) return;
                    if (window.confirm(`Tem a certeza que pretende eliminar "${target.name}" (NIF: ${target.nif})?`)) {
                        await this.#businessService.delete(id);
                        await this.#loadAdminPortal();
                    }
                }
            });
        }

        // Modal QR Code & Placa de Mesa Oficial
        if (el.btnCloseQrModal) {
            el.btnCloseQrModal.addEventListener('click', () => this.#ui.closeQrModal());
        }

        if (el.qrModal) {
            el.qrModal.addEventListener('click', (e) => {
                if (e.target === el.qrModal) this.#ui.closeQrModal();
            });
        }

        if (el.btnCopyQrLink) {
            el.btnCopyQrLink.addEventListener('click', async () => {
                const url = el.qrModalUrlInput?.value;
                if (!url) return;
                try {
                    await navigator.clipboard.writeText(url);
                    if (el.qrCopyFeedback) {
                        el.qrCopyFeedback.classList.remove('hidden');
                        setTimeout(() => el.qrCopyFeedback.classList.add('hidden'), 2000);
                    }
                } catch (_) {
                    el.qrModalUrlInput.select();
                    document.execCommand('copy');
                }
            });
        }

        // Exportar Placa Gráfica de Luxo em Ultra-Alta Resolução (300 DPI) para Gráfica
        if (el.btnDownloadPlateHd) {
            el.btnDownloadPlateHd.addEventListener('click', async () => {
                if (!this.#activeQrBusiness) return;
                const fullUrl = el.qrModalUrlInput?.value || '';
                const originalHtml = el.btnDownloadPlateHd.innerHTML;

                try {
                    el.btnDownloadPlateHd.innerHTML = '<span>⏳</span><span>A Gerar Placa Gráfica 300 DPI...</span>';
                    el.btnDownloadPlateHd.disabled = true;

                    await PlateExporter.exportToPng({
                        business: this.#activeQrBusiness,
                        url: fullUrl
                    });

                    el.btnDownloadPlateHd.innerHTML = '<span>✅</span><span>Placa Gráfica Descarregada!</span>';
                    setTimeout(() => {
                        el.btnDownloadPlateHd.innerHTML = originalHtml;
                        el.btnDownloadPlateHd.disabled = false;
                    }, 2500);
                } catch (err) {
                    Logger.error('App', 'Erro ao exportar placa de mesa:', err);
                    el.btnDownloadPlateHd.innerHTML = originalHtml;
                    el.btnDownloadPlateHd.disabled = false;
                }
            });
        }

        if (el.btnDownloadQrPng) {
            el.btnDownloadQrPng.addEventListener('click', () => {
                if (!el.qrCodeCanvas) return;
                const dataUrl = el.qrCodeCanvas.toDataURL('image/png');
                const clientName = el.qrModalClientName?.textContent || 'empresa';
                const safeName = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `QRCode-GoReview-${safeName}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        }

        if (el.btnPrintTableStand) {
            el.btnPrintTableStand.addEventListener('click', () => {
                if (!el.qrCodeCanvas) return;
                const dataUrl = el.qrCodeCanvas.toDataURL('image/png');
                const clientName = el.qrModalClientName?.textContent || 'Estabelecimento';

                // Criar iframe isolado e invisível para impressão direta do QR Code (evita ecrã branco do Chrome)
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                iframe.style.zIndex = '-9999';
                document.body.appendChild(iframe);

                const frameDoc = iframe.contentWindow.document;
                frameDoc.open();
                frameDoc.write(`<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>QR Code - ${clientName}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html, body {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
        }
        .qr-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
        }
        img {
            width: 110mm;
            height: 110mm;
            max-width: 85vw;
            max-height: 85vh;
            object-fit: contain;
            image-rendering: pixelated;
        }
    </style>
</head>
<body>
    <div class="qr-wrap">
        <img src="${dataUrl}" alt="QR Code Oficial" />
    </div>
</body>
</html>`);
                frameDoc.close();

                const qrImg = frameDoc.querySelector('img');
                const triggerPrint = () => {
                    setTimeout(() => {
                        try {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                        } catch (err) {
                            Logger.warn('App', 'Fallback para window.print direto:', err);
                            document.body.classList.add('printing-qr-stand');
                            window.print();
                        } finally {
                            setTimeout(() => {
                                if (document.body.contains(iframe)) {
                                    document.body.removeChild(iframe);
                                }
                                document.body.classList.remove('printing-qr-stand');
                            }, 1000);
                        }
                    }, 120);
                };

                if (qrImg.complete) {
                    triggerPrint();
                } else {
                    qrImg.onload = triggerPrint;
                }
            });
        }
    }

    /**
     * Prepara e abre o Modal de QR Code e Placa de Mesa Oficial para uma empresa.
     * @param {import('./models/Business.js').Business} business - Empresa alvo.
     * @returns {void}
     */
    #openQrModalForBusiness(business) {
        this.#activeQrBusiness = business;
        // Obter URL oficial de produção para que as placas físicas impressas funcionem 100% online
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseOrigin = isLocal ? 'https://goreview-review.netlify.app' : window.location.origin;
        const fullUrl = `${baseOrigin}/?nif=${encodeURIComponent(business.nif)}`;

        this.#ui.openQrModal(business, fullUrl);
    }

    /**
     * Abre o modal de criação ou edição de cliente.
     * @param {Business|null} business
     * @returns {void}
     */
    #openClientFormModal(business = null) {
        const el = this.#ui.elements;
        this.#slugManuallyEdited = Boolean(business);
        el.clientFormError.classList.add('hidden');

        if (business) {
            el.clientFormTitle.textContent = `Editar Cliente — ${business.name}`;
            el.clientFieldId.value = business.id || '';
            el.clientFieldName.value = business.name;
            el.clientFieldNif.value = business.nif;
            if (el.clientFieldEmail) el.clientFieldEmail.value = business.email || '';
            el.clientFieldCategory.value = business.category;
            el.clientFieldSlug.value = business.slug;
            el.clientFieldGoogleUrl.value = business.googleReviewUrl;
            el.clientFieldLogo.value = business.logoUrl || '';
            el.clientFieldStatus.value = business.status || 'active';
        } else {
            el.clientFormTitle.textContent = 'Adicionar Novo Cliente';
            el.adminClientForm.reset();
            el.clientFieldId.value = '';
            if (el.clientFieldEmail) el.clientFieldEmail.value = '';
            el.clientFieldStatus.value = 'trial';
        }

        const nifVal = el.clientFieldNif.value.trim() || 'SEU_NIF';
        el.clientNfcPreview.textContent = this.#router.buildNfcUrl(nifVal);
        el.clientFormModal.classList.remove('hidden');
        el.clientFieldName.focus();
    }

    /**
     * Valida e grava os dados do formulário de cliente (Criar ou Atualizar).
     * @returns {Promise<void>}
     */
    async #handleSaveClientForm() {
        const el = this.#ui.elements;
        const id = el.clientFieldId.value.trim();
        const payload = {
            name: el.clientFieldName.value.trim(),
            nif: el.clientFieldNif.value.trim(),
            email: el.clientFieldEmail ? el.clientFieldEmail.value.trim() || null : null,
            category: el.clientFieldCategory.value.trim() || 'Estabelecimento',
            slug: el.clientFieldSlug.value.trim() || Business.slugify(el.clientFieldName.value),
            googleReviewUrl: el.clientFieldGoogleUrl.value.trim(),
            logoUrl: el.clientFieldLogo.value.trim() || null,
            status: el.clientFieldStatus.value
        };

        el.btnSaveClient.disabled = true;
        el.btnSaveClient.textContent = 'A guardar...';

        const result = id
            ? await this.#businessService.update(id, payload)
            : await this.#businessService.create(payload);

        el.btnSaveClient.disabled = false;
        el.btnSaveClient.textContent = 'Guardar Cliente';

        if (result.error) {
            el.clientFormError.textContent = result.error;
            el.clientFormError.classList.remove('hidden');
            return;
        }

        el.clientFormModal.classList.add('hidden');
        await this.#loadAdminPortal();
    }

    /**
     * Descarrega o ficheiro CSV (Excel) de um relatório.
     * @param {Object} report
     * @returns {void}
     */
    #downloadCsv(report) {
        const headers = ['Data_Hora', 'Estabelecimento', 'NIF', 'Estado_Conta', 'Estrelas', 'Destino', 'Critica_ou_Feedback', 'Contacto_Cliente'];
        const rows = report.allReviews.map((r) => [
            new Date(r.createdAt).toLocaleString('pt-PT'),
            report.client.name,
            report.client.nif,
            report.client.status,
            r.rating,
            r.isPositive() ? 'Opiniao no Google' : 'Caixa de Reclamacoes',
            (r.comment || '').replace(/"/g, '""'),
            (r.customerContact || '').replace(/"/g, '""')
        ]);

        const csvContent =
            '\uFEFF' +
            [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';'))].join('\r\n');

        this.#triggerFileDownload(
            csvContent,
            `relatorio-goreview-${report.client.slug}-${report.monthFilter}.csv`,
            'text/csv;charset=utf-8;'
        );
    }

    /**
     * Descarrega o script `.sql` do relatório.
     * @param {Object} report
     * @returns {void}
     */
    #downloadSql(report) {
        this.#triggerFileDownload(
            report.sqlQuery,
            `relatorio-sql-${report.client.slug}-${report.monthFilter}.sql`,
            'application/sql;charset=utf-8;'
        );
    }

    /**
     * Utilitário para despoletar download de ficheiros no browser.
     * @param {string} content
     * @param {string} filename
     * @param {string} mimeType
     * @returns {void}
     */
    #triggerFileDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Regista os Event Listeners de Autenticação do Administrador (Login, Mostrar/Ocultar Password e Logout).
     * @returns {void}
     */
    #bindAuthListeners() {
        const el = this.#ui.elements;

        if (el.btnTogglePassword) {
            el.btnTogglePassword.addEventListener('click', () => {
                this.#ui.togglePasswordVisibility();
            });
        }

        if (el.loginForm) {
            el.loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (this.#isLoggingIn) return;

                const username = el.loginUsername?.value || '';
                const password = el.loginPassword?.value || '';

                this.#isLoggingIn = true;
                this.#ui.setLoginFormError(null);
                this.#ui.setLoginSubmittingState(true);

                try {
                    const result = await this.#authService.login(username, password);
                    this.#isLoggingIn = false;
                    this.#ui.setLoginSubmittingState(false);

                    if (!result.success) {
                        this.#ui.setLoginFormError(result.error);
                        el.loginPassword?.select();
                        return;
                    }

                    this.#ui.resetLoginForm();
                    await this.#loadAdminPortal();
                    this.#ui.showView('admin');
                } catch (err) {
                    this.#isLoggingIn = false;
                    this.#ui.setLoginSubmittingState(false);
                    Logger.error('App', 'Erro ao autenticar administrador:', err);
                    this.#ui.setLoginFormError('Ocorreu um erro inesperado ao validar o login.');
                }
            });
        }

        if (el.btnAdminLogout) {
            el.btnAdminLogout.addEventListener('click', () => {
                this.#authService.logout();
                document.title = 'Login de Administrador | GoReview';
                this.#ui.resetLoginForm();
                this.#ui.showView('login');
                setTimeout(() => this.#ui.elements.loginUsername?.focus(), 50);
            });
        }
    }

    /**
     * Regista listeners globais para captura de erros não tratados na janela.
     * @returns {void}
     */
    #bindGlobalListeners() {
        window.addEventListener('error', (event) => {
            Logger.error('GlobalError', 'Erro não capturado na janela:', event.error || event.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
            Logger.error('UnhandledPromise', 'Rejeição de Promise não tratada:', event.reason);
        });
    }
}

// ============================================================================
// BOOTSTRAPPER (INJEÇÃO DE DEPENDÊNCIAS RESILIENTE A QUALQUER SERVIDOR/LIVE SERVER)
// ============================================================================
const bootstrap = () => {
    try {
        const supabaseSingleton = SupabaseClient.getInstance();
        const router = new Router(window.location.search);
        const authService = new AuthService();
        const businessService = new BusinessService(supabaseSingleton);
        const reviewService = new ReviewService(supabaseSingleton);
        const emailService = new EmailService();
        const uiManager = new UIManager();

        const app = new App({
            router,
            authService,
            businessService,
            reviewService,
            emailService,
            uiManager
        });

        app.init();
    } catch (bootstrapError) {
        Logger.error('Bootstrapper', 'Falha crítica no arranque dos módulos:', bootstrapError);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
