class NeonovaAdminManagerModel {
    constructor() {
        this.admins = []; // array of NeonovaAdminController
    }

    addAdmin(adminController) {
        if (!this.admins.find(a => a.name === adminController.name)) {
            this.admins.push(adminController);
        }
    }

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

    findAdmin(name) {
        return this.admins.find(a => a.name === name);
    }

    getAdminsArray() {
        return [...this.admins];
    }
}
