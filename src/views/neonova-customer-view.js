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
        const cust = this.#controller.model;
        
        // Default to safe values if somehow undefined (shouldn't happen after model defaults)
        const status = cust.status ?? 'Connecting...';
        const durationStr = cust.getDurationStr?.() ?? '—';
        const inlineSnapshot = new NeonovaInlineSnapshotView(cust).render();
    
        // Status → style mapping (expand as needed)
        const statusStyles = {
            'Connected': {
                bg: 'bg-emerald-900/40',
                text: 'text-emerald-300',
                border: 'border-emerald-700/50',
                dot: 'bg-emerald-400'
            },
            'Disconnected': {
                bg: 'bg-red-900/40',
                text: 'text-red-300',
                border: 'border-red-700/50',
                dot: 'bg-red-400'
            },
            'Connecting...': {
                bg: 'bg-amber-900/40',
                text: 'text-amber-300',
                border: 'border-amber-700/50',
                dot: 'bg-amber-400 animate-pulse'  // nice visual cue
            },
            'Unknown': {
                bg: 'bg-zinc-800/40',
                text: 'text-zinc-400',
                border: 'border-zinc-700/50',
                dot: 'bg-zinc-500'
            },
            'Error': {
                bg: 'bg-purple-900/40',
                text: 'text-purple-300',
                border: 'border-purple-700/50',
                dot: 'bg-purple-400'
            },
        };
    
        const style = statusStyles[status] || statusStyles['Unknown'];  // fallback
    
        this.#tr.innerHTML = `
            <td class="px-2 py-1 text-sm text-gray-200 whitespace-nowrap">
                <span class="friendly-name cursor-pointer select-none" title="Click to edit name">
                    ${cust.friendlyName || cust.radiusUsername}
                </span>
            </td>
            <td class="px-2 py-1 text-sm text-gray-400 font-mono">${cust.radiusUsername}</td>
            <td class="px-2 py-1">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:brightness-125 hover:scale-105 transition-all ${style.bg} ${style.text} ${style.border}" title="Click to view 72 hour connection timeline">
                    <span class="flex h-2 w-2 rounded-full ${style.dot} ring-1 ring-offset-1 ring-offset-gray-900"></span>
                    ${status}
                </span>
            </td>
            <td class="px-2 py-1 text-sm text-gray-300">${durationStr}</td>
            <td class="px-2 py-1 snapshot-cell" style="vertical-align: middle;">
                <div class="snapshot-host" style="width: 100%; height: 20px;"></div>
            </td>
            <td class="px-2 py-1 text-right whitespace-nowrap">
                <button class="remove-btn text-red-400 hover:text-red-300 text-lg font-bold px-1.5" title="Remove Customer">
                    ×
                </button>
                <button class="report-btn text-emerald-400 hover:text-emerald-300 text-xl px-1.5 ml-2" title="Generate Report">
                    📊
                </button>
            </td>
        `;

        const host = this.#tr.querySelector('.snapshot-host');
        if (host) host.appendChild(inlineSnapshot);
    
        if (this.#isEditing) this.#enterEditMode();
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
                e.stopPropagation();
                this.#controller.remove();
            }

            if (e.target.closest('.report-btn')) {
                e.preventDefault();
                this.#controller.launchReport();
            }

            if (e.target.closest('span.inline-flex.items-center')) {
                e.preventDefault();
                e.stopPropagation();
                this.#controller.open3DaySnapshot();
                return;
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
        const current = this.#controller.model.friendlyName || this.#controller.model.radiusUsername;

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
}
