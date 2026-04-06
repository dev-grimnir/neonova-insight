class NeonovaTabController {
    constructor(dashboardController) {
        this.dashboardController = dashboardController;
        this.tabs = [];
        this.view = new NeonovaTabView(this);
    }

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
