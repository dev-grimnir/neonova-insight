// src/controllers/neonova-customer-controller.js

class NeonovaCustomerController {
    #model;

    constructor(radiusUsername, friendlyName = null, dashboardController) {
        this.#model = new NeonovaCustomer(radiusUsername, friendlyName);
        this.dashboardController = dashboardController;
        this.view = new NeonovaCustomerView(this);
    }

    get customer() {
        return this.customer;
    }

    // For runtime use
    get model() { return this.#model; }
    
    get radiusUsername() { return this.#model.radiusUsername; }
    
    get friendlyName() { return this.#model.friendlyName; }

        // Serialization for model storage
    toJSON() {
        return {
            radiusUsername: this.#model.radiusUsername,
            friendlyName: this.#model.friendlyName,
            status: this.#model.status,
            durationSec: this.#model.durationSec,
            lastEventTime: this.#model.lastEventTime?.toISOString(),
            // add any other fields that need persisting
        };
    }

    // Rehydrate from stored JSON
    static fromJSON(json, dashboardController) {
        const ctrl = new NeonovaCustomerController(json.radiusUsername, json.friendlyName, dashboardController);
        ctrl.#model.status = json.status || 'Unknown';
        ctrl.#model.durationSec = json.durationSec || 0;
        ctrl.#model.lastEventTime = json.lastEventTime ? new Date(json.lastEventTime) : null;
        // restore any other fields
        ctrl.view.update();  // refresh row with loaded data
        return ctrl;
    }

    // Called during polling when fresh data arrives for this customer
    updateFromPoll(data) {
        this.customer.update(data);
        // View update triggered separately by dashboard controller
    }

    remove() {
        this.dashboardController.removeCustomer(this.customer.radiusUsername);
    }

    launchReport() {
        // Create and kick off the report flow
        // Adjust constructor params to match what NeonovaReportOrderController actually expects
        // (likely customer object, username, or some config)
        new NeonovaReportOrderController(this.customer);
        // If it needs more (e.g. dashboard ref, callbacks), pass them here
        // Example: new NeonovaReportOrderController(this.customer, this.dashboardController);
    }

    updateFriendlyName(newName) {
        const trimmed = newName.trim();
        if (trimmed === '') {
            // Could show toast or just ignore; for now silently keep old
            return false;
        }
        this.customer.friendlyName = trimmed;
        this.dashboardController.save(); // persist to storage
        return true;
    }
}
