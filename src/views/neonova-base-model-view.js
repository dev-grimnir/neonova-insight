class NeonovaBaseModalView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.controller = controller;
        this.modal = null;
        this._keyListener = null;
        this._originalSlideClass = null;   // remembers -translate-y-12 or translate-y-12 so exit animation matches entrance
    }

    /**
     * Child calls this instead of duplicating the overlay/append/animation code.
     * Pass the exact same HTML string the modal already builds.
     */
    createModal(htmlTemplate) {
        if (this.modal) {
            this.hide();
            return;
        }

        this.modal = document.createElement('div');
        this.modal.innerHTML = htmlTemplate;
        document.body.appendChild(this.modal);

        // Capture original slide direction for clean exit animation
        const box = this.modal.querySelector('.transform');
        if (box) {
            if (box.classList.contains('-translate-y-12')) this._originalSlideClass = '-translate-y-12';
            else if (box.classList.contains('translate-y-12')) this._originalSlideClass = 'translate-y-12';
        }

        // Common entrance: fade + remove slide offset (works for both top-slide and bottom-slide modals)
        setTimeout(() => {
            const overlay = this.modal.querySelector('div.fixed.inset-0, div[id*="modal"]') || this.modal.firstElementChild;
            if (overlay) overlay.classList.add('opacity-100');

            if (box) box.classList.remove('-translate-y-12', 'translate-y-12');
        }, 10);

        // Common Escape listener (defaults to hide; child can override onEscape() if it needs controller.handleCancel)
        this._keyListener = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.onEscape();
            }
        };
        document.addEventListener('keydown', this._keyListener);

        // Fire the global event the dashboard will listen for
        this.dispatchEvent(new CustomEvent('neonova:modal-opened', {
            detail: { modalType: this.constructor.name }
        }));
    }

    /**
     * Child calls this (or super.hide()) when it wants to close.
     * Handles reverse animation, cleanup, and the closed event.
     */
    hide() {
        if (!this.modal) return;

        // Clean Esc listener
        if (this._keyListener) {
            document.removeEventListener('keydown', this._keyListener);
            this._keyListener = null;
        }

        // Reverse animation using the original slide direction
        const overlay = this.modal.querySelector('div.fixed.inset-0, div[id*="modal"]') || this.modal.firstElementChild;
        const box = this.modal.querySelector('.transform');

        if (overlay) overlay.classList.remove('opacity-100');
        if (box && this._originalSlideClass) {
            box.classList.add(this._originalSlideClass);
        }

        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.modal = null;
            this._originalSlideClass = null;

            // Fire the global event
            this.dispatchEvent(new CustomEvent('neonova:modal-closed', {
                detail: { modalType: this.constructor.name }
            }));
        }, 300);
    }

    /**
     * Override in a child if Escape should do something other than plain hide()
     * (e.g. passphrase calls controller.handleCancel instead of hide).
     */
    onEscape() {
        this.hide();
    }

    // Optional helper if a child wants to keep its own hide() logic for extra cleanup
    close() {
        this.hide();
    }
}
