class NeonovaDashboardController {
    #modalActive;
    #tabController;
    #adminModalController;

    constructor(model, tabController, view) {
        this.model = model;
        this.#tabController = tabController;
        this.view = view;
        this.masterPassphrase = null;
        this.initialized = false;
        this.passphraseController = null;
        this.#modalActive = false;
        this.#adminModalController = null;
    }

    showAddCustomer() {
        const addController = new NeonovaAddCustomerController(this.#tabController);
        addController.show();
    }

    showAdminModal() {
        // If already open, don't double-open
        if (this.#adminModalController?.view?.modal) return;
        this.#adminModalController = new NeonovaAdminModalController(this);
        this.#adminModalController.show();
    }

    getAdminModalController() {
        return this.#adminModalController;
    }

    static async create() {
        const model = new NeonovaDashboardModel();
        const controller = new NeonovaDashboardController(model);
        const tabController = new NeonovaTabController(controller);
        controller.#tabController = tabController;
        const view = new NeonovaDashboardView(controller);
        controller.view = view;
        await controller.initAsync();
        return controller;
    }

    mountTabView(containerEl) {
        this.#tabController.view = new NeonovaTabView(this.#tabController);
        this.#tabController.view.mount(containerEl);
    }

    getTabController() {
        return this.#tabController;
    }

    isModalActive() {
        return this.#modalActive;
    }

    #attachModalListeners() {
        document.addEventListener('neonova:modal-opened', () => {
            this.#modalActive = true;
        });
        document.addEventListener('neonova:modal-closed', (e) => {
            this.#modalActive = false;
            // Drop the admin modal reference once it's actually closed
            if (e?.detail?.modalType === 'NeonovaAdminModalView') {
                this.#adminModalController = null;
            }
        });
    }

    startPolling() {
        if (this.pollInterval) return;
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), this.model.pollingIntervalMinutes * 60 * 1000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async setPollingInterval(minutes) {
        minutes = Math.max(1, Math.min(60, parseInt(minutes) || 5));
        this.model.pollingIntervalMinutes = minutes;
        this.pollIntervalMs = this.model.pollingIntervalMinutes * 60 * 1000;
        await this.model.saveSettings();

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = setInterval(() => this.poll(), this.model.pollingIntervalMinutes * 60 * 1000);
        }
    }

    async togglePolling() {
        this.model.isPollingPaused = !this.model.isPollingPaused;

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        if (!this.model.isPollingPaused) {
            this.poll();
            this.pollInterval = setInterval(() => this.poll(), this.model.pollingIntervalMinutes * 60 * 1000);
        }

        await this.model.saveSettings();
        this.view?.render();
    }

    async initAsync() {
        if (this.initialized) return;
        this.initialized = true;

        await NeonovaCryptoController.initMasterKey();

        if (!NeonovaCryptoController.hasMasterKey) {
            this.passphraseController = new NeonovaPassphraseController(this);
            await this.passphraseController.show();
        }

        await this.#tabController.load();
        if (this.view) this.view.renderTabBar();
        await this.model.loadSettings();

        if (!this.model.isPollingPaused) this.startPolling();
        if (this.view) this.#tabController.rebuildTable();
        this.#attachModalListeners();
    }

    async poll() {
        this.#tabController.poll();
        this.model.lastUpdatedDisplay = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        this.view?.updateHeader();
    }

    isPollingActive() {
        return !this.model.isPollingPaused && !!this.pollInterval;
    }

    async updateCustomerStatus(customer) {
        try {
            let sinceDate = null;
            if (customer.lastEventTime !== null) {
                sinceDate = new Date(customer.lastEventTime);
            } else if (customer.lastUpdate) {
                const lastUpdateDate = new Date(customer.lastUpdate);
                if (!isNaN(lastUpdateDate.getTime())) sinceDate = lastUpdateDate;
            }

            const lookbackPeriods = [
                sinceDate,
                new Date(Date.now() - 1   * 24 * 60 * 60 * 1000),
                new Date(Date.now() - 7   * 24 * 60 * 60 * 1000),
                new Date(Date.now() - 30  * 24 * 60 * 60 * 1000),
                new Date(Date.now() - 90  * 24 * 60 * 60 * 1000),
                new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
                new Date(Date.now() - 335 * 24 * 60 * 60 * 1000)
            ];

            let latest = null;
            for (const trySince of lookbackPeriods) {
                latest = await NeonovaHTTPController.getLatestEntry(customer.radiusUsername, trySince);
                if (latest) break;
            }

            if (!latest) {
                if (latest === null) {
                    customer.update('Account Not Found', 0);
                    this.view.showToast('Customer not found in RADIUS', { type: 'error', duration: 5000 });
                    return;
                } else if (customer.lastEventTime !== null) {
                    const eventDate = new Date(customer.lastEventTime);
                    if (!isNaN(eventDate.getTime())) {
                        const durationSeconds = Math.floor((Date.now() - eventDate.getTime()) / 1000);
                        if (durationSeconds >= 0) customer.update(customer.status, durationSeconds);
                    }
                }
                return;
            }

            const eventDate = latest.dateObj;
            const eventMs = eventDate.getTime();
            let durationSeconds = Math.floor((Date.now() - eventMs) / 1000);
            if (durationSeconds < 0) durationSeconds = 0;

            const status = latest.status === 'Start' ? 'Connected' : 'Disconnected';
            const isNew = customer.lastEventTime === null || eventMs > customer.lastEventTime;

            if (isNew) {
                customer.update(status, durationSeconds);
                customer.lastEventTime = new Date(eventMs);
            } else {
                if (customer.lastEventTime !== null) {
                    const existingEventDate = new Date(customer.lastEventTime);
                    durationSeconds = Math.floor((Date.now() - existingEventDate.getTime()) / 1000);
                    if (durationSeconds >= 0) customer.update(customer.status, durationSeconds);
                }
            }
        } catch (err) {
            console.error('[updateCustomerStatus] error:', err);
            customer.update('Error', 0);
        }
    }
}
