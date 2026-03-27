class NeonovaBaseModalView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.controller = controller;
        this.modal = null;
        this._keyListener = null;
        this._originalSlideClass = null;
    }

    /**
     * Child calls this instead of duplicating the overlay/append/animation code.
     * Pass the exact HTML string the modal should use.
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

        // Common entrance animation
        setTimeout(() => {
            const overlay = this.modal.querySelector('div.fixed.inset-0, div[id*="modal"]') || this.modal.firstElementChild;
            if (overlay) overlay.classList.add('opacity-100');

            if (box) box.classList.remove('-translate-y-12', 'translate-y-12');
        }, 10);

        // Escape key listener
        this._keyListener = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.onEscape();
            }
        };
        document.addEventListener('keydown', this._keyListener);

        // Fire opened event
        this.dispatchEvent(new CustomEvent('neonova:modal-opened', {
            detail: { modalType: this.constructor.name }
        }));
    }

    /**
     * NEW: Reliable way for children to run code AFTER the modal is fully in the DOM.
     * Child classes should call super.show() then this.onModalReady() instead of calling render() directly.
     */
    show() {
        // Base show does nothing by default — children override and call super.createModal()
        // This method exists so we can provide a consistent ready hook.
    }

    /**
     * Called automatically after createModal() when the modal is safely queryable.
     * Override this in child classes instead of putting render() + attachListeners() directly after createModal().
     */
    onModalReady() {
        // Default: do nothing. Children override this.
        console.log(`${this.constructor.name}.onModalReady() called`);
    }

    /**
     * Child calls this (or super.hide()) when it wants to close.
     */
    hide() {
        if (!this.modal) return;

        if (this._keyListener) {
            document.removeEventListener('keydown', this._keyListener);
            this._keyListener = null;
        }

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

            this.dispatchEvent(new CustomEvent('neonova:modal-closed', {
                detail: { modalType: this.constructor.name }
            }));
        }, 300);
    }

    onEscape() {
        this.hide();
    }

    close() {
        this.hide();
    }
}
