// src/views/neonova-customer-view.js

class NeonovaCustomerView extends BaseNeonovaView {
    #controller;        
    #tr;                // the <tr> this view fully owns
    #isEditing = false;

    constructor(controller) {
        super();  // pulls in BaseNeonovaView constructor (theme, etc.)
        this.#controller = controller;

        this.#tr = document.createElement('tr');
        this.#tr.className = 'hover:bg-gray-800/50 transition-colors duration-100';

        this.#renderContent();
        this.#attachListeners();
    }

    getElement() {
        return this.#tr;
    }

    // Called on poll updates — refresh only this row
    update() {
        this.#renderContent();
    }

    #renderContent() {
        const cust = this.#controller.customer;
        const isConnected = cust.status === 'Connected';

        const statusBg = isConnected ? 'bg-green-900/40' : 'bg-red-900/40';
        const statusText = isConnected ? 'text-green-300' : 'text-red-300';
        const statusBorder = isConnected ? 'border-green-700/50' : 'border-red-700/50';
        const dotBg = isConnected ? 'bg-green-400' : 'bg-red-400';

        const friendlyName = cust.friendlyName || cust.radiusUsername;
        const durationStr = typeof cust.getDurationStr === 'function' 
            ? cust.getDurationStr() 
            : '—';

        this.#tr.innerHTML = `
            <td class="px-2 py-1 text-sm text-gray-200 whitespace-nowrap">
                <span class="friendly-name cursor-pointer select-none" title="Click to edit name">
                    ${friendlyName}
                </span>
            </td>
            <td class="px-2 py-1 text-sm text-gray-400 font-mono">${cust.radiusUsername}</td>
            <td class="px-2 py-1">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusBg} ${statusText} ${statusBorder}">
                    <span class="flex h-2 w-2 rounded-full ${dotBg} ring-1 ring-offset-1 ring-offset-gray-900"></span>
                    ${cust.status}
                </span>
            </td>
            <td class="px-2 py-1 text-sm text-gray-300">${durationStr}</td>
            <td class="px-2 py-1 text-right space-x-1.5">
                <button class="remove-btn text-xs px-2.5 py-0.5 bg-red-800/50 hover:bg-red-700/60 text-red-200 rounded border border-red-600/40 transition-colors">
                    Remove
                </button>
                <button class="report-btn text-xs px-2.5 py-0.5 bg-blue-800/50 hover:bg-blue-700/60 text-blue-200 rounded border border-blue-600/40 transition-colors">
                    Report
                </button>
            </td>
        `;

        // If we were in edit mode, re-apply it (edge case during rapid updates)
        if (this.#isEditing) {
            this.#enterEditMode();
        }
    }

    #attachListeners() {
        // Single click on friendly name starts edit
        this.#tr.addEventListener('click', (e) => {
            const nameSpan = e.target.closest('.friendly-name');
            if (nameSpan && !this.#isEditing) {
                e.preventDefault();
                this.#enterEditMode();
                return;
            }

            if (e.target.closest('.remove-btn')) {
                e.preventDefault();
                this.#controller.remove();
            }

            if (e.target.closest('.report-btn')) {
                e.preventDefault();
                this.#controller.launchReport();
            }
        });

        // Commit on outside click
        const handleOutside = (e) => {
            if (this.#isEditing && !this.#tr.contains(e.target)) {
                this.#commitEdit();
            }
        };
        document.addEventListener('click', handleOutside);

        // Keyboard commit/cancel
        this.#tr.addEventListener('keydown', (e) => {
            if (!this.#isEditing) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                this.#commitEdit();
            } else if (e.key === 'Escape') {
                this.#cancelEdit();
            }
        });

        // Basic cleanup when row is removed from DOM
        this.#tr.addEventListener('remove', () => {
            document.removeEventListener('click', handleOutside);
        }, { once: true });
    }

    #enterEditMode() {
        this.#isEditing = true;
        const nameCell = this.#tr.querySelector('.friendly-name');
        const current = this.#controller.customer.friendlyName || this.#controller.customer.radiusUsername;

        nameCell.innerHTML = `
            <input type="text" class="bg-gray-700 text-gray-100 text-sm px-1.5 py-0.5 rounded border border-blue-500/60 w-full focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                   value="${current.replace(/"/g, '&quot;')}" 
                   autofocus spellcheck="false">
        `;

        const input = nameCell.querySelector('input');
        if (input) {
            input.select();
            input.focus();
        }
    }

    #commitEdit() {
        if (!this.#isEditing) return;
        this.#isEditing = false;

        const input = this.#tr.querySelector('input');
        if (input) {
            const newName = input.value;
            this.#controller.updateFriendlyName(newName);
        }

        this.#renderContent();  // show updated value (or revert if empty)
    }

    #cancelEdit() {
        if (!this.#isEditing) return;
        this.#isEditing = false;
        this.#renderContent();
    }

    // Optional: expose a destroy method if you want explicit cleanup later
    destroy() {
        this.#tr.remove();
        // any other cleanup if needed
    }
}
