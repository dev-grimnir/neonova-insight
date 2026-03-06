class NeonovaPassphraseView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.controller = controller;
        this.modal = null;
        this._keyCleanup = null;   // Will hold the Escape listener remover
    }

    show() {
        if (this.modal) this.hide();

        const html = `
<div id="passphrase-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] opacity-0 transition-opacity duration-300">
  <div class="bg-zinc-900 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 transform translate-y-12 transition-transform duration-300 border border-zinc-700">
    <h2 class="text-2xl font-bold text-emerald-400 mb-2">Encryption Passphrase</h2>
    <p class="text-zinc-400 text-sm mb-6">This encrypts your customer list on disk.</p>
    
    <input type="password" id="passphrase-input" 
           class="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 mb-6"
           placeholder="Enter passphrase..." autocomplete="new-password">

    <label class="flex items-center gap-3 text-zinc-400 text-sm mb-8 cursor-pointer">
      <input type="checkbox" id="remember-cb" class="w-5 h-5 accent-emerald-500" checked>
      Remember on this device
    </label>

    <div class="flex gap-3">
      <button id="cancel-btn" class="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium transition-colors">
        Cancel
      </button>
      <button id="unlock-btn" class="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors">
        Unlock Dashboard
      </button>
    </div>
  </div>
</div>`;

        this.modal = document.createElement('div');
        this.modal.innerHTML = html;
        document.body.appendChild(this.modal);

        // Bottom slide + fade (unchanged)
        setTimeout(() => {
            const overlay = this.modal.querySelector('#passphrase-modal');
            const box = this.modal.querySelector('.transform');
            if (overlay) overlay.classList.add('opacity-100');
            if (box) box.classList.remove('translate-y-12');
        }, 10);

        this.attachListeners();
    }

    /**
     * Attaches all listeners (existing + new keyboard support).
     * 
     * New:
     *   - Escape key anywhere on the page while modal is open → cancel with toast
     *   - Enter is already present but now uses keydown (more reliable) and preventDefault
     */
    attachListeners() {
        const input = this.modal.querySelector('#passphrase-input');
        const remember = this.modal.querySelector('#remember-cb');
        const overlay = this.modal.querySelector('#passphrase-modal');

        const submit = () => {
            const passphrase = input.value.trim();
            this.controller.handleSubmit(passphrase, remember.checked);
        };

        // Existing click listeners (unchanged)
        this.modal.querySelector('#unlock-btn').addEventListener('click', submit);
        this.modal.querySelector('#cancel-btn').addEventListener('click', () => this.controller.handleCancel());
        overlay.addEventListener('click', e => {
            if (e.target.id === 'passphrase-modal') this.controller.handleCancel();
        });

        // Improved Enter support (keydown is more reliable than keypress)
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                console.log("[NeonovaPassphraseView.input.keydown] Enter pressed — submitting");
                e.preventDefault();
                submit();
            }
        });

        // NEW: Escape key listener on document (modal-wide)
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                console.log("[NeonovaPassphraseView.escapeHandler] Escape pressed — cancelling");
                this.controller.handleCancel();
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Store cleanup function
        this._keyCleanup = () => {
            document.removeEventListener('keydown', escapeHandler);
        };
    }

    /**
     * Shows a clean temporary toast (red, top-center, auto-dismisses).
     * Called by controller on cancel/Escape when a key is required.
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-3.5 rounded-2xl shadow-2xl z-[10000] flex items-center gap-3 text-sm font-medium animate-fade-in';
        toast.innerHTML = `⚠️ ${message}`;
        document.body.appendChild(toast);

        console.log(`[NeonovaPassphraseView.showToast] displayed: "${message}"`);

        // Auto-dismiss after 2.8 seconds with smooth fade
        setTimeout(() => {
            toast.style.transition = 'all 0.4s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -10px)';
            setTimeout(() => toast.remove(), 400);
        }, 2800);
    }

    /**
     * Hides the modal and cleans up ALL listeners (including Escape).
     * Animation unchanged.
     */
    hide() {
        if (!this.modal) return;

        // Cleanup keyboard listener first
        if (this._keyCleanup) {
            console.log("[NeonovaPassphraseView.hide] cleaning up Escape listener");
            this._keyCleanup();
            this._keyCleanup = null;
        }

        const overlay = this.modal.querySelector('#passphrase-modal');
        const box = this.modal.querySelector('.transform');
        if (overlay) overlay.classList.remove('opacity-100');
        if (box) box.classList.add('translate-y-12');

        setTimeout(() => {
            if (this.modal?.parentNode) this.modal.parentNode.removeChild(this.modal);
            this.modal = null;
        }, 300);
    }
}
