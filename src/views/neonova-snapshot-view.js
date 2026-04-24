class NeonovaSnapshotView extends NeonovaBaseModalView {
    constructor(controller, model) {
        super(controller);
        this.controller = controller;
        this.model = model;
        this.chart = null;
    }

    show() {
        const modalHTML = `
            <div id="snapshot-modal" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[10000] opacity-0 transition-opacity duration-400">
                <div class="bg-[#18181b] border border-[#27272a] rounded-3xl w-[1280px] max-w-[96vw] max-h-[96vh] overflow-hidden shadow-2xl flex flex-col transform scale-95 transition-all duration-500">
                    <div class="px-8 py-6 border-b border-[#27272a] bg-[#09090b] flex-shrink-0 flex items-center justify-between">
                        <div id="snapshot-header"></div>
                        <div class="flex items-center gap-3">
                            <button id="snapshot-back-btn" class="px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl items-center gap-2 transition hidden">
                                <i class="fas fa-arrow-left"></i> Back
                            </button>
                            <button id="snapshot-close-btn" class="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                    <div id="snapshot-content" class="flex-1 overflow-hidden p-8 bg-[#18181b]">
                        <div class="w-full h-full"><canvas id="snapshot-canvas"></canvas></div>
                    </div>
                </div>
            </div>
        `;

        super.createModal(modalHTML);
        this.#renderHeader();
        this.#renderChart();
        this.#attachListeners();
    }

    /* ============================================================
     *  RENDER
     * ============================================================ */

    #renderHeader() {
        const header = this.modal.querySelector('#snapshot-header');
        if (!header) return;
        const m = this.model;
        header.innerHTML = `
            <div class="text-emerald-400 text-xs font-mono tracking-widest">CONNECTION TIMELINE</div>
            <div class="text-2xl font-semibold text-white mt-1">${m.friendlyName}</div>
            <div class="text-sm text-zinc-400 mt-1">${m.startDate.toLocaleString()} — ${m.endDate.toLocaleString()}</div>
            <div class="text-sm text-emerald-400 mt-1">Uptime: ${Number(m.metrics.percentConnected || 0).toFixed(1)}%</div>
        `;
        this.#updateBackButtonVisibility();
    }

    #renderChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        const canvas = this.modal.querySelector('#snapshot-canvas');
        if (!canvas) return;
        this.chart = NeonovaSnapshotChart.build(
            canvas,
            this.model,
            (start, end) => this.#onRangeClick(start, end)
        );
    }

    #updateBackButtonVisibility() {
        const btn = this.modal.querySelector('#snapshot-back-btn');
        if (!btn) return;
        if (this.controller.canGoBack()) {
            btn.classList.remove('hidden');
            btn.classList.add('flex');
        } else {
            btn.classList.add('hidden');
            btn.classList.remove('flex');
        }
    }

    /* ============================================================
     *  EVENT WIRING
     * ============================================================ */

    #attachListeners() {
        const closeBtn = this.modal.querySelector('#snapshot-close-btn');
        const backBtn  = this.modal.querySelector('#snapshot-back-btn');
        const modalEl  = this.modal.querySelector('#snapshot-modal');

        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => { if (e.target === modalEl) this.hide(); });
        backBtn?.addEventListener('click', () => this.#onBack());
    }

    async #onRangeClick(startDate, endDate) {
        const model = await this.controller.drillTo(startDate, endDate);
        if (!model) {
            alert('No data for that range.');
            return;
        }
        this.model = model;
        this.#renderHeader();
        this.#renderChart();
    }

    #onBack() {
        const model = this.controller.goBack();
        if (!model) return;
        this.model = model;
        this.#renderHeader();
        this.#renderChart();
    }

    hide() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        super.hide();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaSnapshotView;
}
