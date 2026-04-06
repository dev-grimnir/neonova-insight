class NeonovaSnapshotView extends NeonovaBaseModalView {
    #hasShown = null;
    #history = null;
    #model = null;
    #chartInstance = null;
    
    constructor(controller, model) {
        super(controller);
        this.#model = model;
        this.#hasShown = false;
        this.#chartInstance = null;
        this.#history = [];  // stack of previous models for back navigation
    }

    show() {
        if (this.#hasShown) return;
        this.#hasShown = true;
    
        console.log('=== NeonovaSnapshotView.show() START ===');
    
        const modalHTML = `
            <div id="snapshot-modal" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[10001] opacity-0 transition-opacity duration-400">
                <div class="bg-[#18181b] border border-[#27272a] rounded-3xl w-[1280px] max-w-[96vw] max-h-[96vh] overflow-hidden shadow-2xl flex flex-col transform scale-95 transition-all duration-500">
                    <div class="px-8 py-6 border-b border-[#27272a] bg-[#09090b] flex-shrink-0 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <button id="back-btn" class="hidden px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                                ← Back
                            </button>
                            <div>
                                <div class="text-emerald-400 text-xs font-mono tracking-widest" id="snapshot-subtitle">${this.#model.friendlyName || 'Customer'} — Connection Timeline</div>
                                <div class="text-3xl font-semibold text-white mt-1" id="snapshot-daterange">${this.#model.getDateRangeString()}</div>
                                <div class="text-lg font-medium text-emerald-400 mt-1" id="snapshot-uptime">Uptime: ${this.#model.getUptimePercent()}%</div>
                            </div>
                        </div>
                        <button id="close-snapshot-btn" class="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                            ✕ Close
                        </button>
                    </div>
                    <div id="snapshot-content" class="flex-1 overflow-y-auto p-8 bg-[#18181b] ...">
                    </div>
                </div>
            </div>
        `;
    
        super.createModal(modalHTML).then(() => {
            console.log('createModal resolved successfully');
    
            this.render();
            this.attachListeners();
    
            // Ensure modal is visible + give layout time before charting
            const modalOverlay = this.modal.querySelector('#snapshot-modal');
            if (modalOverlay) {
                modalOverlay.style.opacity = '1';
                modalOverlay.style.transform = 'scale(1)';
            }
    
            setTimeout(() => {
                this.#initChart();
            }, 150);
    
        }).catch(err => {
            console.error('Snapshot modal creation failed:', err);
        });
    }

    async drillDown(dateStr) {
        // Push current model onto history stack
        this.#history.push(this.#model);
    
        // Fetch single day data
        const [year, month, day] = dateStr.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, month - 1, day);
        endDate.setHours(23, 59, 59, 999);
    
        // Show a loading state in the content area
        const content = this.modal.querySelector('#snapshot-content');
        if (content) content.innerHTML = `
            <div class="flex items-center justify-center h-full gap-4">
                <div class="w-8 h-8 rounded-full border-4 border-zinc-700 border-t-emerald-400 animate-spin"></div>
                <span class="text-emerald-400 font-mono text-sm">Loading ${dateStr}...</span>
            </div>
        `;
    
        try {
            const rawEntries = await NeonovaHTTPController.paginateReportLogs(
                this.#model.username,
                startDate,
                endDate,
                0, 0, 23, 59
            );
    
            const cleanResult = NeonovaCollector.cleanEntries(rawEntries || []);
            const cleaned = cleanResult.cleanedEntries || [];
            const metrics = NeonovaAnalyzer.computeMetrics(cleaned, startDate, endDate);
            const events = cleaned;
    
            // Swap model to the single day
            this.#model = new NeonovaSnapshotModel(
                this.#model.username,
                this.#model.friendlyName,
                startDate,
                endDate,
                events,
                metrics
            );
    
            this.#updateHeader();
            this.render();
            setTimeout(() => this.#initChart(), 150);
    
        } catch (err) {
            console.error('Drill-down failed:', err);
            // Pop history back since we failed
            this.#model = this.#history.pop();
            this.#updateHeader();
            this.render();
            setTimeout(() => this.#initChart(), 150);
        }
    }

    goBack() {
        if (this.#history.length === 0) return;
        this.#model = this.#history.pop();
        this.#updateHeader();
        this.render();
        setTimeout(() => this.#initChart(), 150);
    }

    #updateHeader() {
        const subtitle = this.modal.querySelector('#snapshot-subtitle');
        const daterange = this.modal.querySelector('#snapshot-daterange');
        const uptime = this.modal.querySelector('#snapshot-uptime');
        const backBtn = this.modal.querySelector('#back-btn');
    
        if (subtitle)  subtitle.textContent  = `${this.#model.friendlyName || 'Customer'} — Connection Timeline`;
        if (daterange) daterange.textContent = this.#model.getDateRangeString();
        if (uptime)    uptime.textContent    = `Uptime: ${this.#model.getUptimePercent()}%`;
    
        // Show back button only when there's history to go back to
        if (backBtn) backBtn.classList.toggle('hidden', this.#history.length === 0);
    }

    render() {
        const content = this.modal?.querySelector('#snapshot-content');
        if (!content) {
            console.error('#snapshot-content not found in modal!');
            return;
        }
    
        content.innerHTML = this.generateSnapshotHTML();
    
        if (!this.#model.events || this.#model.events.length < 2) {
            content.innerHTML += `<div class="text-center text-zinc-400 py-20 text-lg">No connection events found for this period.</div>`;
        } else {
            console.log(`Rendered chart container with ${this.#model.events.length} events`);
        }
    }

    generateSnapshotHTML() {
        const days = Math.ceil((this.#model.endDate - this.#model.startDate) / (1000 * 60 * 60 * 24));
        const height = Math.max(620, 500 + days * 20); // scale a bit for longer periods
        return `
            <div class="max-w-6xl mx-auto">
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8" style="height: 620px; min-height: 620px;">
                    <canvas id="snapshotChart" class="w-full h-full"></canvas>
                </div>
            </div>
            <style>
                #snapshot-content::-webkit-scrollbar { width: 7px; }
                #snapshot-content::-webkit-scrollbar-track { background: #18181b; border-radius: 9999px; }
                #snapshot-content::-webkit-scrollbar-thumb { background: #34d399; border-radius: 9999px; border: 2px solid #18181b; }
                #snapshot-content::-webkit-scrollbar-thumb:hover { background: #10b981; }
                #snapshot-content { scrollbar-width: thin; scrollbar-color: #34d399 #18181b; }
            </style>
        `;
    }

    #initChart() {
        const canvas = document.getElementById('snapshotChart');
        if (!canvas) return;
    
        const sortedEvents = [...this.#model.events].sort((a, b) => 
            (a.dateObj || new Date(0)) - (b.dateObj || new Date(0))
        );
    
        const startTime = this.#model.startDate.getTime();
        const endTime   = this.#model.endDate.getTime();

        // Build periods FIRST — single source of truth for tooltip
        const periods = [];
        let i = 0;
        while (i < sortedEvents.length) {
            const isConnected = (sortedEvents[i].status === 'Start' || sortedEvents[i].status === 'connected');
            const startMs = sortedEvents[i].dateObj.getTime();
        
            let j = i + 1;
            while (j < sortedEvents.length &&
                   (sortedEvents[j].status === 'Start' || sortedEvents[j].status === 'connected') === isConnected) {
                j++;
            }
        
            const endMs = j < sortedEvents.length
                ? sortedEvents[j].dateObj.getTime() - 1
                : endTime;
        
            periods.push({ startMs, endMs, isConnected });
            i = j;
        }
        this._periods = periods;

        // Build chart points from periods (two points each = no diagonals)
        const rawPeriods = [];
        periods.forEach(p => {
            const y = p.isConnected ? 1 : -1;
            rawPeriods.push({ x: p.startMs, y });
            rawPeriods.push({ x: p.endMs,   y });
        });
    
        if (this.#chartInstance) this.#chartInstance.destroy();
    
        this.#chartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Connected',
                        data: rawPeriods.map(pt => ({ x: pt.x, y: pt.y > 0 ? 1 : 0 })),
                        borderColor: '#10b981',
                        backgroundColor: '#10b98188',
                        borderWidth: 0,
                        stepped: 'after',
                        tension: 0,
                        fill: 'origin',
                        pointRadius: 0
                    },
                    {
                        label: 'Disconnected',
                        data: rawPeriods.map(pt => ({ x: pt.x, y: pt.y < 0 ? -1 : 0 })),
                        borderColor: '#ef4444',
                        backgroundColor: '#ef444488',
                        borderWidth: 0,
                        stepped: 'after',
                        tension: 0,
                        fill: 'origin',
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                        tooltip: {
                            enabled: true,
                            intersect: false,
                            mode: 'index',
                            callbacks: {
                                title: (items) => {
                                    if (!items.length) return '';
                                    return new Date(items[0].parsed.x).toLocaleString([], {
                                        month: 'short', day: 'numeric',
                                        hour: 'numeric', minute: '2-digit'
                                    });
                                },
                                label: (ctx) => {
                                    // Only process one dataset — skip the zero-value hit entirely
                                    if (ctx.parsed.y === 0) return "";
                        
                                    const currentX = ctx.parsed.x;
                                    const period = this._periods.find(p => currentX >= p.startMs && currentX <= p.endMs);
                                    if (!period) return '';
                        
                                    const fmt = (ms) => new Date(ms).toLocaleString([], {
                                        month: 'short', day: 'numeric',
                                        hour: 'numeric', minute: '2-digit'
                                    });
                        
                                    const durMs  = period.endMs - period.startMs;
                                    const hours  = Math.floor(durMs / 3600000);
                                    const mins   = Math.floor((durMs % 3600000) / 60000);
                                    const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                        
                                    const label = period.isConnected ? 'Connected' : 'Disconnected';
                                    return `${label} — ${fmt(period.startMs)} to ${fmt(period.endMs)} (${durStr})`;
                                },
                            }
                        }
                },
                scales: {
                    x: { type: 'linear', min: startTime, max: endTime, grid: { color: '#27272a' }, ticks: { color: '#64748b', maxTicksLimit: 5, callback: v => new Date(v).toLocaleDateString('en-US', {month:'short', day:'numeric'}) }},
                    y: { min: -1.2, max: 1.2, ticks: { display: false }, grid: { color: ctx => ctx.tick.value === 0 ? '#a3a3a3' : '#27272a', lineWidth: ctx => ctx.tick.value === 0 ? 4 : 1.5 }}
                },
                layout: { padding: { right: 40, left: 20, top: 30, bottom: 20 } }
            }
        });
    
        setTimeout(() => this.#chartInstance?.resize(), 100);

        canvas.addEventListener('click', (e) => {
            const chart = this.#chartInstance;
            if (!chart) return;
        
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
        
            // Let Chart.js tell us if the click is in the x-axis zone
            const xAxis = chart.scales.x;
            if (y < xAxis.top) return;  // above the x-axis area entirely — ignore
        
            const clickedMs = xAxis.getValueForPixel(x);
            const clickedDate = new Date(clickedMs);
            const dateStr = `${clickedDate.getFullYear()}-${String(clickedDate.getMonth() + 1).padStart(2, '0')}-${String(clickedDate.getDate()).padStart(2, '0')}`;
        
            this.drillDown(dateStr);
        });
        
        canvas.addEventListener('mousemove', (e) => {
            const chart = this.#chartInstance;
            if (!chart) return;
            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            canvas.style.cursor = y > chart.scales.x.top ? 'pointer' : 'default';
        });
        
    }
    
    attachListeners() {
        const closeBtn = this.modal.querySelector('#close-snapshot-btn');
        const backBtn  = this.modal.querySelector('#back-btn');
        const modalEl  = this.modal.querySelector('#snapshot-modal');
    
        closeBtn?.addEventListener('click', () => this.hide());
        backBtn?.addEventListener('click',  () => this.goBack());
        modalEl?.addEventListener('click', e => {
            if (e.target === modalEl) this.hide();
        });
    }

    hide() {
        if (this.#chartInstance) {
            this.#chartInstance.destroy();
            this.#chartInstance = null;
        }
        super.hide();
    }
}
