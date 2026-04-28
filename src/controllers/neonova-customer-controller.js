// src/controllers/neonova-customer-controller.js

class NeonovaCustomerController {
    #model;
    constructor(radiusUsername, friendlyName = null, dashboardController, initialState = null) {
        if (typeof radiusUsername !== 'string' || !radiusUsername.trim()) {
            throw new Error('radiusUsername must be a non-empty string');
        }
        this.dashboardController = dashboardController;
        this.#model = new NeonovaCustomerModel(radiusUsername.trim(), friendlyName, initialState);
        this.view = new NeonovaCustomerView(this);
    }

    get model() {
        return this.#model;
    }

    get radiusUsername() {
        return this.#model.radiusUsername;
    }

    get friendlyName() {
        return this.#model.friendlyName;
    }

    toJSON() {
        return this.#model.toJSON();
    }

    static fromJSON(json, dashboardController) {
        return new NeonovaCustomerController(
            json.radiusUsername,
            json.friendlyName,
            dashboardController,
            {
                status: json.status || 'Connecting...',
                durationSec: json.durationSec ?? 0,
                lastUpdate: json.lastUpdate,
                lastEventTime: json.lastEventTime,
                disconnectedSince: json.disconnectedSince,
                lastAlertSent: json.lastAlertSent,
                alertsSuppressed: json.alertsSuppressed,
                eventHistory: json.eventHistory
            }
        );
    }

    updateFromPoll() { /* no-op (kept for compatibility) */ }

    async remove() {
        await this.dashboardController.getTabController().remove(this.radiusUsername);
    }

    launchReport() {
        const username = this.#model.radiusUsername;
        const friendlyName = this.#model.friendlyName || username;
        console.log('[launchReport] Starting for:', username, friendlyName);
        new NeonovaReportOrderController(username, friendlyName);
    }

    open3DaySnapshot() {
        const username = this.#model.radiusUsername;
        const friendlyName = this.#model.friendlyName || username;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 3);
        startDate.setHours(0, 0, 0, 0);

        new NeonovaSnapshotController(username, friendlyName, startDate, endDate);
    }

    async updateFriendlyName(newName) {
        const trimmed = newName.trim();
        if (trimmed === '') return false;
        this.#model.friendlyName = trimmed;

        this.dashboardController.model.addOrUpdateCustomer({
            radiusUsername: this.radiusUsername,
            friendlyName: trimmed
        });

        await this.dashboardController.getTabController().save();
        this.view.update();
        return true;
    }

    async toggleAlertsSuppressed() {
        this.#model.toggleAlertsSuppressed();
        await this.dashboardController.getTabController().save();
        this.view.update();
    }

    getRowElement() {
        return this.view.getElement();
    }
}
