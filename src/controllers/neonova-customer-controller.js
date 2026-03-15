// src/controllers/neonova-customer-controller.js

class NeonovaCustomerController {
    constructor(customer, dashboardController) {
        if (!(customer instanceof NeonovaCustomer)) {
            throw new Error('NeonovaCustomerController requires a NeonovaCustomer instance');
        }
        this.customer = customer;
        this.dashboardController = dashboardController;
        this.view = new NeonovaCustomerView(this);
    }

    get customer() {
        return this.#customer;
    }

    get radiusUsername() {
        return this.#customer.radiusUsername;
    }

    // Called during polling when fresh data arrives for this customer
    updateFromPoll(data) {
        this.#customer.update(data);
        // View update triggered separately by dashboard controller
    }

    remove() {
        this.#dashboardController.removeCustomer(this.#customer.radiusUsername);
    }

    launchReport() {
        // Create and kick off the report flow
        // Adjust constructor params to match what NeonovaReportOrderController actually expects
        // (likely customer object, username, or some config)
        new NeonovaReportOrderController(this.#customer);
        // If it needs more (e.g. dashboard ref, callbacks), pass them here
        // Example: new NeonovaReportOrderController(this.#customer, this.#dashboardController);
    }

    updateFriendlyName(newName) {
        const trimmed = newName.trim();
        if (trimmed === '') {
            // Could show toast or just ignore; for now silently keep old
            return false;
        }
        this.#customer.friendlyName = trimmed;
        this.#dashboardController.save(); // persist to storage
        return true;
    }
}
