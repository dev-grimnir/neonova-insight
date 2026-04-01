// src/controllers/neonova-customer-controller.js

class NeonovaCustomerController {
    #model;  

    constructor(radiusUsername, friendlyName = null, dashboardController) {
        if (typeof radiusUsername !== 'string' || !radiusUsername.trim()) {
            throw new Error('radiusUsername must be a non-empty string');
        }
        this.#model = new NeonovaCustomerModel(radiusUsername.trim(), friendlyName);
        this.dashboardController = dashboardController;
        this.view = new NeonovaCustomerView(this);
    }

    // Main getter for the customer model (use this everywhere)
    get model() {
        return this.#model;
    }

    // Convenience getters (optional but useful)
    get radiusUsername() {
        return this.#model.radiusUsername;
    }

    get friendlyName() {
        return this.#model.friendlyName;
    }

    // Serialization - store plain JSON
    toJSON() {
        return {
            radiusUsername: this.#model.radiusUsername,
            friendlyName: this.#model.friendlyName,
            status: this.#model.status,
            durationSec: this.#model.durationSec,
            lastEventTime: this.#model.lastEventTime?.toISOString(),
            lastUpdate: this.#model.lastUpdate
            // Add any other fields you want to persist
        };
    }

    // Rehydrate from stored JSON
    static fromJSON(json, dashboardController) {
        const ctrl = new NeonovaCustomerController(json.radiusUsername, json.friendlyName, dashboardController);
        ctrl.#model.status = json.status || 'Connecting...';
        ctrl.#model.durationSec = json.durationSec || 0;
        ctrl.#model.lastEventTime = json.lastEventTime ? new Date(json.lastEventTime) : null;
        ctrl.#model.lastUpdate = json.lastUpdate || new Date().toLocaleString();
        ctrl.view.update();  // refresh row with loaded data
        return ctrl;
    }

    // Called by dashboard controller during polling
    updateFromPoll() {
        // Model was already updated externally (in updateCustomerStatus)
        // If you ever want to trigger view update here, do it:
        // this.view.update();
    }

    remove() {
        this.dashboardController.remove(this.radiusUsername);
    }

    launchReport() {
        const username = this.#model.radiusUsername;
        const friendlyName = this.#model.friendlyName || username; 
        console.log('[launchReport] Starting for:', username, friendlyName);
        new NeonovaReportOrderController(username, friendlyName);
    }

    async updateFriendlyName(newName) {
        const trimmed = newName.trim();
        if (trimmed === '') {
            return false;
        }
        this.#model.friendlyName = trimmed;

        this.dashboardController.model.addOrUpdateCustomer({
            radiusUsername: this.radiusUsername,
            friendlyName: trimmed
        });
        
        await this.dashboardController.save();
        this.view.update();  // refresh row to show new name
        return true;
    }

    // Expose the row for dashboard controller to collect
    getRowElement() {
        return this.view.getElement();
    }
}
