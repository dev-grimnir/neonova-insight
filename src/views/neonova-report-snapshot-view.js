/**
 * Inline snapshot renderer for the report view. Same header content
 * and drill-down semantics as NeonovaSnapshotView, but lives inside
 * a provided container element instead of a modal. No close button —
 * closing is the parent's job.
 *
 * Usage:
 *   const view = new NeonovaReportSnapshotView(controller, model, containerEl);
 *   view.show();
 */
class NeonovaReportSnapshotView {

    constructor(controller, model, containerEl) {
        this.controller = controller;
        this.model = model;
        this.container = containerEl;
        this.chart = null;
    }

    show() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                <div class="px-8 py-6 border-b border-zinc-700 bg-[#09090b] flex items-center justify-between">
                    <div id="report-snap-header"></div>
                    <div>
                        <button id="report-snap-back-btn" class="px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl items-center gap-2 transition hidden">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                    </div>
                </div>
                <div class="p-6">
                    <div style="height: 480px;"><canvas id="report-snap-canvas"></canvas></div>
                </div>
            </div>
        `;
        this.#renderHeader();
        this.#renderChart();
        this.#attachListeners();
    }

    /* ============================================================
     *  RENDER
     * ============================================================ */

    #renderHeader() {
        const header = this.container.querySelector('#report-snap-header');
        if (!header) return;
        const m = this.model;
        header.innerHTML = `
            <div class="text-emerald-400 text-xs font-mono tracking-widest">CONNECTION TIMELINE</div>
            <div class="text-lg font-semibold text-white mt-1">${m.startDate.toLocaleString()} — ${m.endDate.toLocaleString()}</div>
            <div class="text-sm text-emerald-400 mt-1">Uptime: ${Number(m.metrics.percentConnected || 0).toFixed(1)}%</div>
        `;
        this.#updateBackButtonVisibility();
    }

    #renderChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        const canvas = this.container.querySelector('#report-snap-canvas');
        if (!canvas) return;
        this.chart = NeonovaSnapshotChart.build(
            canvas,
            this.model,
            (start, end) => this.#onRangeClick(start, end)
        );
    }

    #updateBackButtonVisibility() {
        const btn = this.container.querySelector('#report-snap-back-btn');
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
        const backBtn = this.container.querySelector('#report-snap-back-btn');
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

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaReportSnapshotView;
}
