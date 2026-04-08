class NeonovaTabView extends BaseNeonovaView {
    constructor(tabController) {
        super();
        this.tabController = tabController;
        this.container = null;
    }

    mount(containerEl) {
        this.container = containerEl;
    }

    render() {
        if (!this.container) return;
        this.tabController.rebuildTable();
    }

    clearRows() {
        if (this.container) this.container.replaceChildren();
    }

    appendRow(trElement) {
        if (this.container && trElement instanceof HTMLElement) {
            this.container.appendChild(trElement);
        }
    }

    setRows(rowElements) {
        this.clearRows();
        if (!Array.isArray(rowElements)) return;
        const fragment = document.createDocumentFragment();
        rowElements.forEach(tr => {
            if (tr instanceof HTMLElement) fragment.appendChild(tr);
        });
        if (this.container) this.container.appendChild(fragment);
    }

    applyPrivacyBlur(enabled) {
        if (this.container) {
            this.container.classList.toggle('neonova-privacy-mode', enabled);
        }
    }
    
    #buildTable(customers) {
        const wrapper = document.createElement('div');

        if (!customers.length) {
            wrapper.textContent = 'No customers in this tab.';
            return wrapper;
        }

        const table = document.createElement('table');
        table.className = 'neonova-customer-table';

        for (const ctrl of customers) {
            const row = ctrl.getRowElement();
            if (row) table.appendChild(row);
        }

        wrapper.appendChild(table);
        return wrapper;
    }
}
