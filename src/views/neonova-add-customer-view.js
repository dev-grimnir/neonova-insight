class NeonovaAddCustomerView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.controller = controller;
        this.modal = null;
        this._keyListener = null;
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.hide();
        } else if (e.key === 'Enter') {
            // Only trigger if focus is inside the modal (not on body or elsewhere)
            if (this.modal && this.modal.contains(document.activeElement)) {
                e.preventDefault();
                const addBtn = this.modal.querySelector('#add-btn');
                if (addBtn) addBtn.click();  // simulates button click → runs validation/submit
            }
        }
    }

    /**
     * Shows the modal with top-fade animation (exactly as requested).
     * Copies style/structure of NeonovaReportProgressView / ReportOrderView:
     * dark backdrop, emerald accents, centered rounded box, close X.
     */
    show() {
        if (this.modal) this.hide();

        const html = `
            <div id="add-customer-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] opacity-0 transition-all duration-300">
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-md mx-4 overflow-hidden shadow-2xl transform -translate-y-12 transition-all duration-300">
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-zinc-700 flex items-center justify-between bg-zinc-950">
                        <h2 class="text-xl font-semibold text-white">Add New Customer</h2>
                        <button id="close-modal-btn" class="text-zinc-400 hover:text-white text-2xl leading-none">×</button>
                    </div>

                    <!-- Form -->
                    <div class="p-6 space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-zinc-400 mb-1.5">RADIUS Username <span class="text-red-400">*</span></label>
                            <input id="radius-username" type="text" 
                                   class="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 placeholder-zinc-500"
                                   placeholder="Valid Radius username" autocomplete="off">
                               <div id="username-error" class="hidden mt-2 text-sm text-red-400"></div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-zinc-400 mb-1.5">Friendly Name (optional)</label>
                            <input id="friendly-name" type="text" 
                                   class="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 placeholder-zinc-500"
                                   placeholder="John Doe - Home Office">
                        </div>
                    </div>

                    <!-- Footer buttons -->
                    <div class="px-6 py-4 border-t border-zinc-700 bg-zinc-950 flex gap-3">
                        <button id="cancel-btn"
                                class="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-2xl transition-colors">
                            Cancel
                        </button>
                        <button id="add-btn"
                                class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-2xl transition-colors">
                            Add Customer
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.modal = document.createElement('div');
        this.modal.innerHTML = html;
        document.body.appendChild(this.modal);

        // Trigger top-fade entrance
        setTimeout(() => {
            const overlay = this.modal.querySelector('#add-customer-modal');
            const box = this.modal.querySelector('.transform');
            if (overlay) overlay.classList.add('opacity-100');
            if (box) box.classList.remove('-translate-y-12');
        }, 10);

        this.attachListeners();

        this._keyListener = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this._keyListener);
    }

    attachListeners() {
        const modalEl = this.modal.querySelector('#add-customer-modal');
        const closeBtn = this.modal.querySelector('#close-modal-btn');
        const cancelBtn = this.modal.querySelector('#cancel-btn');
        const addBtn = this.modal.querySelector('#add-btn');

        const close = () => this.hide();

        closeBtn.addEventListener('click', close);
        cancelBtn.addEventListener('click', close);
        modalEl.addEventListener('click', e => {
            if (e.target === modalEl) close();
        });

        addBtn.addEventListener('click', () => {
            const usernameInput = this.modal.querySelector('#radius-username');
            const nameInput = this.modal.querySelector('#friendly-name');

            const radiusUsername = usernameInput.value.trim().replace(/\s+/g, '');
            const friendlyName = nameInput.value.trim();

            if (!radiusUsername) {
                usernameInput.classList.add('!border-red-500');
                usernameInput.focus();
                setTimeout(() => usernameInput.classList.remove('!border-red-500'), 2000);
                return;
            }

            // Hand data to controller
            this.controller.handleSubmit(radiusUsername, friendlyName);
        });
    }

    hide() {
        if (!this.modal) return;
        
        if (this._keyListener) {
            document.removeEventListener('keydown', this._keyListener);
            this._keyListener = null;
        }

        const overlay = this.modal.querySelector('#add-customer-modal');
        const box = this.modal.querySelector('.transform');

        if (overlay) overlay.classList.remove('opacity-100');
        if (box) box.classList.add('-translate-y-12');   // ← reverse slide up

        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.modal = null;
        }, 300);
    }

    showError(msg) {
        const errorEl = document.getElementById('username-error');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
            
            // Optional: flash red border on input
            const input = document.getElementById('radius-username');
            if (input) input.classList.add('border-red-500');
        } else {
            console.warn("Username error element not found");
            alert(msg); // only fallback if HTML is broken
        }   
    }

    hideError() {
        const errorEl = document.getElementById('username-error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
            
            const input = document.getElementById('radius-username');
            if (input) input.classList.remove('border-red-500');
        }
}
}
