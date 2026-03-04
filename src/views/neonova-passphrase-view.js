class NeonovaPassphraseView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.controller = controller;
        this.modal = null;
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

        // Bottom slide + fade
        setTimeout(() => {
            const overlay = this.modal.querySelector('#passphrase-modal');
            const box = this.modal.querySelector('.transform');
            if (overlay) overlay.classList.add('opacity-100');
            if (box) box.classList.remove('translate-y-12');
        }, 10);

        this.attachListeners();
    }

    attachListeners() {
        const input = this.modal.querySelector('#passphrase-input');
        const remember = this.modal.querySelector('#remember-cb');

        const submit = () => {
            const passphrase = input.value.trim();
            this.controller.handleSubmit(passphrase, remember.checked);
        };

        this.modal.querySelector('#unlock-btn').addEventListener('click', submit);
        this.modal.querySelector('#cancel-btn').addEventListener('click', () => this.controller.handleCancel());
        this.modal.querySelector('#passphrase-modal').addEventListener('click', e => {
            if (e.target.id === 'passphrase-modal') this.controller.handleCancel();
        });
        input.addEventListener('keypress', e => { if (e.key === 'Enter') submit(); });
    }

    hide() {
        if (!this.modal) return;
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
