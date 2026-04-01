class NeonovaPassphraseController {
    constructor(dashboardController) {
        this.dashboardController = dashboardController;
        this.view = new NeonovaPassphraseView(this);
    }

    show() {
        return new Promise(resolve => {
            this._resolve = resolve;
            this.view.show();
        });
    }

    /**
     * Called on Unlock button or Enter key.
     * Enforces passphrase is REQUIRED — no plaintext option.
     */
    async handleSubmit(passphrase, rememberDevice) {
        if (!passphrase) {
            console.warn("[NeonovaPassphraseController.handleSubmit] empty passphrase — showing required toast");
            this.view.showToast("A key is required to unlock the dashboard");
            return; // Keep modal open
        }

        console.log("[NeonovaPassphraseController.handleSubmit] valid passphrase — unlocking");
        await NeonovaCryptoController.setPassphrase(passphrase, rememberDevice);
        this.view.hide();
        this._resolve(passphrase);
    }

    /**
     * Called on Cancel button, Escape key, or click outside.
     * Shows the required-key toast then closes the modal.
     */
    handleCancel() {
        console.log("[NeonovaPassphraseController.handleCancel] user cancelled — showing required key toast");
        this.view.showToast("A key is required to unlock the dashboard");
    }
}
