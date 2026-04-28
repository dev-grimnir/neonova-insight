class NeonovaDashboardModel {
    constructor() {
        this.customers = [];
        this.admins = [];   // Array of plain objects: { name, phoneNumber }
        this.pollingIntervalMinutes = 1;
        this.isPollingPaused = false;
        this.lastUpdate = null;
        this.lastUpdatedDisplay = '--';
        this.settings = {
            privacyEnabled: false,
            pollingIntervalMinutes: 1,
            pollingPaused: false
        };
    }

    // ─── Customer accessors (unchanged) ─────────────────────────────────────────────
    getCustomer(username) {
        return this.customers.find(c => c.radiusUsername === username);
    }

    addOrUpdateCustomer(customerData) {
        const idx = this.customers.findIndex(c => c.radiusUsername === customerData.radiusUsername);
        if (idx >= 0) {
            this.customers[idx] = { ...this.customers[idx], ...customerData };
        } else {
            this.customers.push(customerData);
        }
    }

    removeCustomer(username) {
        this.customers = this.customers.filter(c => c.radiusUsername !== username);
    }

    getCustomersArray() {
        return [...this.customers];
    }

    // ─── Admin accessors ─────────────────────────────────────────────
    getAdmin(name) {
        return this.admins.find(a => a.name === name);
    }

    addOrUpdateAdmin(adminData) {
        const idx = this.admins.findIndex(a => a.name === adminData.name);
        if (idx >= 0) {
            this.admins[idx] = { ...this.admins[idx], ...adminData };
        } else {
            this.admins.push({ name: adminData.name, phoneNumber: adminData.phoneNumber });
        }
    }

    removeAdmin(name) {
        this.admins = this.admins.filter(a => a.name !== name);
    }

    getAdminsArray() {
        return [...this.admins];
    }

    // ─── Polling settings (unchanged) ────────────────────────────────
    async setPollingInterval(minutes) {
        const safe = Math.max(1, Math.min(60, Number(minutes)));
        this.pollingIntervalMinutes = safe;
        this.settings.pollingIntervalMinutes = safe;
        await this.saveSettings();
    }

    async togglePolling() {
        this.isPollingPaused = !this.isPollingPaused;
        this.settings.pollingPaused = this.isPollingPaused;
        await this.saveSettings();
    }

    get isPollingActive() {
        return !this.isPollingPaused;
    }

    get lastUpdateFormatted() {
        return this.lastUpdate ? this.lastUpdate.toLocaleTimeString() : 'Never';
    }

    toJSON() {
        return {
            customers: this.customers,
            admins: this.admins,
            pollingIntervalMinutes: this.pollingIntervalMinutes,
            isPollingPaused: this.isPollingPaused,
            lastUpdate: this.lastUpdate?.toISOString(),
            lastUpdatedDisplay: this.lastUpdatedDisplay
        };
    }

    // ====================== ENCRYPTED SETTINGS BLOB ======================
    async loadSettings() {
        const encrypted = localStorage.getItem('novaDashboardSettings');

        if (!encrypted) {
            const oldPrivacy = localStorage.getItem('neonova-privacy-enabled');
            const oldInterval = localStorage.getItem('novaPollingIntervalMinutes');
            const oldPaused = localStorage.getItem('novaPollingPaused');

            if (oldPrivacy !== null) this.settings.privacyEnabled = oldPrivacy === 'true';
            if (oldInterval !== null) this.settings.pollingIntervalMinutes = parseInt(oldInterval, 10) || 1;
            if (oldPaused !== null) this.settings.pollingPaused = oldPaused === 'true';

            localStorage.removeItem('neonova-privacy-enabled');
            localStorage.removeItem('novaPollingIntervalMinutes');
            localStorage.removeItem('novaPollingPaused');
            localStorage.removeItem('novaPrivacyMode');
            localStorage.removeItem('isDisplayFormSubmitted');

            await this.saveSettings();
            return;
        }

        try {
            const jsonStr = NeonovaCryptoController.decryptData(encrypted);
            const parsed = JSON.parse(jsonStr);
            this.settings = { ...this.settings, ...parsed };
        } catch (e) {
            console.warn("[Settings] Decryption failed — using defaults");
            await this.saveSettings();
        }

        this.pollingIntervalMinutes = this.settings.pollingIntervalMinutes;
        this.isPollingPaused = this.settings.pollingPaused;
    }

    async saveSettings() {
        try {
            const jsonStr = JSON.stringify(this.settings);
            const encrypted = await NeonovaCryptoController.encryptData(jsonStr);
            localStorage.setItem('novaDashboardSettings', encrypted);
        } catch (e) {
            console.error("[Settings] Encryption failed", e);
        }
    }
}
