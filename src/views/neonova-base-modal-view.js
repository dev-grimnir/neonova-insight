class NeonovaBaseModalView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.controller = controller;
        this.modal = null;
        this.modalReady = false;           // ← NEW: clear flag
        this._keyListener = null;
        this._originalSlideClass = null;
    }

    createModal(htmlTemplate) {
        if (this.modal) {
            this.hide();
            return;
        }

        this.modal = document.createElement('div');
        this.modal.innerHTML = htmlTemplate;
        document.body.appendChild(this.modal);

        // Capture slide class for exit animation
        const box = this.modal.querySelector('.transform');
        if (box) {
            if (box.classList.contains('-translate-y-12')) this._originalSlideClass = '-translate-y-12';
            else if (box.classList.contains('translate-y-12')) this._originalSlideClass = 'translate-y-12';
        }

        // Entrance animation
        setTimeout(() => {
            const overlay = this.modal.querySelector('div.fixed.inset-0, div[id*="modal"]') || this.modal.firstElementChild;
            if (overlay) overlay.classList.add('opacity-100');

            if (box) box.classList.remove('-translate-y-12', 'translate-y-12');

            // Mark as ready once animation starts
            this.modalReady = true;
        }, 10);

        // Escape key
        this._keyListener = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.onEscape();
            }
        };
        document.addEventListener('keydown', this._keyListener);

        this.dispatchEvent(new CustomEvent('neonova:modal-opened', {
            detail: { modalType: this.constructor.name }
        }));
    }

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
            this.modalReady = false;        // reset flag
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
