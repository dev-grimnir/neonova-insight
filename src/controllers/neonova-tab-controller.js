class NeonovaTabController {
    constructor(dashboardController) {
        this.dashboardController = dashboardController;
        this.tabs = [];
        this.view = new NeonovaTabView(this);
    }

    //methods from dashboard controller
    createCustomerController(customer) {
        const ctrl = new NeonovaCustomerController(customer, this);
        this.customerControllers.set(customer.radiusUsername, ctrl);
        return ctrl;
    }
    
    getCustomerController(username) {
        return this.customerControllers.get(username);
    }

    #parseDurationToSeconds(durationStr) {
        if (!durationStr || durationStr === '—' || durationStr.includes('<1min')) {
            return 30;  // treat <1min as ~30s so very new sessions sort near top
        }
    
        let totalSeconds = 0;
        const parts = durationStr.match(/(\d+)([dhms])/g) || [];
    
        for (const part of parts) {
            const num = parseInt(part, 10);
            const unit = part.slice(-1);
    
            if (unit === 'd') totalSeconds += num * 86400;
            else if (unit === 'h') totalSeconds += num * 3600;
            else if (unit === 'm') totalSeconds += num * 60;
            else if (unit === 's') totalSeconds += num;
        }
    
        return totalSeconds || 0;
    }

    rebuildTable() {
        const rows = [];
        for (const ctrl of this.customerControllers.values()) {
            const row = ctrl.getRowElement();
            if (row) rows.push(row);
        }
    
        rows.sort((a, b) => {
            // Primary: disconnected first
            const aStatus = a.querySelector('td:nth-child(3)')?.textContent.trim() || '';
            const bStatus = b.querySelector('td:nth-child(3)')?.textContent.trim() || '';
    
            const aDisconnected = aStatus !== 'Connected' && aStatus !== 'Connecting...';
            const bDisconnected = bStatus !== 'Connected' && bStatus !== 'Connecting...';
    
            if (aDisconnected !== bDisconnected) {
                return aDisconnected ? -1 : 1;
            }
    
            // Secondary: among connected rows, shortest duration first
            if (!aDisconnected) {
                // Duration is always the 4th column (nth-child(4))
                const aDurationCell = a.querySelector('td:nth-child(4)')?.textContent.trim() || '';
                const bDurationCell = b.querySelector('td:nth-child(4)')?.textContent.trim() || '';
    
                // Convert to seconds (handle "<1min", "2d 3h 45m", etc.)
                const aSeconds = this.#parseDurationToSeconds(aDurationCell) || 0;
                const bSeconds = this.#parseDurationToSeconds(bDurationCell) || 0;
    
                return aSeconds - bSeconds;  // ascending = shortest first
            }
    
            return 0;  // preserve original order within same category
        });
    
        this.view.setRows(rows);
    }

    /**
     * Loads customers from localStorage using the crypto controller.
     * 
     * Now 100% delegated — no more direct decrypt calls or global masterKey.
     * If decryption fails, we clear only the customers data (never the master key).
     */
    async load() {
        const data = localStorage.getItem('novaDashboardCustomers');
        if (!data) {
            return;
        }
    
        try {
            const jsonStr = await NeonovaCryptoController.decryptData(data);
            const parsed = JSON.parse(jsonStr);
            this.model.customers = parsed.customers || [];
    
            this.customerControllers.clear();
            for (const json of this.model.customers) {
                const ctrl = NeonovaCustomerController.fromJSON(json, this);
                this.customerControllers.set(json.radiusUsername, ctrl);
            }
            
        } catch (e) {
            alert("Decryption failed. Clearing everything.");
            localStorage.removeItem('novaDashboardCustomers');
            return;
        }
    }

    /**
     * Saves customers to localStorage using the crypto controller.
     * 
     * Now fully delegated — no more global masterKey or direct encrypt calls.
     * Keeps the "protect empty" guard you already liked.
     */
    async save() {
        try {
            const customers = Array.from(this.customerControllers.values()).map(ctrl => ctrl.toJSON());
            const jsonStr = JSON.stringify({ customers });
            const encrypted = await NeonovaCryptoController.encryptData(jsonStr);
            localStorage.setItem('novaDashboardCustomers', encrypted);
        } catch (e) {
            console.error("[NeonovaDashboardController.save] Encryption failed", e);
        }
    }
    
    //methods for tab controller
    initDefaultTab() {
        const defaultTab = new NeonovaTabModel('All', true);
        this.tabs.push(defaultTab);
        this.view.render();
    }

    getActiveTab() {
        return this.tabs.find(t => t.isActive) || this.tabs[0];
    }

    addTab(label) {
        const tab = new NeonovaTabModel(label);
        this.tabs.push(tab);
        this.view.render();
        return tab;
    }

    removeTab(label) {
        if (this.tabs.length === 1) return;
        const idx = this.tabs.findIndex(t => t.label === label);
        if (idx === -1) return;

        const wasActive = this.tabs[idx].isActive;
        this.tabs.splice(idx, 1);

        if (wasActive) {
            this.tabs[0].isActive = true;
        }

        this.view.render();
    }

    switchTab(label) {
        this.tabs.forEach(t => t.isActive = t.label === label);
        this.view.render();
    }

    addCustomerToActiveTab(customerController) {
        this.getActiveTab().addCustomer(customerController);
        this.view.render();
    }

    removeCustomerFromTab(radiusUsername, label) {
        const tab = this.tabs.find(t => t.label === label);
        if (tab) tab.removeCustomer(radiusUsername);
        this.view.render();
    }

    renameTab(oldLabel, newLabel) {
        const tab = this.tabs.find(t => t.label === oldLabel);
        if (tab) tab.rename(newLabel);
        this.view.render();
    }

    async poll() {
        for (const tab of this.tabs) {
            for (const ctrl of tab.customers) {
                try {
                    await this.dashboardController.updateCustomerStatus(ctrl.model);
                    ctrl.view.update();
                } catch (err) {
                    console.error(`Poll error for ${ctrl.radiusUsername}:`, err);
                    ctrl.model.update('Error', 0);
                    ctrl.view.update();
                }
            }
        }
        this.view.render();
    }

    async save() {
        try {
            const json = JSON.stringify({ tabs: this.tabs.map(t => t.toJSON()) });
            const encrypted = await NeonovaCryptoController.encryptData(json);
            localStorage.setItem('novaDashboardTabs', encrypted);
        } catch (e) {
            console.error('[NeonovaTabController.save]', e);
        }
    }

    async load() {
        const data = localStorage.getItem('novaDashboardTabs');
        if (!data) {
            this.initDefaultTab();
            return;
        }
        try {
            const json = JSON.parse(await NeonovaCryptoController.decryptData(data));
            this.tabs = json.tabs.map(t => NeonovaTabModel.fromJSON(t, this.dashboardController));
            this.view.render();
        } catch (e) {
            console.error('[NeonovaTabController.load]', e);
            this.initDefaultTab();
        }
    }
}
