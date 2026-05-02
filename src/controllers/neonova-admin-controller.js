class NeonovaAdminController {
    constructor(manager, name = null, phoneNumber = null, model = null) {
        this.manager = manager;
        this.model = model || new NeonovaAdminModel(
            (name || '').trim(),
            phoneNumber
        );
        this.view = new NeonovaAdminView(this);
    }

    get name() {
        return this.model.name;
    }

    get phoneNumber() {
        return this.model.phoneNumber;
    }

    async remove() {
        await this.manager.remove(this.name);

        const row = this.view.getElement();
        row?.parentNode?.removeChild(row);
    }

    async updateName(newName) {
        const trimmed = (newName || '').trim();
        if (trimmed === '' || trimmed === this.model.name) return false;
        if (this.manager.model.findAdmin(trimmed)) return false;

        this.model.update({ name: trimmed });
        await this.manager.save();
        this.view.update();
        return true;
    }

    async updatePhoneNumber(newPhoneNumber) {
        const digits = NeonovaAdminManagerView.extractDigits(newPhoneNumber);
        if (digits.length !== 10 || digits === this.model.phoneNumber) return false;

        this.model.update({ phoneNumber: digits });
        await this.manager.save();
        this.view.update();
        return true;
    }

    getRowElement() {
        return this.view.getElement();
    }
}
