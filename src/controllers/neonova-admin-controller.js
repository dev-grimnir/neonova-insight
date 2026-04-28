// src/controllers/neonova-admin-controller.js

class NeonovaAdminController {
    #model;

    constructor(name, phoneNumber, dashboardController) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Admin name must be a non-empty string');
        }
        this.dashboardController = dashboardController;
        this.#model = new NeonovaAdminModel(name.trim(), phoneNumber);
        this.view = new NeonovaAdminView(this);
    }

    get model() {
        return this.#model;
    }

    get name() {
        return this.#model.name;
    }

    get phoneNumber() {
        return this.#model.phoneNumber;
    }

    toJSON() {
        return this.#model.toJSON();
    }

    static fromJSON(json, dashboardController) {
        return new NeonovaAdminController(
            json.name,
            json.phoneNumber || '',
            dashboardController
        );
    }

    async remove() {
        const modalCtrl = this.dashboardController.getAdminModalController?.();
        if (modalCtrl) {
            await modalCtrl.remove(this.name);
        }
    }

    async updateName(newName) {
        const trimmed = (newName || '').trim();
        if (trimmed === '' || trimmed === this.#model.name) {
            return false;
        }

        const oldName = this.#model.name;
        this.#model.update({ name: trimmed });

        // Mirror change to the canonical plain-data list on the dashboard model
        this.dashboardController.model.removeAdmin(oldName);
        this.dashboardController.model.addOrUpdateAdmin(this.toJSON());

        await this.dashboardController.getTabController().save();
        this.view.update();
        return true;
    }

    async updatePhoneNumber(newPhoneNumber) {
        const digits = NeonovaAdminView.extractDigits(newPhoneNumber);
        if (digits.length !== 10 || digits === this.#model.phoneNumber) {
            return false;
        }

        this.#model.update({ phoneNumber: digits });
        this.dashboardController.model.addOrUpdateAdmin(this.toJSON());
        await this.dashboardController.getTabController().save();
        this.view.update();
        return true;
    }

    getRowElement() {
        return this.view.getElement();
    }
}
