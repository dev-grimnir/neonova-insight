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
     * Handles passphrase submission from the modal.
     * 
     * Now 100% delegated to NeonovaCryptoController.setPassphrase().
     * No more direct deriveKey or global masterKey touching.
     * 
     * This keeps the passphrase controller extremely thin — exactly as it should be.
     */
    async handleSubmit(passphrase, rememberDevice) {
        this.view.hide();

        if (!passphrase?.trim()) {
            console.warn("[NeonovaPassphraseController.handleSubmit] Encryption disabled – plaintext mode");
            this._resolve(null);
            return;
        }

        console.log("[NeonovaPassphraseController.handleSubmit] delegating to NeonovaCryptoController.setPassphrase");

        // Delegate everything to the static crypto controller
        await NeonovaCryptoController.setPassphrase(passphrase, rememberDevice);
        
        this._resolve(passphrase);
    }

    handleCancel() {
        this.view.hide();
        this._resolve(null);
    }
}
