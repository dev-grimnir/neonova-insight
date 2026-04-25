/**
 * Inline snapshot view for embedding in the report. Uses the shared
 * NeonovaSnapshotChart builder so visual behavior matches the modal.
 * Header content matches the modal's header content; modal chrome is
 * absent (no Close button — closing is the parent's job).
 *
 * Drill-down semantics match the modal: click in the bottom label zone
 * to drill into a single day; back button visible whenever the
 * controller has history to pop.
 */
class NeonovaReportSnapshotView {

    #chartInstance = null;

    constructor(controller, model, containerEl) {
        this.controller = controller;
        this.model = model;
        this.container = containerEl;
    }

    show() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                <div class="px-8 py-6 border-b border-zinc-700 bg-[#09090b] flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button id="report-snap-back-btn" class="hidden px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                            ← Back
                        </button>
                        <div>
                            <div class="text-emerald-400 text-xs font-mono tracking-widest" id="report-snap-subtitle">${this.model.friendlyName || 'Customer'} — Connection Timeline</div>
                            <div class="text-2xl font-semibold text-white mt-1" id="report-snap-daterange">${this.model.getDateRangeString()}</div>
                            <div class="text-base font-medium text-emerald-400 mt-1" id="report-snap-uptime">Uptime: ${this.model.getUptimePercent()}%</div>
                        </div>
                    </div>
                </div>
                <div id="report-snap-body" class="p-6">
                    <div style="height: 620px; min-height: 620px;">
                        <canvas id="report-snap-canvas"></canvas>
                    </div>
                </div>
            </div>
        `;

        this.#attachListeners();
        setTimeout(() => this.#initChart(), 150);
    }

    /* ============================================================
     *  RENDER
     * ============================================================ */

    #renderBody() {
        const body = this.container.querySelector('#report-snap-body');
        if (!body) return;
        body.innerHTML = `
            <div style="height: 620px; min-height: 620px;">
                <canvas id="report-snap-canvas"></canvas>
            </div>
        `;

        if (!this.model.events || this.model.events.length < 2) {
            body.innerHTML += `<div class="text-center text-zinc-400 py-12 text-lg">No connection events found for this period.</div>`;
        }
    }

    #initChart() {
        const canvas = this.container.querySelector('#report-snap-canvas');
        if (!canvas) return;

        if (this.#chartInstance) {
            this.#chartInstance.destroy();
            this.#chartInstance = null;
        }

        const result = NeonovaSnapshotChart.build(
            canvas,
            this.model,
            (dateStr) => this.#onDayClick(dateStr)
        );
        this.#chartInstance = result.chart;
    }

    #updateHeader() {
        const subtitle  = this.container.querySelector('#report-snap-subtitle');
        const daterange = this.container.querySelector('#report-snap-daterange');
        const uptime    = this.container.querySelector('#report-snap-uptime');
        const backBtn   = this.container.querySelector('#report-snap-back-btn');

        if (subtitle)  subtitle.textContent  = `${this.model.friendlyName || 'Customer'} — Connection Timeline`;
        if (daterange) daterange.textContent = this.model.getDateRangeString();
        if (uptime)    uptime.textContent    = `Uptime: ${this.model.getUptimePercent()}%`;

        if (backBtn) backBtn.classList.toggle('hidden', !this.controller.canGoBack());
    }

    /* ============================================================
     *  EVENT WIRING
     * ============================================================ */

    #attachListeners() {
        const backBtn = this.container.querySelector('#report-snap-back-btn');
        backBtn?.addEventListener('click', () => this.#onBack());
    }

    async #onDayClick(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endDate   = new Date(year, month - 1, day, 23, 59, 59, 999);

        const body = this.container.querySelector('#report-snap-body');
        if (body) {
            body.innerHTML = `
                <div class="flex items-center justify-center gap-4 py-20">
                    <div class="w-8 h-8 rounded-full border-4 border-zinc-700 border-t-emerald-400 animate-spin"></div>
                    <span class="text-emerald-400 font-mono text-sm">Loading ${dateStr}...</span>
                </div>
            `;
        }

        const model = await this.controller.drillTo(startDate, endDate);
        if (!model) {
            this.#renderBody();
            setTimeout(() => this.#initChart(), 150);
            return;
        }
        this.model = model;
        this.#updateHeader();
        this.#renderBody();
        setTimeout(() => this.#initChart(), 150);
    }

    #onBack() {
        const model = this.controller.goBack();
        if (!model) return;
        this.model = model;
        this.#updateHeader();
        this.#renderBody();
        setTimeout(() => this.#initChart(), 150);
    }

    destroy() {
        if (this.#chartInstance) {
            this.#chartInstance.destroy();
            this.#chartInstance = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaReportSnapshotView;
}
